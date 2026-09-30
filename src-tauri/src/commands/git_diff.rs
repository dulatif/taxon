use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffSummary {
    pub file_path: String,
    pub status: String, // "added" | "modified" | "deleted"
    pub additions: usize,
    pub deletions: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffPayload {
    pub file_path: String,
    pub old_content: String,
    pub new_content: String,
    pub additions: usize,
    pub deletions: usize,
    pub is_binary: bool,
}

fn resolve_working_dir(project_path: &str, workspace_path: Option<&str>) -> PathBuf {
    if let Some(ws) = workspace_path {
        let p = Path::new(ws);
        if p.exists() {
            return p.to_path_buf();
        }
    }
    Path::new(project_path).to_path_buf()
}

fn resolve_baseline(cwd: &Path, base_commit: Option<&str>) -> String {
    if let Some(bc) = base_commit {
        let trimmed = bc.trim();
        if !trimmed.is_empty() {
            // Verify commit exists
            let status = Command::new("git")
                .args(["cat-file", "-e", &format!("{}^{{commit}}", trimmed)])
                .current_dir(cwd)
                .status();
            if let Ok(s) = status {
                if s.success() {
                    return trimmed.to_string();
                }
            }
        }
    }

    // Try merge-base with main or master
    for base_branch in ["main", "origin/main", "master", "origin/master"] {
        if let Ok(output) = Command::new("git")
            .args(["merge-base", base_branch, "HEAD"])
            .current_dir(cwd)
            .output()
        {
            if output.status.success() {
                let sha = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !sha.is_empty() {
                    return sha;
                }
            }
        }
    }

    // Try HEAD~1
    if let Ok(output) = Command::new("git")
        .args(["rev-parse", "HEAD~1"])
        .current_dir(cwd)
        .output()
    {
        if output.status.success() {
            let sha = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !sha.is_empty() {
                return sha;
            }
        }
    }

    // Try current HEAD
    if let Ok(output) = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(cwd)
        .output()
    {
        if output.status.success() {
            let sha = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !sha.is_empty() {
                return sha;
            }
        }
    }

    // Empty tree SHA
    "4b825dc642cb6eb9a060e54bf8d69288fbee4904".to_string()
}

#[tauri::command]
pub fn get_current_head_commit(repo_path: Option<String>) -> Result<String, String> {
    let p = repo_path.unwrap_or_else(|| ".".to_string());
    let cwd = Path::new(&p);
    let output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to run git rev-parse: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
pub fn get_task_diff_summary(
    project_path: String,
    workspace_path: Option<String>,
    base_commit: Option<String>,
) -> Result<Vec<FileDiffSummary>, String> {
    let cwd = resolve_working_dir(&project_path, workspace_path.as_deref());
    let baseline = resolve_baseline(&cwd, base_commit.as_deref());

    // 1. Get numstat for additions/deletions
    let mut numstats: HashMap<String, (usize, usize)> = HashMap::new();
    if let Ok(output) = Command::new("git")
        .args(["diff", "--numstat", &baseline])
        .current_dir(&cwd)
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 3 {
                    let adds = parts[0].parse::<usize>().unwrap_or(0);
                    let dels = parts[1].parse::<usize>().unwrap_or(0);
                    let file = parts[2].trim().to_string();
                    numstats.insert(file, (adds, dels));
                }
            }
        }
    }

    // 2. Get status for modified/added/deleted
    let mut summaries: Vec<FileDiffSummary> = Vec::new();
    let mut seen_files = std::collections::HashSet::new();

    if let Ok(output) = Command::new("git")
        .args(["diff", "--name-status", &baseline])
        .current_dir(&cwd)
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    let status_char = parts[0].chars().next().unwrap_or('M');
                    let file_path = parts[parts.len() - 1].to_string();
                    let status_str = match status_char {
                        'A' => "added",
                        'D' => "deleted",
                        _ => "modified",
                    };
                    let (adds, dels) = numstats.get(&file_path).copied().unwrap_or((0, 0));
                    seen_files.insert(file_path.clone());
                    summaries.push(FileDiffSummary {
                        file_path,
                        status: status_str.to_string(),
                        additions: adds,
                        deletions: dels,
                    });
                }
            }
        }
    }

    // 3. Catch untracked files in the working directory
    if let Ok(output) = Command::new("git")
        .args(["status", "--porcelain", "-uall"])
        .current_dir(&cwd)
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.len() > 3 && &line[0..2] == "??" {
                    let file_path = line[3..].trim().to_string();
                    if !seen_files.contains(&file_path) {
                        let full_path = cwd.join(&file_path);
                        let lines_count = if let Ok(c) = std::fs::read_to_string(&full_path) {
                            c.lines().count()
                        } else {
                            0
                        };
                        seen_files.insert(file_path.clone());
                        summaries.push(FileDiffSummary {
                            file_path,
                            status: "added".to_string(),
                            additions: lines_count,
                            deletions: 0,
                        });
                    }
                }
            }
        }
    }

    // Sort by file_path
    summaries.sort_by(|a, b| a.file_path.cmp(&b.file_path));
    Ok(summaries)
}

