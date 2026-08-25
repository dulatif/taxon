use crate::models::VaultEntry;
use std::fs;
use std::path::Path;

pub fn scan_vault(vault_path: &Path) -> Result<Vec<VaultEntry>, String> {
    if !vault_path.exists() || !vault_path.is_dir() {
        return Err(format!(
            "Vault path does not exist or is not a directory: {}",
            vault_path.display()
        ));
    }

    let mut entries = Vec::new();
    let dir_entries = fs::read_dir(vault_path)
        .map_err(|e| format!("Failed to read directory {}: {}", vault_path.display(), e))?;

    for entry in dir_entries.flatten() {
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.starts_with('.') {
            continue;
        }

        let path = entry.path();
        if path.is_dir() {
            let children = scan_vault(&path).unwrap_or_default();
            entries.push(VaultEntry {
                name: file_name,
                path: path.to_string_lossy().to_string(),
                is_directory: true,
                children: Some(children),
            });
        } else {
            let lower = file_name.to_lowercase();
            if lower.ends_with(".md") || lower.ends_with(".txt") || lower.ends_with(".markdown") {
                entries.push(VaultEntry {
                    name: file_name,
                    path: path.to_string_lossy().to_string(),
                    is_directory: false,
                    children: None,
                });
            }
        }
    }

    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

pub fn read_document(file_path: &Path) -> Result<String, String> {
    fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read document {}: {}", file_path.display(), e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_scan_and_read_vault() {
        let temp_dir = std::env::temp_dir().join(format!("taxon_vault_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();
        let sub_dir = temp_dir.join("notes");
        fs::create_dir_all(&sub_dir).unwrap();

        let note1 = temp_dir.join("root-note.md");
        let mut f1 = File::create(&note1).unwrap();
        f1.write_all(b"# Root Note\nContent here").unwrap();

        let note2 = sub_dir.join("sub-note.md");
        let mut f2 = File::create(&note2).unwrap();
        f2.write_all(b"# Sub Note\nInside sub folder").unwrap();

        // Hidden file that must be ignored
        let hidden = temp_dir.join(".hidden.md");
        File::create(&hidden).unwrap();

        let entries = scan_vault(&temp_dir).unwrap();
        assert_eq!(entries.len(), 2); // 1 folder (notes) + 1 file (root-note.md)
        assert!(entries[0].is_directory);
        assert_eq!(entries[0].name, "notes");
        assert!(!entries[1].is_directory);
        assert_eq!(entries[1].name, "root-note.md");

        let doc_content = read_document(&note1).unwrap();
        assert!(doc_content.contains("# Root Note"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
