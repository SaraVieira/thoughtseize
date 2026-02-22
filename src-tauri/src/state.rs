use std::path::PathBuf;
use std::sync::Mutex;
use crate::nix_parser::ParsedSecrets;

#[derive(Default)]
pub struct AppState {
    pub project_dir: Mutex<Option<PathBuf>>,
    pub identity_path: Mutex<Option<PathBuf>>,
    pub parsed_secrets: Mutex<Option<ParsedSecrets>>,
}
