// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

const REPO_URL: &str = "https://github.com/gnekt/My-Brain-Is-Full-Crew.git";
const REPO_FOLDER_NAME: &str = "My-Brain-Is-Full-Crew";

// ---------------------------------------------------------------------------
// Config persistence
// ---------------------------------------------------------------------------

fn config_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("mbif-crew");
    fs::create_dir_all(&config_dir).ok();
    config_dir.join("config.json")
}

#[derive(Serialize, Deserialize, Default)]
struct AppConfig {
    vault_path: Option<String>,
    disabled_agents: Vec<String>,
}

fn load_config() -> AppConfig {
    let path = config_path();
    if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

fn save_config(config: &AppConfig) {
    let path = config_path();
    if let Ok(json) = serde_json::to_string_pretty(config) {
        fs::write(path, json).ok();
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn check_command(cmd: &str, args: &[&str]) -> bool {
    Command::new(cmd)
        .args(args)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn is_git_installed() -> bool {
    check_command("git", &["--version"])
}

fn is_obsidian_installed() -> bool {
    #[cfg(target_os = "macos")]
    {
        Path::new("/Applications/Obsidian.app").exists()
    }
    #[cfg(target_os = "windows")]
    {
        // Check common install locations
        let local_app = std::env::var("LOCALAPPDATA").unwrap_or_default();
        Path::new(&local_app).join("Obsidian").join("Obsidian.exe").exists()
            || check_command("where", &["obsidian"])
    }
    #[cfg(target_os = "linux")]
    {
        // Check for AppImage in common locations or if obsidian is in PATH
        let home = std::env::var("HOME").unwrap_or_default();
        Path::new(&home).join("Applications").join("Obsidian.AppImage").exists()
            || Path::new("/opt/Obsidian/obsidian").exists()
            || Path::new("/usr/bin/obsidian").exists()
            || check_command("which", &["obsidian"])
    }
}

/// Resolve a bundled resource file, trying production bundle path first, then dev path
fn resolve_resource(app_handle: &tauri::AppHandle, filename: &str) -> Option<PathBuf> {
    // Production: resources are in the app resource dir
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let prod_path = resource_dir.join("resources").join(filename);
        if prod_path.exists() {
            return Some(prod_path);
        }
    }

    // Dev mode: relative to Cargo manifest dir
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join(filename);
    if dev_path.exists() {
        return Some(dev_path);
    }

    None
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize)]
struct SystemStatus {
    git_installed: bool,
    obsidian_installed: bool,
    repo_cloned: bool,
    crew_installed: bool,
    vault_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
struct AgentInfo {
    name: String,
    display_name: String,
    description: String,
    tools: Vec<String>,
    model: String,
    is_custom: bool,
    enabled: bool,
    file_path: String,
}

#[derive(Serialize, Deserialize)]
struct CommandResult {
    success: bool,
    message: String,
}

// ---------------------------------------------------------------------------
// Commands: status
// ---------------------------------------------------------------------------

#[tauri::command]
fn check_status() -> SystemStatus {
    let config = load_config();
    let git_installed = is_git_installed();
    let obsidian_installed = is_obsidian_installed();

    let (repo_cloned, crew_installed) = if let Some(ref vault) = config.vault_path {
        let repo = Path::new(vault).join(REPO_FOLDER_NAME).exists();
        let crew = Path::new(vault).join(".claude").join("agents").exists();
        (repo, crew)
    } else {
        (false, false)
    };

    SystemStatus {
        git_installed,
        obsidian_installed,
        repo_cloned,
        crew_installed,
        vault_path: config.vault_path,
    }
}

#[tauri::command]
fn get_stored_vault_path() -> Option<String> {
    load_config().vault_path
}

#[tauri::command]
fn save_vault_path(path: String) -> Result<(), String> {
    let mut config = load_config();
    config.vault_path = Some(path);
    save_config(&config);
    Ok(())
}

// ---------------------------------------------------------------------------
// Commands: install Git
// ---------------------------------------------------------------------------

#[tauri::command]
fn install_git(#[allow(unused)] app_handle: tauri::AppHandle) -> CommandResult {
    if is_git_installed() {
        return CommandResult {
            success: true,
            message: "Git e' gia' installato.".to_string(),
        };
    }

    #[cfg(target_os = "macos")]
    {
        // macOS: xcode-select --install opens a native system dialog
        match Command::new("xcode-select").arg("--install").spawn() {
            Ok(_) => CommandResult {
                success: true,
                message: "Installazione Xcode Command Line Tools avviata.\nSegui la finestra di dialogo del sistema per completare.\nUna volta finito, clicca 'Ricontrolla'.".to_string(),
            },
            Err(e) => CommandResult {
                success: false,
                message: format!("Errore nell'avvio dell'installazione: {}", e),
            },
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Windows: run bundled Git installer
        let installer = resolve_resource(&app_handle, "Git-Installer.exe");
        match installer {
            Some(path) => {
                match Command::new(&path)
                    .args(["/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-"])
                    .spawn()
                {
                    Ok(_) => CommandResult {
                        success: true,
                        message: "Installazione di Git avviata.\nAttendi il completamento, poi clicca 'Ricontrolla'.".to_string(),
                    },
                    Err(e) => CommandResult {
                        success: false,
                        message: format!("Errore nell'avvio dell'installer Git: {}", e),
                    },
                }
            }
            None => CommandResult {
                success: false,
                message: "Installer Git non trovato nel bundle dell'app.".to_string(),
            },
        }
    }

    #[cfg(target_os = "linux")]
    {
        let _ = app_handle;
        // Linux: try common package managers with pkexec for privilege escalation
        let (pm, args): (&str, Vec<&str>) = if check_command("apt", &["--version"]) {
            ("pkexec", vec!["apt", "install", "-y", "git"])
        } else if check_command("dnf", &["--version"]) {
            ("pkexec", vec!["dnf", "install", "-y", "git"])
        } else if check_command("pacman", &["--version"]) {
            ("pkexec", vec!["pacman", "-S", "--noconfirm", "git"])
        } else if check_command("zypper", &["--version"]) {
            ("pkexec", vec!["zypper", "install", "-y", "git"])
        } else {
            return CommandResult {
                success: false,
                message: "Nessun package manager supportato trovato.\nInstalla git manualmente.".to_string(),
            };
        };

        match Command::new(pm).args(&args).output() {
            Ok(output) if output.status.success() => CommandResult {
                success: true,
                message: "Git installato con successo!".to_string(),
            },
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                CommandResult {
                    success: false,
                    message: format!("Errore nell'installazione: {}", stderr),
                }
            }
            Err(e) => CommandResult {
                success: false,
                message: format!("Errore: {}.\nProva a installare manualmente: sudo apt install git", e),
            },
        }
    }
}

// ---------------------------------------------------------------------------
// Commands: install Obsidian
// ---------------------------------------------------------------------------

#[tauri::command]
fn install_obsidian(app_handle: tauri::AppHandle) -> CommandResult {
    if is_obsidian_installed() {
        return CommandResult {
            success: true,
            message: "Obsidian e' gia' installato.".to_string(),
        };
    }

    #[cfg(target_os = "macos")]
    {
        install_obsidian_macos(&app_handle)
    }

    #[cfg(target_os = "windows")]
    {
        install_obsidian_windows(&app_handle)
    }

    #[cfg(target_os = "linux")]
    {
        install_obsidian_linux(&app_handle)
    }
}

#[cfg(target_os = "macos")]
fn install_obsidian_macos(app_handle: &tauri::AppHandle) -> CommandResult {
    let dmg_path = match resolve_resource(app_handle, "Obsidian.dmg") {
        Some(p) => p,
        None => {
            return CommandResult {
                success: false,
                message: "Installer Obsidian.dmg non trovato nel bundle dell'app.".to_string(),
            };
        }
    };

    // Mount the DMG
    let mount_output = Command::new("hdiutil")
        .args(["attach", &dmg_path.to_string_lossy(), "-nobrowse", "-quiet"])
        .output();

    match mount_output {
        Ok(output) if output.status.success() => {
            // Find the mounted Obsidian volume
            let volume_path = find_volume_containing("Obsidian.app");
            match volume_path {
                Some(volume) => {
                    let obsidian_app = Path::new(&volume).join("Obsidian.app");

                    // Copy to /Applications
                    let copy_result = Command::new("cp")
                        .args(["-R", &obsidian_app.to_string_lossy(), "/Applications/"])
                        .output();

                    // Always detach
                    Command::new("hdiutil")
                        .args(["detach", &volume, "-quiet"])
                        .output()
                        .ok();

                    match copy_result {
                        Ok(o) if o.status.success() => CommandResult {
                            success: true,
                            message: "Obsidian installato con successo in /Applications!".to_string(),
                        },
                        Ok(o) => CommandResult {
                            success: false,
                            message: format!("Errore copia: {}", String::from_utf8_lossy(&o.stderr)),
                        },
                        Err(e) => CommandResult {
                            success: false,
                            message: format!("Errore cp: {}", e),
                        },
                    }
                }
                None => {
                    // Try to detach any obsidian volume
                    detach_obsidian_volumes();
                    CommandResult {
                        success: false,
                        message: "Volume Obsidian non trovato dopo il mount del DMG.".to_string(),
                    }
                }
            }
        }
        Ok(output) => CommandResult {
            success: false,
            message: format!("Errore mount DMG: {}", String::from_utf8_lossy(&output.stderr)),
        },
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore hdiutil: {}", e),
        },
    }
}

#[cfg(target_os = "macos")]
fn find_volume_containing(app_name: &str) -> Option<String> {
    if let Ok(entries) = fs::read_dir("/Volumes") {
        for entry in entries.flatten() {
            let app_path = entry.path().join(app_name);
            if app_path.exists() {
                return Some(entry.path().to_string_lossy().to_string());
            }
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn detach_obsidian_volumes() {
    if let Ok(entries) = fs::read_dir("/Volumes") {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_lowercase();
            if name.contains("obsidian") {
                Command::new("hdiutil")
                    .args(["detach", &entry.path().to_string_lossy(), "-quiet"])
                    .output()
                    .ok();
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn install_obsidian_windows(app_handle: &tauri::AppHandle) -> CommandResult {
    let installer = match resolve_resource(app_handle, "Obsidian-Setup.exe") {
        Some(p) => p,
        None => {
            return CommandResult {
                success: false,
                message: "Installer Obsidian-Setup.exe non trovato nel bundle dell'app.".to_string(),
            };
        }
    };

    // Run the NSIS installer silently
    match Command::new(&installer)
        .args(["/S"])  // NSIS silent install
        .spawn()
    {
        Ok(mut child) => {
            // Wait for completion
            match child.wait() {
                Ok(status) if status.success() => CommandResult {
                    success: true,
                    message: "Obsidian installato con successo!".to_string(),
                },
                Ok(status) => CommandResult {
                    success: false,
                    message: format!("L'installer e' uscito con codice: {}", status),
                },
                Err(e) => CommandResult {
                    success: false,
                    message: format!("Errore durante l'attesa dell'installer: {}", e),
                },
            }
        }
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore nell'avvio dell'installer: {}", e),
        },
    }
}

#[cfg(target_os = "linux")]
fn install_obsidian_linux(app_handle: &tauri::AppHandle) -> CommandResult {
    let appimage = match resolve_resource(app_handle, "Obsidian.AppImage") {
        Some(p) => p,
        None => {
            return CommandResult {
                success: false,
                message: "Obsidian.AppImage non trovato nel bundle dell'app.".to_string(),
            };
        }
    };

    // Create ~/Applications if it doesn't exist
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home".to_string());
    let apps_dir = PathBuf::from(&home).join("Applications");
    fs::create_dir_all(&apps_dir).ok();

    let dest = apps_dir.join("Obsidian.AppImage");

    // Copy AppImage to ~/Applications
    match fs::copy(&appimage, &dest) {
        Ok(_) => {
            // Make it executable
            let chmod_result = Command::new("chmod")
                .args(["+x", &dest.to_string_lossy()])
                .output();

            match chmod_result {
                Ok(o) if o.status.success() => {
                    // Create a .desktop entry for integration
                    create_obsidian_desktop_entry(&dest, &home);
                    CommandResult {
                        success: true,
                        message: format!(
                            "Obsidian installato in {}!\nL'AppImage e' pronto per l'uso.",
                            dest.display()
                        ),
                    }
                }
                _ => CommandResult {
                    success: true,
                    message: format!(
                        "Obsidian copiato in {} ma chmod +x potrebbe essere fallito.\nRendilo eseguibile manualmente: chmod +x {}",
                        dest.display(), dest.display()
                    ),
                },
            }
        }
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore nella copia dell'AppImage: {}", e),
        },
    }
}

#[cfg(target_os = "linux")]
fn create_obsidian_desktop_entry(appimage_path: &Path, home: &str) {
    let desktop_dir = PathBuf::from(home).join(".local").join("share").join("applications");
    fs::create_dir_all(&desktop_dir).ok();

    let desktop_content = format!(
        "[Desktop Entry]\n\
         Name=Obsidian\n\
         Exec=\"{}\" %u\n\
         Terminal=false\n\
         Type=Application\n\
         Icon=obsidian\n\
         StartupWMClass=obsidian\n\
         Comment=Knowledge base that works on local Markdown files\n\
         MimeType=x-scheme-handler/obsidian;\n\
         Categories=Office;\n",
        appimage_path.display()
    );

    fs::write(desktop_dir.join("obsidian.desktop"), desktop_content).ok();
}

// ---------------------------------------------------------------------------
// Commands: clone repo & install crew
// ---------------------------------------------------------------------------

#[tauri::command]
fn clone_repo(vault_path: String) -> CommandResult {
    let vault = Path::new(&vault_path);
    if !vault.exists() {
        return CommandResult {
            success: false,
            message: "Il percorso del vault non esiste.".to_string(),
        };
    }

    if !is_git_installed() {
        return CommandResult {
            success: false,
            message: "Git non e' installato. Installalo prima di procedere.".to_string(),
        };
    }

    let repo_dir = vault.join(REPO_FOLDER_NAME);
    if repo_dir.exists() {
        match Command::new("git")
            .args(["pull"])
            .current_dir(&repo_dir)
            .output()
        {
            Ok(output) if output.status.success() => {
                return CommandResult {
                    success: true,
                    message: "Repository aggiornata con git pull.".to_string(),
                };
            }
            _ => {
                return CommandResult {
                    success: true,
                    message: "Repository gia' presente. Procedi con l'installazione.".to_string(),
                };
            }
        }
    }

    match Command::new("git")
        .args(["clone", REPO_URL, REPO_FOLDER_NAME])
        .current_dir(vault)
        .output()
    {
        Ok(output) if output.status.success() => CommandResult {
            success: true,
            message: "Repository clonata con successo!".to_string(),
        },
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            CommandResult {
                success: false,
                message: format!("Errore nel clone: {}", stderr),
            }
        }
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore nell'esecuzione di git clone: {}", e),
        },
    }
}

#[tauri::command]
fn install_crew(vault_path: String) -> CommandResult {
    let vault = Path::new(&vault_path);
    let source = vault.join(REPO_FOLDER_NAME);

    if !source.exists() {
        return CommandResult {
            success: false,
            message: "La repository non e' stata clonata. Clonala prima di procedere.".to_string(),
        };
    }

    let mut log = String::new();

    let claude_dir = vault.join(".claude");
    let agents_dir = claude_dir.join("agents");
    let references_dir = claude_dir.join("references");
    let skills_dir = claude_dir.join("skills");

    for dir in [&agents_dir, &references_dir, &skills_dir] {
        if let Err(e) = fs::create_dir_all(dir) {
            return CommandResult {
                success: false,
                message: format!("Errore creazione directory: {}", e),
            };
        }
    }
    log.push_str("Directory .claude create\n");

    // Copy agents
    let agents_source = source.join("agents");
    if agents_source.exists() {
        let mut count = 0;
        if let Ok(entries) = fs::read_dir(&agents_source) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "md") {
                    let dest = agents_dir.join(entry.file_name());
                    if fs::copy(&path, &dest).is_ok() {
                        count += 1;
                    }
                }
            }
        }
        log.push_str(&format!("{} agenti copiati\n", count));
    }

    // Copy references
    let refs_source = source.join("references");
    if refs_source.exists() {
        let mut count = 0;
        if let Ok(entries) = fs::read_dir(&refs_source) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "md") {
                    let dest = references_dir.join(entry.file_name());
                    if fs::copy(&path, &dest).is_ok() {
                        count += 1;
                    }
                }
            }
        }
        log.push_str(&format!("{} riferimenti copiati\n", count));
    }

    // Copy CLAUDE.md
    let claude_md = source.join("CLAUDE.md");
    if claude_md.exists() {
        if fs::copy(&claude_md, vault.join("CLAUDE.md")).is_ok() {
            log.push_str("CLAUDE.md copiato\n");
        }
    }

    // Copy .mcp.json
    let mcp_json = source.join(".mcp.json");
    if mcp_json.exists() {
        if fs::copy(&mcp_json, vault.join(".mcp.json")).is_ok() {
            log.push_str(".mcp.json copiato\n");
        }
    }

    // Copy skills
    let skills_source = source.join("skills");
    if skills_source.exists() {
        if let Ok(entries) = fs::read_dir(&skills_source) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let dest_skill_dir = skills_dir.join(entry.file_name());
                    fs::create_dir_all(&dest_skill_dir).ok();
                    let skill_file = path.join("SKILL.md");
                    if skill_file.exists() {
                        fs::copy(&skill_file, dest_skill_dir.join("SKILL.md")).ok();
                    }
                }
            }
        }
        log.push_str("Skills copiate\n");
    }

    log.push_str("\nInstallazione completata con successo!");

    CommandResult {
        success: true,
        message: log,
    }
}

