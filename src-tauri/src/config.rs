use std::fs;
use std::path::PathBuf;

fn config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("thoughtseize").join("config.json"))
}

fn load_config() -> serde_json::Value {
    config_path()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|data| serde_json::from_str(&data).ok())
        .unwrap_or_else(|| serde_json::json!({}))
}

fn save_config(config: &serde_json::Value) {
    if let Some(path) = config_path() {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(path, serde_json::to_string_pretty(config).unwrap_or_default());
    }
}

pub fn load_config_value(key: &str) -> Option<String> {
    let config = load_config();
    config.get(key)?.as_str().map(|s| s.to_string())
}

pub fn save_config_value(key: &str, value: &str) {
    let mut config = load_config();
    config[key] = serde_json::Value::String(value.to_string());
    save_config(&config);
}
