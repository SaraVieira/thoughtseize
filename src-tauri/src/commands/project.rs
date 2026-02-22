use std::fs;
use std::path::PathBuf;
use tauri::State;
use glob::glob;
use crate::state::AppState;
use crate::nix_parser;
use crate::config;

#[derive(serde::Serialize)]
pub struct ProjectInfo {
    pub path: String,
    pub secrets: Vec<SecretFileInfo>,
    pub groups: Vec<String>,
}

#[derive(serde::Serialize)]
pub struct SecretFileInfo {
    pub path: String,
    pub groups: Vec<String>,
}

#[tauri::command]
pub fn open_project(dir: String, state: State<AppState>) -> Result<ProjectInfo, String> {
    let project_dir = PathBuf::from(&dir);

    // Find and parse meta_secrets.nix
    let meta_path = project_dir.join("meta_secrets.nix");
    if !meta_path.exists() {
        return Err(format!("No meta_secrets.nix found in {}", dir));
    }

    let content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read meta_secrets.nix: {}", e))?;
    let parsed = nix_parser::parse_meta_secrets(&content)?;

    // Scan for .age files
    let pattern = project_dir.join("**/*.age").to_string_lossy().to_string();
    let age_files: Vec<String> = glob(&pattern)
        .map_err(|e| format!("Glob error: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter_map(|path| {
            path.strip_prefix(&project_dir)
                .ok()
                .map(|p| p.to_string_lossy().to_string())
        })
        .collect();

    let secrets: Vec<SecretFileInfo> = age_files.iter().map(|file_path| {
        let groups = parsed.secrets.iter()
            .find(|s| s.path == *file_path)
            .map(|s| s.groups.clone())
            .unwrap_or_default();
        SecretFileInfo {
            path: file_path.clone(),
            groups,
        }
    }).collect();

    let group_names: Vec<String> = parsed.groups.iter().map(|g| g.name.clone()).collect();

    *state.project_dir.lock()
        .map_err(|_| "Internal state error".to_string())? = Some(project_dir);
    *state.parsed_secrets.lock()
        .map_err(|_| "Internal state error".to_string())? = Some(parsed);

    config::save_config_value("project_path", &dir);

    Ok(ProjectInfo {
        path: dir,
        secrets,
        groups: group_names,
    })
}

#[tauri::command]
pub fn get_saved_project() -> Option<String> {
    let saved = config::load_config_value("project_path")?;
    let path = PathBuf::from(&saved);
    if path.exists() { Some(saved) } else { None }
}
