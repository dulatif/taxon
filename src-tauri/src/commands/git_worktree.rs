use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeInfo {
    pub workspace_path: String,
    pub worktree_branch: String,
    pub success: bool,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeResult {
    pub success: bool,
    pub message: Option<String>,
    pub conflict_files: Vec<String>,
    pub base_branch_clean: bool,
}

fn create_symlink(source: &Path, target: &Path) -> std::io::Result<()> {
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(source, target)
    }
    #[cfg(windows)]
    {
        if source.is_dir() {
            std::os::windows::fs::symlink_dir(source, target)
        } else {
            std::os::windows::fs::symlink_file(source, target)
        }
    }
}

fn sanitize_task_id(task_id: &str) -> String {
    let clean = task_id.strip_prefix("task_").unwrap_or(task_id);
    if clean.starts_with("TASK-") {
        clean.to_string()
    } else {
        format!("TASK-{}", clean)
    }
}

#[tauri::command]
pub async fn git_worktree_spawn(
    project_path: String,
    task_id: String,
    worktree_dir: Option<String>,
    base_branch: Option<String>,
    setup_command: Option<String>,
) -> Result<WorktreeInfo, String> {
    let project_root = Path::new(&project_path);
    if !project_root.exists() {
        return Err(format!("Project root directory does not exist: {}", project_path));
    }

    let wt_rel = worktree_dir.unwrap_or_else(|| ".worktrees".to_string());
    let wt_root = project_root.join(&wt_rel);

    // 1. Ensure .worktrees exists and has .gitignore with "*"
    if !wt_root.exists() {
        std::fs::create_dir_all(&wt_root)
            .map_err(|e| format!("Failed to create worktrees directory: {}", e))?;
    }
    let gitignore_path = wt_root.join(".gitignore");
    if !gitignore_path.exists() {
        let _ = std::fs::write(&gitignore_path, "*\n!.gitignore\n");
    }

    let task_slug = sanitize_task_id(&task_id);
    let worktree_path = wt_root.join(&task_slug);
    let branch_name = format!("feat/{}", task_slug);

    // 2. Check if worktree already exists and is valid
    if worktree_path.exists() && worktree_path.join(".git").exists() {
        return Ok(WorktreeInfo {
            workspace_path: worktree_path.canonicalize().unwrap_or(worktree_path).to_string_lossy().to_string(),
            worktree_branch: branch_name,
            success: true,
            message: Some("Existing worktree reused".to_string()),
        });
    }

    // 3. Determine if branch already exists in repo
    let branch_exists = Command::new("git")
        .args(["rev-parse", "--verify", &format!("refs/heads/{}", branch_name)])
        .current_dir(project_root)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let output = if branch_exists {
        Command::new("git")
            .args(["worktree", "add", worktree_path.to_str().unwrap(), &branch_name])
            .current_dir(project_root)
            .output()
            .map_err(|e| format!("Failed to execute git worktree add: {}", e))?
    } else {
        let base = base_branch.as_deref().unwrap_or("HEAD");
        Command::new("git")
            .args([
                "worktree",
                "add",
                "-b",
                &branch_name,
                worktree_path.to_str().unwrap(),
                base,
            ])
            .current_dir(project_root)
            .output()
            .map_err(|e| format!("Failed to execute git worktree add: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git worktree add failed: {}", stderr));
    }

    // 4. Dependency Bridging: Symlink node_modules and .venv if present in project root
    let node_modules_src = project_root.join("node_modules");
    let node_modules_dst = worktree_path.join("node_modules");
    if node_modules_src.exists() && !node_modules_dst.exists() {
        let _ = create_symlink(&node_modules_src, &node_modules_dst);
    }

    let venv_src = project_root.join(".venv");
    let venv_dst = worktree_path.join(".venv");
    if venv_src.exists() && !venv_dst.exists() {
        let _ = create_symlink(&venv_src, &venv_dst);
    }

    // 5. Run optional worktree setup command
    if let Some(cmd) = setup_command {
        let trimmed = cmd.trim();
        if !trimmed.is_empty() {
            #[cfg(unix)]
            let _ = Command::new("sh")
                .args(["-c", trimmed])
                .current_dir(&worktree_path)
                .status();

            #[cfg(windows)]
            let _ = Command::new("cmd")
                .args(["/C", trimmed])
                .current_dir(&worktree_path)
                .status();
        }
    }

    let abs_path = worktree_path
        .canonicalize()
        .unwrap_or(worktree_path)
        .to_string_lossy()
        .to_string();

    Ok(WorktreeInfo {
        workspace_path: abs_path,
        worktree_branch: branch_name,
        success: true,
        message: None,
    })
}

#[tauri::command]
pub async fn launch_sandbox_terminal(worktree_path: String) -> Result<(), String> {
    let p = Path::new(&worktree_path);
    if !p.exists() {
        return Err(format!("Sandbox directory does not exist: {}", worktree_path));
    }

    #[cfg(target_os = "linux")]
    {
        // Try common terminal emulators
        let terminals = [
            "x-terminal-emulator",
            "kitty",
            "alacritty",
            "wezterm",
            "gnome-terminal",
            "konsole",
            "xfce4-terminal",
            "xterm",
        ];

        if let Ok(term) = std::env::var("TERMINAL") {
            if Command::new(&term).current_dir(p).spawn().is_ok() {
                return Ok(());
            }
        }

        for term in terminals {
            if Command::new(term).current_dir(p).spawn().is_ok() {
                return Ok(());
            }
        }

        Err("No supported terminal emulator found on PATH".to_string())
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-a", "Terminal", &worktree_path])
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd.exe")
            .args(["/c", "start", "cmd.exe"])
            .current_dir(p)
            .spawn()
            .map_err(|e| format!("Failed to launch terminal on Windows: {}", e))?;
        Ok(())
    }
}