// ---------------------------------------------------------------------------
// Commands: agents
// ---------------------------------------------------------------------------

fn parse_agent_frontmatter(content: &str, file_path: &str, is_custom: bool, disabled: &[String]) -> Option<AgentInfo> {
    if !content.starts_with("---") {
        return None;
    }

    let end = content[3..].find("---")?;
    let frontmatter = &content[3..3 + end];

    let mut name = String::new();
    let mut description = String::new();
    let mut tools = Vec::new();
    let mut model = String::from("sonnet");

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("name:") {
            name = val.trim().trim_matches('"').trim_matches('\'').to_string();
        } else if let Some(val) = line.strip_prefix("description:") {
            let val = val.trim();
            if !val.starts_with('>') && !val.starts_with('|') && !val.is_empty() {
                description = val.trim_matches('"').trim_matches('\'').to_string();
            }
        } else if let Some(val) = line.strip_prefix("model:") {
            model = val.trim().trim_matches('"').trim_matches('\'').to_string();
        }
    }

    // Parse tools
    if let Some(idx) = frontmatter.find("tools:") {
        let after_tools = &frontmatter[idx + 6..];
        let first_line = after_tools.lines().next().unwrap_or("").trim();
        if first_line.is_empty() || first_line == "|" || first_line == ">" {
            for tool_line in after_tools.lines().skip(1) {
                let tool_line = tool_line.trim();
                if tool_line.starts_with("- ") {
                    tools.push(tool_line[2..].trim().to_string());
                } else if !tool_line.is_empty() && !tool_line.starts_with('-') {
                    break;
                }
            }
        } else {
            tools = first_line
                .split(',')
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .collect();
        }
    }

    // Parse multiline description
    if description.is_empty() {
        if let Some(idx) = frontmatter.find("description:") {
            let after_desc = &frontmatter[idx + 12..];
            let first_line = after_desc.lines().next().unwrap_or("").trim();
            if first_line == ">" || first_line == "|" || first_line.starts_with('>') {
                let mut desc_lines = Vec::new();
                for desc_line in after_desc.lines().skip(1) {
                    let trimmed = desc_line.trim();
                    if trimmed.is_empty() || (trimmed.ends_with(':') && !trimmed.contains(' ')) {
                        break;
                    }
                    desc_lines.push(trimmed.to_string());
                }
                description = desc_lines.join(" ");
            }
        }
    }

    if description.len() > 200 {
        description = format!("{}...", &description[..197]);
    }

    if name.is_empty() {
        return None;
    }

    let display_name = name
        .chars()
        .enumerate()
        .map(|(i, c)| if i == 0 { c.to_ascii_uppercase() } else { c })
        .collect();

    let enabled = !disabled.contains(&name);

    Some(AgentInfo {
        name,
        display_name,
        description,
        tools,
        model,
        is_custom,
        enabled,
        file_path: file_path.to_string(),
    })
}

