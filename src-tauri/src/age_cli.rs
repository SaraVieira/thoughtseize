use std::path::Path;
use std::process::Command;
use std::sync::Mutex;

static AGE_BINARY: Mutex<Option<String>> = Mutex::new(None);

pub fn find_age_binary() -> Result<String, String> {
    // Try `which age` first
    let output = Command::new("which")
        .arg("age")
        .output()
        .map_err(|e| format!("Failed to run 'which age': {}", e))?;

    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
    }

    // Search nix store
    let nix_output = Command::new("bash")
        .args(["-c", "ls /nix/store/*/bin/age 2>/dev/null | head -1"])
        .output();

    if let Ok(nix_output) = nix_output {
        let path = String::from_utf8_lossy(&nix_output.stdout).trim().to_string();
        if !path.is_empty() && Path::new(&path).exists() {
            return Ok(path);
        }
    }

    Err("'age' binary not found. Install it with: nix-env -iA nixpkgs.age".to_string())
}

fn age_binary() -> Result<String, String> {
    let mut cached = AGE_BINARY.lock().map_err(|_| "Lock error".to_string())?;
    if let Some(ref path) = *cached {
        return Ok(path.clone());
    }
    let path = find_age_binary()?;
    *cached = Some(path.clone());
    Ok(path)
}

pub fn decrypt_file(file_path: &Path, identity_path: &Path) -> Result<String, String> {
    let age = age_binary()?;
    let output = Command::new(&age)
        .args(["-d", "-i"])
        .arg(identity_path)
        .arg(file_path)
        .output()
        .map_err(|e| format!("Failed to run age: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Decryption failed: {}", stderr))
    }
}

pub fn encrypt_to_file(
    plaintext: &str,
    output_path: &Path,
    recipient_keys: &[String],
) -> Result<(), String> {
    use std::io::Write;
    use std::process::Stdio;

    let age = age_binary()?;
    let mut cmd = Command::new(&age);
    cmd.arg("-e");
    for key in recipient_keys {
        cmd.args(["-r", key]);
    }
    cmd.arg("-o").arg(output_path);

    let mut child = cmd
        .stdin(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn age: {}", e))?;

    // Take stdin and drop it after writing to send EOF
    {
        let mut stdin = child.stdin.take()
            .ok_or("Failed to open stdin")?;
        stdin.write_all(plaintext.as_bytes())
            .map_err(|e| format!("Failed to write to age stdin: {}", e))?;
    }

    let output = child.wait_with_output()
        .map_err(|e| format!("Failed to wait for age: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Encryption failed: {}", stderr))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_age_binary() {
        let path = find_age_binary();
        assert!(path.is_ok(), "age binary not found: {:?}", path.err());
    }

    #[test]
    fn test_decrypt_nonexistent_file() {
        let result = decrypt_file(
            std::path::Path::new("/nonexistent.age"),
            std::path::Path::new("/nonexistent-key"),
        );
        assert!(result.is_err());
    }
}
