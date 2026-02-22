use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct GroupDef {
    pub name: String,
    pub definition: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct SecretEntry {
    pub path: String,
    pub groups: Vec<String>,
    pub raw_expr: String,
}

#[derive(Debug, Serialize)]
pub struct ParsedSecrets {
    pub groups: Vec<GroupDef>,
    pub secrets: Vec<SecretEntry>,
}

pub fn parse_meta_secrets(content: &str) -> Result<ParsedSecrets, String> {
    let mut groups = Vec::new();
    let mut secrets = Vec::new();

    // Find the let..in block to extract group definitions
    let let_start = content.find("\nlet\n")
        .or_else(|| content.find("\nlet "))
        .map(|i| i + 1)
        .ok_or("No 'let' block found")?;
    let in_start = content.find("\nin\n")
        .or_else(|| content.find("\nin "))
        .or_else(|| content.find("\nin{"))
        .map(|i| i + 1)
        .ok_or("No 'in' block found")?;

    let let_block = &content[let_start..in_start];

    // Parse group definitions: "name = expr;" (may span multiple lines)
    let let_text = let_block.to_string();
    let mut i = 0;
    let lines: Vec<&str> = let_text.lines().collect();
    while i < lines.len() {
        let line = lines[i].trim();
        if line.starts_with("let") || line.is_empty() {
            i += 1;
            continue;
        }
        // Look for "name = ..."
        if let Some(eq_pos) = line.find(" = ") {
            let name = line[..eq_pos].trim().to_string();
            // Collect the full definition until we find a ";"
            let mut def = line[eq_pos + 3..].to_string();
            while !def.trim_end().ends_with(';') && i + 1 < lines.len() {
                i += 1;
                def.push('\n');
                def.push_str(lines[i]);
            }
            let def = def.trim_end_matches(';').trim().to_string();
            groups.push(GroupDef { name, definition: def });
        }
        i += 1;
    }

    // Parse secret entries from the attrset body (after "in\n{")
    let body_start = content[in_start..].find('{')
        .map(|i2| in_start + i2 + 1)
        .ok_or("No '{' after 'in'")?;
    let body_end = content.rfind('}').ok_or("No closing '}'")?;
    let body = &content[body_start..body_end];

    // Match: "path.age".publicKeys = expr;
    let mut current_line = String::new();
    for line in body.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if current_line.is_empty() {
            current_line.push_str(trimmed);
        } else {
            current_line.push(' ');
            current_line.push_str(trimmed);
        }

        if current_line.ends_with(';') {
            // Parse: "path".publicKeys = expr;
            if let Some(dot_pk) = current_line.find("\".publicKeys") {
                // Find the opening quote explicitly
                if let Some(open_quote) = current_line.find('"') {
                    let path = current_line[open_quote + 1..dot_pk].to_string();
                    let eq = current_line.find('=').unwrap();
                    let expr = current_line[eq + 1..current_line.len() - 1].trim().to_string();
                    let group_names: Vec<String> = expr
                        .split("++")
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                    secrets.push(SecretEntry {
                        path,
                        groups: group_names,
                        raw_expr: expr,
                    });
                }
            }
            current_line.clear();
        }
    }

    Ok(ParsedSecrets { groups, secrets })
}

pub fn add_secret_entry(content: &str, path: &str, groups: &[&str]) -> String {
    let expr = groups.join(" ++ ");
    let new_line = format!("  \"{}\".publicKeys = {};", path, expr);
    // Insert before the closing "}"
    let close_brace = content.rfind('}').unwrap();
    let mut result = content[..close_brace].to_string();
    if !result.ends_with('\n') {
        result.push('\n');
    }
    result.push_str(&new_line);
    result.push('\n');
    result.push('}');
    if content.ends_with('\n') {
        result.push('\n');
    }
    result
}

pub fn remove_secret_entry(content: &str, path: &str) -> String {
    let search = format!("\"{}\"", path);
    let mut result_lines: Vec<&str> = Vec::new();
    let mut skip = false;
    for line in content.lines() {
        if line.contains(&search) {
            skip = true;
        }
        if skip {
            if line.trim_end().ends_with(';') {
                skip = false;
            }
            continue;
        }
        result_lines.push(line);
    }
    result_lines.join("\n") + if content.ends_with('\n') { "\n" } else { "" }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_NIX: &str = r#"{ meta }:
let
  tech = meta.ssh.groups.TECH;
  ciRunner = meta.ssh.nodes.ci-runner;
  identity = [
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINu6Q identity"
  ];
in
{
  "watch/GEMINI_API_KEY.age".publicKeys =
    tech ++ ciRunner ++ identity;
  "bigquery/sa-data-scripts.json.age".publicKeys = tech;
}"#;

    #[test]
    fn test_parse_groups() {
        let result = parse_meta_secrets(SAMPLE_NIX).unwrap();
        let group_names: Vec<&str> = result.groups.iter().map(|g| g.name.as_str()).collect();
        assert!(group_names.contains(&"tech"));
        assert!(group_names.contains(&"ciRunner"));
        assert!(group_names.contains(&"identity"));
    }

    #[test]
    fn test_parse_secrets() {
        let result = parse_meta_secrets(SAMPLE_NIX).unwrap();
        assert_eq!(result.secrets.len(), 2);

        let gemini = result.secrets.iter()
            .find(|s| s.path == "watch/GEMINI_API_KEY.age")
            .unwrap();
        assert_eq!(gemini.groups, vec!["tech", "ciRunner", "identity"]);

        let bq = result.secrets.iter()
            .find(|s| s.path == "bigquery/sa-data-scripts.json.age")
            .unwrap();
        assert_eq!(bq.groups, vec!["tech"]);
    }

    #[test]
    fn test_add_secret_entry() {
        let new_content = add_secret_entry(
            SAMPLE_NIX,
            "new/secret.age",
            &["tech", "ciRunner"],
        );
        assert!(new_content.contains(r#""new/secret.age".publicKeys = tech ++ ciRunner;"#));
        assert!(new_content.contains("GEMINI_API_KEY"));
    }

    #[test]
    fn test_remove_secret_entry() {
        let new_content = remove_secret_entry(
            SAMPLE_NIX,
            "bigquery/sa-data-scripts.json.age",
        );
        assert!(!new_content.contains("sa-data-scripts"));
        assert!(new_content.contains("GEMINI_API_KEY"));
    }

    #[test]
    fn test_parse_real_file() {
        let path = std::env::var("TEST_META_SECRETS_PATH").ok();
        if let Some(path) = path {
            let content = std::fs::read_to_string(&path).unwrap();
            let result = parse_meta_secrets(&content).unwrap();
            assert!(result.secrets.len() > 50, "Expected 50+ secrets, got {}", result.secrets.len());
            assert!(result.groups.len() >= 5, "Expected 5+ groups, got {}", result.groups.len());
        }
    }
}