fn is_binary_buffer(buf: &[u8]) -> bool {
    buf.iter().take(1024).any(|&b| b == 0)
}

#[tauri::command]
pub fn get_file_diff_payload(
    project_path: String,
    workspace_path: Option<String>,
    file_path: String,
    base_commit: Option<String>,
) -> Result<FileDiffPayload, String> {
    let cwd = resolve_working_dir(&project_path, workspace_path.as_deref());
    let baseline = resolve_baseline(&cwd, base_commit.as_deref());

    // 1. Get old content from baseline
    let show_target = format!("{}:{}", baseline, file_path);
    let old_bytes = Command::new("git")
        .args(["show", &show_target])
        .current_dir(&cwd)
        .output()
        .map(|o| if o.status.success() { o.stdout } else { Vec::new() })
        .unwrap_or_default();

    // 2. Get new content from working tree
    let target_file = cwd.join(&file_path);
    let new_bytes = if target_file.exists() {
        std::fs::read(&target_file).unwrap_or_default()
    } else {
        Vec::new()
    };

    let is_binary = is_binary_buffer(&old_bytes) || is_binary_buffer(&new_bytes);

    if is_binary {
        return Ok(FileDiffPayload {
            file_path,
            old_content: "[Binary file content not displayed]".to_string(),
            new_content: "[Binary file content not displayed]".to_string(),
            additions: 0,
            deletions: 0,
            is_binary: true,
        });
    }

    let old_content = String::from_utf8_lossy(&old_bytes).to_string();
    let new_content = String::from_utf8_lossy(&new_bytes).to_string();

    // Calculate line deltas
    let old_lines: Vec<&str> = old_content.lines().collect();
    let new_lines: Vec<&str> = new_content.lines().collect();

    // Simple diff count approximation
    let additions = if new_lines.len() > old_lines.len() {
        new_lines.len() - old_lines.len()
    } else {
        0
    };
    let deletions = if old_lines.len() > new_lines.len() {
        old_lines.len() - new_lines.len()
    } else {
        0
    };

    Ok(FileDiffPayload {
        file_path,
        old_content,
        new_content,
        additions,
        deletions,
        is_binary: false,
    })
}

#[tauri::command]
pub fn save_remediated_file(
    file_path: String,
    content: String,
    workspace_path: Option<String>,
) -> Result<(), String> {
    let p = if let Some(ws) = workspace_path {
        let base = Path::new(&ws);
        if Path::new(&file_path).is_absolute() {
            PathBuf::from(file_path)
        } else {
            base.join(file_path)
        }
    } else {
        PathBuf::from(file_path)
    };

    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dirs: {}", e))?;
    }

    std::fs::write(&p, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn commit_approved_task(
    project_path: String,
    workspace_path: Option<String>,
    task_id: String,
    title: String,
) -> Result<String, String> {
    let cwd = resolve_working_dir(&project_path, workspace_path.as_deref());

    // 1. git add -A
    let add_status = Command::new("git")
        .args(["add", "-A"])
        .current_dir(&cwd)
        .status()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !add_status.success() {
        return Err("git add -A failed".to_string());
    }

    // 2. git commit -m "feat(TASK-<id>): <title>"
    let commit_msg = format!("feat(TASK-{}): {}", task_id, title);
    let commit_output = Command::new("git")
        .args(["commit", "-m", &commit_msg])
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    if !commit_output.status.success() {
        let stderr = String::from_utf8_lossy(&commit_output.stderr);
        return Err(format!("git commit failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&commit_output.stdout).to_string();
    Ok(stdout)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_binary_buffer() {
        let text_buf = b"Hello, this is regular UTF-8 text without null bytes.";
        assert!(!is_binary_buffer(text_buf));

        let binary_buf = [b'H', b'e', 0, b'l', b'l', b'o'];
        assert!(is_binary_buffer(&binary_buf));
    }

    #[test]
    fn test_resolve_working_dir_fallback() {
        let project = "/path/to/project";
        let non_existent_ws = Some("/non/existent/workspace");
        let resolved = resolve_working_dir(project, non_existent_ws);
        assert_eq!(resolved, PathBuf::from(project));
    }
}

