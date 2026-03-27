import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export interface SystemStatus {
    git_installed: boolean
    obsidian_installed: boolean
    repo_cloned: boolean
    crew_installed: boolean
    vault_path: string | null
}

export interface AgentInfo {
    name: string
    display_name: string
    description: string
    tools: string[]
    model: string
    is_custom: boolean
    enabled: boolean
    file_path: string
}

export interface CommandResult {
    success: boolean
    message: string
}

export interface TagCount {
    tag: string
    count: number
}

export interface RecentNote {
    name: string
    path: string
    modified: number
    size_bytes: number
}

export interface DepthCount {
    depth: number
    count: number
}

export interface VaultStats {
    total_notes: number
    total_folders: number
    total_tags: number
    total_internal_links: number
    total_words: number
    total_size_bytes: number
    unique_tags: string[]
    top_tags: TagCount[]
    recent_notes: RecentNote[]
    notes_by_depth: DepthCount[]
}

/** Wait for Tauri IPC to be ready before invoking commands */
function waitForTauri(): Promise<void> {
    return new Promise((resolve) => {
        if (
            typeof window !== 'undefined' &&
            '__TAURI_INTERNALS__' in window
        ) {
            resolve()
            return
        }
        // Poll until ready (Tauri injects __TAURI_INTERNALS__ on webview init)
        const interval = setInterval(() => {
            if (
                '__TAURI_INTERNALS__' in window
            ) {
                clearInterval(interval)
                resolve()
            }
        }, 50)
    })
}

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    await waitForTauri()
    return invoke<T>(cmd, args)
}

export async function checkStatus(): Promise<SystemStatus> {
    return safeInvoke('check_status')
}

export async function installGit(): Promise<CommandResult> {
    return safeInvoke('install_git')
}

export async function installObsidian(): Promise<CommandResult> {
    return safeInvoke('install_obsidian')
}

export async function cloneRepo(vaultPath: string): Promise<CommandResult> {
    return safeInvoke('clone_repo', { vaultPath })
}

export async function installCrew(vaultPath: string): Promise<CommandResult> {
    return safeInvoke('install_crew', { vaultPath })
}

export async function selectVaultPath(): Promise<string | null> {
    await waitForTauri()
    const selected = await open({
        directory: true,
        multiple: false,
    })
    return selected as string | null
}

export async function saveVaultPath(path: string): Promise<void> {
    return safeInvoke('save_vault_path', { path })
}

export async function listAgents(vaultPath: string): Promise<AgentInfo[]> {
    return safeInvoke('list_agents', { vaultPath })
}

export async function toggleAgent(
    vaultPath: string,
    agentName: string,
    enabled: boolean
): Promise<void> {
    return safeInvoke('toggle_agent', { vaultPath, agentName, enabled })
}

export async function createVault(vaultPath: string): Promise<CommandResult> {
    return safeInvoke('create_vault', { vaultPath })
}

export async function openInObsidian(vaultPath: string): Promise<void> {
    return safeInvoke('open_in_obsidian', { vaultPath })
}

export async function getStoredVaultPath(): Promise<string | null> {
    return safeInvoke('get_stored_vault_path')
}

export async function readAgentMarkdown(
    vaultPath: string,
    agentName: string
): Promise<string> {
    return safeInvoke('read_agent_markdown', { vaultPath, agentName })
}

export async function saveAgentMarkdown(
    vaultPath: string,
    agentName: string,
    content: string
): Promise<CommandResult> {
    return safeInvoke('save_agent_markdown', { vaultPath, agentName, content })
}

export async function updateAgentModel(
    vaultPath: string,
    agentName: string,
    newModel: string
): Promise<CommandResult> {
    return safeInvoke('update_agent_model', { vaultPath, agentName, newModel })
}

export async function updateAgentTools(
    vaultPath: string,
    agentName: string,
    tools: string[]
): Promise<CommandResult> {
    return safeInvoke('update_agent_tools', { vaultPath, agentName, tools })
}

export async function createCustomAgent(
    vaultPath: string,
    name: string,
    description: string,
    model: string,
    tools: string[]
): Promise<CommandResult> {
    return safeInvoke('create_custom_agent', {
        vaultPath,
        name,
        description,
        model,
        tools,
    })
}

export async function deleteCustomAgent(
    vaultPath: string,
    agentName: string
): Promise<CommandResult> {
    return safeInvoke('delete_custom_agent', { vaultPath, agentName })
}

export async function getVaultStats(vaultPath: string): Promise<VaultStats> {
    return safeInvoke('get_vault_stats', { vaultPath })
}