#[tauri::command]
fn list_agents(vault_path: String) -> Vec<AgentInfo> {
    let config = load_config();
    let disabled = &config.disabled_agents;
    let mut agents = Vec::new();

    let agents_dir = Path::new(&vault_path).join(".claude").join("agents");
    if !agents_dir.exists() {
        return agents;
    }

    let core_names = [
        "architect", "scribe", "sorter", "seeker",
        "connector", "librarian", "transcriber", "postman",
    ];

    if let Ok(entries) = fs::read_dir(&agents_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "md") {
                if let Ok(content) = fs::read_to_string(&path) {
                    let file_name = path.file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    let is_custom = !core_names.contains(&file_name.as_str());
                    let path_str = path.to_string_lossy().to_string();

                    if let Some(agent) = parse_agent_frontmatter(&content, &path_str, is_custom, disabled) {
                        agents.push(agent);
                    }
                }
            }
        }
    }

    agents.sort_by(|a, b| {
        let a_idx = core_names.iter().position(|&n| n == a.name).unwrap_or(99);
        let b_idx = core_names.iter().position(|&n| n == b.name).unwrap_or(99);
        a_idx.cmp(&b_idx).then(a.name.cmp(&b.name))
    });

    agents
}

#[tauri::command]
fn toggle_agent(_vault_path: String, agent_name: String, enabled: bool) -> Result<(), String> {
    let mut config = load_config();
    if enabled {
        config.disabled_agents.retain(|n| n != &agent_name);
    } else if !config.disabled_agents.contains(&agent_name) {
        config.disabled_agents.push(agent_name);
    }
    save_config(&config);
    Ok(())
}

