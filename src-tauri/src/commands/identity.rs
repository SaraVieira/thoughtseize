use std::path::PathBuf;
use tauri::State;
use crate::state::AppState;
use crate::config;

#[derive(serde::Serialize)]
pub struct IdentityInfo {
    pub path: String,
    pub key_type: String,
}

#[tauri::command]
pub fn list_identities() -> Vec<IdentityInfo> {
    let mut identities = Vec::new();
    let home = dirs::home_dir().unwrap_or_default();

    // Check SSH keys
    for name in &["id_ed25519", "id_rsa"] {
        let path = home.join(".ssh").join(name);
        if path.exists() {
            identities.push(IdentityInfo {
                path: path.to_string_lossy().to_string(),
                key_type: if name.contains("ed25519") { "ssh-ed25519" } else { "ssh-rsa" }.to_string(),
            });
        }
    }

    // Check age identity
    let age_keys = home.join(".config/age/keys.txt");
    if age_keys.exists() {
        identities.push(IdentityInfo {
            path: age_keys.to_string_lossy().to_string(),
            key_type: "age".to_string(),
        });
    }

    identities
}

#[tauri::command]
pub fn get_saved_identity(state: State<AppState>) -> Option<String> {
    // Return from in-memory state if already set
    let guard = state.identity_path.lock().ok()?;
    if let Some(ref p) = *guard {
        return Some(p.to_string_lossy().to_string());
    }
    drop(guard);

    // Otherwise try loading from config file
    if let Some(saved) = config::load_config_value("identity_path") {
        let path = PathBuf::from(&saved);
        if path.exists() {
            // Also set it in memory
            if let Ok(mut guard) = state.identity_path.lock() {
                *guard = Some(path);
            }
            return Some(saved);
        }
    }
    None
}

#[tauri::command]
pub fn set_identity(path: String, state: State<AppState>) -> Result<(), String> {
    let identity_path = PathBuf::from(&path);
    if !identity_path.exists() {
        return Err(format!("Identity file not found: {}", path));
    }
    *state.identity_path.lock()
        .map_err(|_| "Internal state error".to_string())? = Some(identity_path);
    config::save_config_value("identity_path", &path);
    Ok(())
}
