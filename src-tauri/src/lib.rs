pub mod age_cli;
pub mod commands;
pub mod config;
pub mod nix_parser;
pub mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::project::open_project,
            commands::project::get_saved_project,
            commands::secrets::decrypt_secret,
            commands::secrets::save_secret,
            commands::secrets::create_secret,
            commands::secrets::delete_secret,
            commands::identity::list_identities,
            commands::identity::get_saved_identity,
            commands::identity::set_identity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