#[tauri::command]
fn create_vault(vault_path: String) -> CommandResult {
    let vault = Path::new(&vault_path);
    if !vault.exists() {
        if let Err(e) = fs::create_dir_all(vault) {
            return CommandResult {
                success: false,
                message: format!("Errore creazione cartella vault: {}", e),
            };
        }
    }

    let obsidian_dir = vault.join(".obsidian");
    if let Err(e) = fs::create_dir_all(&obsidian_dir) {
        return CommandResult {
            success: false,
            message: format!("Errore creazione .obsidian: {}", e),
        };
    }

    // Minimal config files Obsidian expects
    let files: &[(&str, &str)] = &[
        ("app.json", "{\n  \"alwaysUpdateLinks\": true\n}"),
        ("appearance.json", "{\n  \"accentColor\": \"\"\n}"),
        (
            "core-plugins.json",
            "[\n  \"file-explorer\",\n  \"global-search\",\n  \"switcher\",\n  \"graph\",\n  \"backlink\",\n  \"page-preview\",\n  \"note-composer\",\n  \"command-palette\",\n  \"markdown-importer\",\n  \"editor-status\",\n  \"word-count\",\n  \"file-recovery\",\n  \"outline\"\n]",
        ),
        ("community-plugins.json", "[]"),
        ("hotkeys.json", "{}"),
    ];

    for (name, content) in files {
        let file_path = obsidian_dir.join(name);
        // Don't overwrite if already exists
        if !file_path.exists() {
            if let Err(e) = fs::write(&file_path, content) {
                return CommandResult {
                    success: false,
                    message: format!("Errore scrittura {}: {}", name, e),
                };
            }
        }
    }

    // Open the vault in Obsidian so it finishes initialization
    let path_encoded = urlencoding::encode(&vault_path);
    let uri = format!("obsidian://open?path={}", path_encoded);

    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg(&uri).spawn().ok();
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", &uri])
            .spawn()
            .ok();
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open").arg(&uri).spawn().ok();
    }

    CommandResult {
        success: true,
        message: format!(
            "Vault creato in {}.\nObsidian si aprira' per completare l'inizializzazione.",
            vault_path
        ),
    }
}