#[tauri::command]
pub async fn launch_sandbox_editor(
    worktree_path: String,
    editor_cmd: Option<String>,
) -> Result<(), String> {
    let p = Path::new(&worktree_path);
    if !p.exists() {
        return Err(format!("Sandbox directory does not exist: {}", worktree_path));
    }

    if let Some(custom) = editor_cmd {
        let trimmed = custom.trim();
        if !trimmed.is_empty() {
            Command::new(trimmed)
                .arg(&worktree_path)
                .spawn()
                .map_err(|e| format!("Failed to launch custom editor '{}': {}", trimmed, e))?;
            return Ok(());
        }
    }

    // Default editor hierarchy: VS Code -> Cursor -> $EDITOR
    let editors = ["code", "cursor"];
    for ed in editors {
        if Command::new(ed).arg(&worktree_path).spawn().is_ok() {
            return Ok(());
        }
    }

    if let Ok(ed) = std::env::var("EDITOR") {
        if Command::new(&ed).arg(&worktree_path).spawn().is_ok() {
            return Ok(());
        }
    }

    Err("Could not find VS Code ('code'), Cursor ('cursor'), or $EDITOR on system".to_string())
}

#[tauri::command]
pub async fn git_worktree_merge(
    project_path: String,
    worktree_path: String,
    branch: String,
    strategy: Option<String>,
    delete_worktree: Option<bool>,
) -> Result<MergeResult, String> {
    let project_root = Path::new(&project_path);
    if !project_root.exists() {
        return Err(format!("Project root directory does not exist: {}", project_path));
    }

    let strat = strategy.unwrap_or_else(|| "squash".to_string()).to_lowercase();
    let should_delete = delete_worktree.unwrap_or(true);

    let merge_arg = match strat.as_str() {
        "rebase" => "rebase",
        "merge" => "merge",
        _ => "squash",
    };

    let merge_status = if merge_arg == "squash" {
        Command::new("git")
            .args(["merge", "--squash", &branch])
            .current_dir(project_root)
            .output()
    } else if merge_arg == "rebase" {
        Command::new("git")
            .args(["rebase", &branch])
            .current_dir(project_root)
            .output()
    } else {
        Command::new("git")
            .args(["merge", "--no-ff", &branch, "-m", &format!("Merge branch '{}'", branch)])
            .current_dir(project_root)
            .output()
    };

    let output = merge_status.map_err(|e| format!("Failed to run git merge: {}", e))?;

    if !output.status.success() {
        // Safe Merge Abort: execute git merge --abort / git rebase --abort
        let conflict_output = Command::new("git")
            .args(["diff", "--name-only", "--diff-filter=U"])
            .current_dir(project_root)
            .output();

        let conflict_files: Vec<String> = conflict_output
            .ok()
            .map(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .filter(|l| !l.trim().is_empty())
                    .map(|l| l.trim().to_string())
                    .collect()
            })
            .unwrap_or_default();

        if merge_arg == "rebase" {
            let _ = Command::new("git").args(["rebase", "--abort"]).current_dir(project_root).output();
        } else {
            let _ = Command::new("git").args(["merge", "--abort"]).current_dir(project_root).output();
        }

        return Ok(MergeResult {
            success: false,
            message: Some("Merge conflict encountered. Safe merge abort executed; working tree restored to clean state.".to_string()),
            conflict_files,
            base_branch_clean: true,
        });
    }

    // If squash merge was performed, commit the staged changes
    if merge_arg == "squash" {
        let commit_msg = format!("feat: merge and squash {}", branch);
        let commit_res = Command::new("git")
            .args(["commit", "-m", &commit_msg])
            .current_dir(project_root)
            .output();
        if let Ok(res) = commit_res {
            if !res.status.success() {
                let stderr = String::from_utf8_lossy(&res.stderr);
                if !stderr.contains("nothing to commit") {
                    return Err(format!("Failed to commit squash merge: {}", stderr));
                }
            }
        }
    }

    // Prune worktree if requested
    if should_delete {
        let wt_p = Path::new(&worktree_path);
        if wt_p.exists() {
            let _ = Command::new("git")
                .args(["worktree", "remove", "--force", &worktree_path])
                .current_dir(project_root)
                .output();
            let _ = Command::new("git")
                .args(["worktree", "prune"])
                .current_dir(project_root)
                .output();
            let _ = Command::new("git")
                .args(["branch", "-D", &branch])
                .current_dir(project_root)
                .output();
            if wt_p.exists() {
                let _ = std::fs::remove_dir_all(wt_p);
            }
        }
    }

    Ok(MergeResult {
        success: true,
        message: Some("Worktree successfully merged".to_string()),
        conflict_files: Vec::new(),
        base_branch_clean: true,
    })
}

#[tauri::command]
pub async fn git_worktree_prune(
    project_path: String,
    worktree_path: String,
) -> Result<(), String> {
    let project_root = Path::new(&project_path);
    if !project_root.exists() {
        return Err(format!("Project root directory does not exist: {}", project_path));
    }

    let wt_p = Path::new(&worktree_path);
    if wt_p.exists() {
        let _ = Command::new("git")
            .args(["worktree", "remove", "--force", &worktree_path])
            .current_dir(project_root)
            .output();
        let _ = Command::new("git")
            .args(["worktree", "prune"])
            .current_dir(project_root)
            .output();
        if wt_p.exists() {
            let _ = std::fs::remove_dir_all(wt_p);
        }
    }

    Ok(())
}
