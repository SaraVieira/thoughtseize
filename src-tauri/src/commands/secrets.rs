use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;
use crate::state::AppState;
use crate::age_cli;
use crate::nix_parser;

/// Validate that a resolved path stays within the project directory.
fn safe_resolve(project_dir: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let resolved = project_dir.join(relative_path);
    // For existing files, canonicalize and check containment
    if resolved.exists() {
        let canonical = resolved.canonicalize()
            .map_err(|e| format!("Invalid path: {}", e))?;
        let canonical_project = project_dir.canonicalize()
            .map_err(|e| format!("Invalid project dir: {}", e))?;
        if !canonical.starts_with(&canonical_project) {
            return Err("Path traversal detected".to_string());
        }
        Ok(canonical)
    } else {
        // For new files, check the parent
        let parent = resolved.parent().ok_or("Invalid path: no parent")?;
        if parent.exists() {
            let canonical_parent = parent.canonicalize()
                .map_err(|e| format!("Invalid path: {}", e))?;
            let canonical_project = project_dir.canonicalize()
                .map_err(|e| format!("Invalid project dir: {}", e))?;
            if !canonical_parent.starts_with(&canonical_project) {
                return Err("Path traversal detected".to_string());
            }
        }
        // Also reject obvious traversal patterns before parent dirs are created
        if relative_path.contains("..") {
            return Err("Path traversal detected".to_string());
        }
        Ok(resolved)
    }
}

/// Validate that a group name is a safe Nix identifier (alphanumeric + underscore).
fn is_valid_group_name(name: &str) -> bool {
    !name.is_empty() && name.chars().all(|c| c.is_alphanumeric() || c == '_')
}

#[tauri::command]
pub fn decrypt_secret(relative_path: String, state: State<AppState>) -> Result<String, String> {
    let project_dir = {
        let guard = state.project_dir.lock()
            .map_err(|_| "Internal state error".to_string())?;
        guard.as_ref().ok_or("No project open")?.clone()
    };

    let identity_path = {
        let guard = state.identity_path.lock()
            .map_err(|_| "Internal state error".to_string())?;
        guard.as_ref().ok_or("No identity configured. Click the gear icon to select an identity file.")?.clone()
    };

    let file_path = safe_resolve(&project_dir, &relative_path)?;
    age_cli::decrypt_file(&file_path, &identity_path)
}

#[tauri::command]
pub fn save_secret(
    relative_path: String,
    content: String,
    state: State<AppState>,
) -> Result<(), String> {
    let project_dir = {
        let guard = state.project_dir.lock()
            .map_err(|_| "Internal state error".to_string())?;
        guard.as_ref().ok_or("No project open")?.clone()
    };

    let file_path = safe_resolve(&project_dir, &relative_path)?;

    // Resolve public keys by evaluating secrets.nix for this secret's path
    let recipients = resolve_recipients(&project_dir, &relative_path)?;

    age_cli::encrypt_to_file(&content, &file_path, &recipients)
}

#[tauri::command]
pub fn create_secret(
    relative_path: String,
    content: String,
    groups: Vec<String>,
    state: State<AppState>,
) -> Result<(), String> {
    // Validate all group names before doing anything
    for g in &groups {
        if !is_valid_group_name(g) {
            return Err(format!("Invalid group name: '{}'. Only alphanumeric and underscore allowed.", g));
        }
    }

    let project_dir = {
        let guard = state.project_dir.lock()
            .map_err(|_| "Internal state error".to_string())?;
        guard.as_ref().ok_or("No project open")?.clone()
    };

    let file_path = safe_resolve(&project_dir, &relative_path)?;

    // Create parent directories
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    // 1. Add entry to meta_secrets.nix first so secrets.nix can resolve it
    let meta_path = project_dir.join("meta_secrets.nix");
    let original_meta = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read meta_secrets.nix: {}", e))?;
    let group_refs: Vec<&str> = groups.iter().map(|s| s.as_str()).collect();
    let new_meta = nix_parser::add_secret_entry(&original_meta, &relative_path, &group_refs);
    fs::write(&meta_path, &new_meta)
        .map_err(|e| format!("Failed to write meta_secrets.nix: {}", e))?;

    // 2. Resolve recipients via secrets.nix (which imports meta_secrets.nix)
    let recipients = match resolve_recipients(&project_dir, &relative_path) {
        Ok(r) => r,
        Err(e) => {
            // Roll back meta_secrets.nix on failure
            let _ = fs::write(&meta_path, &original_meta);
            return Err(e);
        }
    };

    // 3. Encrypt the file
    if let Err(e) = age_cli::encrypt_to_file(&content, &file_path, &recipients) {
        // Roll back meta_secrets.nix on failure
        let _ = fs::write(&meta_path, &original_meta);
        return Err(e);
    }

    // Update cached state
    let mut parsed = state.parsed_secrets.lock()
        .map_err(|_| "Internal state error".to_string())?;
    *parsed = Some(nix_parser::parse_meta_secrets(&new_meta)?);

    Ok(())
}

#[tauri::command]
pub fn delete_secret(
    relative_path: String,
    state: State<AppState>,
) -> Result<(), String> {
    let project_dir = {
        let guard = state.project_dir.lock()
            .map_err(|_| "Internal state error".to_string())?;
        guard.as_ref().ok_or("No project open")?.clone()
    };

    let file_path = safe_resolve(&project_dir, &relative_path)?;

    // Remove .age file
    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    // Remove from meta_secrets.nix
    let meta_path = project_dir.join("meta_secrets.nix");
    let meta_content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read meta_secrets.nix: {}", e))?;
    let new_content = nix_parser::remove_secret_entry(&meta_content, &relative_path);
    fs::write(&meta_path, &new_content)
        .map_err(|e| format!("Failed to write meta_secrets.nix: {}", e))?;

    // Update cached state
    let mut parsed = state.parsed_secrets.lock()
        .map_err(|_| "Internal state error".to_string())?;
    *parsed = Some(nix_parser::parse_meta_secrets(&new_content)?);

    Ok(())
}

/// Resolve recipients for a secret by reading its publicKeys from secrets.nix via nix eval.
/// This imports secrets.nix (which resolves all group definitions) and extracts the
/// publicKeys attribute for the given secret path.
fn resolve_recipients(project_dir: &Path, secret_path: &str) -> Result<Vec<String>, String> {
    // Allowlist: only permit safe path characters (alphanumeric, ., _, /, -)
    if !secret_path.chars().all(|c| c.is_alphanumeric() || "._/-".contains(c)) {
        return Err("Invalid characters in secret path".to_string());
    }

    let secrets_nix = project_dir.join("secrets.nix");
    if !secrets_nix.exists() {
        return Err("secrets.nix not found in project directory".to_string());
    }

    // Import secrets.nix which fully resolves all group definitions,
    // then index into the resulting attrset by the secret's path to get publicKeys.
    let output = std::process::Command::new("nix")
        .args(["eval", "--impure", "--json", "--expr"])
        .arg(format!(
            "(import {}/secrets.nix).\"{}\".publicKeys",
            project_dir.display(),
            secret_path
        ))
        .current_dir(project_dir)
        .output()
        .map_err(|e| format!("Failed to run nix eval: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("nix eval failed: {}", stderr));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let keys: Vec<String> = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse nix eval output: {}", e))?;

    Ok(keys)
}