#[tauri::command]
fn open_in_obsidian(vault_path: String) -> Result<(), String> {
    let vault_name = Path::new(&vault_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let uri = format!("obsidian://open?vault={}", urlencoding::encode(&vault_name));

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&uri)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", &uri])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&uri)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Commands: agent CRUD & editing
// ---------------------------------------------------------------------------

const CORE_AGENTS: [&str; 8] = [
    "architect", "scribe", "sorter", "seeker",
    "connector", "librarian", "transcriber", "postman",
];

#[tauri::command]
fn read_agent_markdown(vault_path: String, agent_name: String) -> Result<String, String> {
    let file = Path::new(&vault_path)
        .join(".claude")
        .join("agents")
        .join(format!("{}.md", agent_name));
    fs::read_to_string(&file).map_err(|e| format!("Errore lettura file agente: {}", e))
}

#[tauri::command]
fn save_agent_markdown(vault_path: String, agent_name: String, content: String) -> CommandResult {
    let file = Path::new(&vault_path)
        .join(".claude")
        .join("agents")
        .join(format!("{}.md", agent_name));
    match fs::write(&file, content) {
        Ok(_) => CommandResult {
            success: true,
            message: "File agente salvato con successo.".to_string(),
        },
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore salvataggio file agente: {}", e),
        },
    }
}

#[tauri::command]
fn update_agent_model(vault_path: String, agent_name: String, new_model: String) -> CommandResult {
    let file = Path::new(&vault_path)
        .join(".claude")
        .join("agents")
        .join(format!("{}.md", agent_name));

    let content = match fs::read_to_string(&file) {
        Ok(c) => c,
        Err(e) => {
            return CommandResult {
                success: false,
                message: format!("Errore lettura file agente: {}", e),
            };
        }
    };

    let mut updated = String::new();
    let mut found = false;
    for line in content.lines() {
        if line.trim_start().starts_with("model:") {
            updated.push_str(&format!("model: {}", new_model));
            found = true;
        } else {
            updated.push_str(line);
        }
        updated.push('\n');
    }

    if !found {
        return CommandResult {
            success: false,
            message: "Campo 'model:' non trovato nel frontmatter.".to_string(),
        };
    }

    match fs::write(&file, updated) {
        Ok(_) => CommandResult {
            success: true,
            message: format!("Modello aggiornato a '{}'.", new_model),
        },
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore scrittura file agente: {}", e),
        },
    }
}

#[tauri::command]
fn update_agent_tools(vault_path: String, agent_name: String, tools: Vec<String>) -> CommandResult {
    let file = Path::new(&vault_path)
        .join(".claude")
        .join("agents")
        .join(format!("{}.md", agent_name));

    let content = match fs::read_to_string(&file) {
        Ok(c) => c,
        Err(e) => {
            return CommandResult {
                success: false,
                message: format!("Errore lettura file agente: {}", e),
            };
        }
    };

    // Split into frontmatter and body
    if !content.starts_with("---") {
        return CommandResult {
            success: false,
            message: "Il file non contiene frontmatter YAML valido.".to_string(),
        };
    }

    let after_first = &content[3..];
    let end_idx = match after_first.find("---") {
        Some(i) => i,
        None => {
            return CommandResult {
                success: false,
                message: "Frontmatter YAML non chiuso correttamente.".to_string(),
            };
        }
    };

    let frontmatter = &content[3..3 + end_idx];
    let rest = &content[3 + end_idx..]; // includes closing ---

    // Rebuild frontmatter, replacing the tools section
    let mut new_fm = String::new();
    let mut in_tools = false;
    for line in frontmatter.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("tools:") {
            in_tools = true;
            new_fm.push_str("tools:\n");
            for tool in &tools {
                new_fm.push_str(&format!("  - {}\n", tool));
            }
            continue;
        }
        if in_tools {
            // Still inside the old tools list (lines starting with -)
            if trimmed.starts_with("- ") || trimmed.is_empty() {
                continue;
            }
            in_tools = false;
        }
        new_fm.push_str(line);
        new_fm.push('\n');
    }

    let updated = format!("---{}{}", new_fm, rest);

    match fs::write(&file, updated) {
        Ok(_) => CommandResult {
            success: true,
            message: "Lista tools aggiornata con successo.".to_string(),
        },
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore scrittura file agente: {}", e),
        },
    }
}

#[tauri::command]
fn create_custom_agent(
    vault_path: String,
    name: String,
    description: String,
    model: String,
    tools: Vec<String>,
) -> CommandResult {
    // Validate name: lowercase, hyphens only
    if name.is_empty()
        || !name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c == '-')
    {
        return CommandResult {
            success: false,
            message: "Il nome deve contenere solo lettere minuscole e trattini.".to_string(),
        };
    }

    if CORE_AGENTS.contains(&name.as_str()) {
        return CommandResult {
            success: false,
            message: format!(
                "'{}' e' un agente core e non puo' essere sovrascritto.",
                name
            ),
        };
    }

    let agents_dir = Path::new(&vault_path).join(".claude").join("agents");
    if !agents_dir.exists() {
        if let Err(e) = fs::create_dir_all(&agents_dir) {
            return CommandResult {
                success: false,
                message: format!("Errore creazione directory agents: {}", e),
            };
        }
    }

    let file = agents_dir.join(format!("{}.md", name));
    if file.exists() {
        return CommandResult {
            success: false,
            message: format!("Un agente con nome '{}' esiste gia'.", name),
        };
    }

    let tools_yaml = if tools.is_empty() {
        "tools: []".to_string()
    } else {
        let items: Vec<String> = tools.iter().map(|t| format!("  - {}", t)).collect();
        format!("tools:\n{}", items.join("\n"))
    };

    let template = format!(
        "---\nname: {name}\ndescription: >\n  {description}\nmodel: {model}\n{tools_yaml}\n---\n\n# {display_name}\n\nCustom agent.\n",
        name = name,
        description = description,
        model = model,
        tools_yaml = tools_yaml,
        display_name = name
            .split('-')
            .map(|w| {
                let mut c = w.chars();
                match c.next() {
                    None => String::new(),
                    Some(f) => f.to_uppercase().to_string() + c.as_str(),
                }
            })
            .collect::<Vec<_>>()
            .join(" "),
    );

    match fs::write(&file, template) {
        Ok(_) => CommandResult {
            success: true,
            message: format!("Agente '{}' creato con successo.", name),
        },
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore creazione file agente: {}", e),
        },
    }
}

#[tauri::command]
fn delete_custom_agent(vault_path: String, agent_name: String) -> CommandResult {
    if CORE_AGENTS.contains(&agent_name.as_str()) {
        return CommandResult {
            success: false,
            message: format!(
                "'{}' e' un agente core e non puo' essere eliminato.",
                agent_name
            ),
        };
    }

    let file = Path::new(&vault_path)
        .join(".claude")
        .join("agents")
        .join(format!("{}.md", agent_name));

    if !file.exists() {
        return CommandResult {
            success: false,
            message: format!("File agente '{}' non trovato.", agent_name),
        };
    }

    match fs::remove_file(&file) {
        Ok(_) => CommandResult {
            success: true,
            message: format!("Agente '{}' eliminato con successo.", agent_name),
        },
        Err(e) => CommandResult {
            success: false,
            message: format!("Errore eliminazione file agente: {}", e),
        },
    }
}

// ---------------------------------------------------------------------------
// Commands: vault statistics
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Default)]
struct VaultStats {
    total_notes: u64,
    total_folders: u64,
    total_tags: u64,
    total_internal_links: u64,
    total_words: u64,
    total_size_bytes: u64,
    unique_tags: Vec<String>,
    top_tags: Vec<TagCount>,
    recent_notes: Vec<RecentNote>,
    notes_by_depth: Vec<DepthCount>,
}

#[derive(Serialize, Deserialize, Clone)]
struct TagCount {
    tag: String,
    count: u64,
}

#[derive(Serialize, Deserialize, Clone)]
struct RecentNote {
    name: String,
    path: String,
    modified: u64, // unix timestamp
    size_bytes: u64,
}

#[derive(Serialize, Deserialize, Clone)]
struct DepthCount {
    depth: u32,
    count: u64,
}

fn count_words(text: &str) -> u64 {
    text.split_whitespace().count() as u64
}

fn extract_tags(content: &str) -> Vec<String> {
    let mut tags = Vec::new();

    // Parse YAML frontmatter tags
    if content.starts_with("---") {
        if let Some(end) = content[3..].find("---") {
            let frontmatter = &content[3..3 + end];
            let mut in_tags = false;
            for line in frontmatter.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("tags:") {
                    let val = trimmed[5..].trim();
                    // Inline array: tags: [foo, bar]
                    if val.starts_with('[') && val.ends_with(']') {
                        let inner = &val[1..val.len() - 1];
                        for t in inner.split(',') {
                            let t = t.trim().trim_matches('"').trim_matches('\'').trim_matches('#');
                            if !t.is_empty() {
                                tags.push(t.to_lowercase());
                            }
                        }
                    } else if val.is_empty() {
                        in_tags = true;
                    } else {
                        // Single value on same line
                        let t = val.trim_matches('"').trim_matches('\'').trim_matches('#');
                        if !t.is_empty() {
                            tags.push(t.to_lowercase());
                        }
                    }
                    continue;
                }
                if in_tags {
                    if trimmed.starts_with("- ") {
                        let t = trimmed[2..].trim().trim_matches('"').trim_matches('\'').trim_matches('#');
                        if !t.is_empty() {
                            tags.push(t.to_lowercase());
                        }
                    } else if !trimmed.is_empty() {
                        in_tags = false;
                    }
                }
            }
        }
    }

    // Parse inline #tags from content body
    let body = if content.starts_with("---") {
        if let Some(end) = content[3..].find("---") {
            &content[3 + end + 3..]
        } else {
            content
        }
    } else {
        content
    };

    for word in body.split_whitespace() {
        if word.starts_with('#') && word.len() > 1 {
            let tag = word.trim_start_matches('#')
                .trim_end_matches(|c: char| !c.is_alphanumeric() && c != '-' && c != '_' && c != '/');
            if !tag.is_empty() && tag.chars().next().map_or(false, |c| c.is_alphabetic()) {
                tags.push(tag.to_lowercase());
            }
        }
    }

    tags
}

fn count_internal_links(content: &str) -> u64 {
    let mut count = 0u64;
    let bytes = content.as_bytes();
    let len = bytes.len();
    let mut i = 0;
    while i + 1 < len {
        if bytes[i] == b'[' && bytes[i + 1] == b'[' {
            // Find closing ]]
            if let Some(rest) = content.get(i + 2..) {
                if rest.contains("]]") {
                    count += 1;
                }
            }
            i += 2;
        } else {
            i += 1;
        }
    }
    count
}

fn walk_vault(dir: &Path, vault_root: &Path, stats: &mut VaultStats, tag_map: &mut std::collections::HashMap<String, u64>, recent: &mut Vec<RecentNote>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden directories and files
        if name.starts_with('.') {
            continue;
        }
        // Skip the cloned repo folder
        if name == REPO_FOLDER_NAME && path.is_dir() {
            continue;
        }

        if path.is_dir() {
            stats.total_folders += 1;
            walk_vault(&path, vault_root, stats, tag_map, recent);
        } else if path.extension().map_or(false, |e| e == "md") {
            stats.total_notes += 1;

            if let Ok(content) = fs::read_to_string(&path) {
                let file_size = content.len() as u64;
                stats.total_size_bytes += file_size;
                stats.total_words += count_words(&content);
                stats.total_internal_links += count_internal_links(&content);

                let file_tags = extract_tags(&content);
                for tag in &file_tags {
                    *tag_map.entry(tag.clone()).or_insert(0) += 1;
                }

                // Track depth
                let rel = path.strip_prefix(vault_root).unwrap_or(&path);
                let depth = rel.components().count().saturating_sub(1) as u32;

                // Update depth counts
                if let Some(dc) = stats.notes_by_depth.iter_mut().find(|d| d.depth == depth) {
                    dc.count += 1;
                } else {
                    stats.notes_by_depth.push(DepthCount { depth, count: 1 });
                }

                // Track recent notes
                let modified = entry.metadata()
                    .and_then(|m| m.modified())
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                recent.push(RecentNote {
                    name: path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
                    path: rel.to_string_lossy().to_string(),
                    modified,
                    size_bytes: file_size,
                });
            }
        }
    }
}

#[tauri::command]
fn get_vault_stats(vault_path: String) -> VaultStats {
    let vault = Path::new(&vault_path);
    if !vault.exists() {
        return VaultStats::default();
    }

    let mut stats = VaultStats::default();
    let mut tag_map: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
    let mut recent: Vec<RecentNote> = Vec::new();

    walk_vault(vault, vault, &mut stats, &mut tag_map, &mut recent);

    // Build unique tags and top tags
    stats.total_tags = tag_map.len() as u64;
    let mut tag_vec: Vec<TagCount> = tag_map
        .into_iter()
        .map(|(tag, count)| TagCount { tag, count })
        .collect();
    tag_vec.sort_by(|a, b| b.count.cmp(&a.count));

    stats.unique_tags = tag_vec.iter().map(|t| t.tag.clone()).collect();
    stats.top_tags = tag_vec.into_iter().take(10).collect();

    // Sort recent notes by modified time descending, keep top 10
    recent.sort_by(|a, b| b.modified.cmp(&a.modified));
    stats.recent_notes = recent.into_iter().take(10).collect();

    // Sort depth counts
    stats.notes_by_depth.sort_by_key(|d| d.depth);

    stats
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            check_status,
            get_stored_vault_path,
            save_vault_path,
            install_git,
            install_obsidian,
            clone_repo,
            install_crew,
            list_agents,
            toggle_agent,
            create_vault,
            open_in_obsidian,
            read_agent_markdown,
            save_agent_markdown,
            update_agent_model,
            update_agent_tools,
            create_custom_agent,
            delete_custom_agent,
            get_vault_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
