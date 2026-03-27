# My Brain Is Full Crew

A desktop application built with **Tauri + React** to install, configure, and manage the [My Brain Is Full Crew](https://github.com/gnekt/My-Brain-Is-Full-Crew), a system of 8 AI agents that organize your Obsidian vault using Claude.

Created by **@gnekt** (Christian Di Maio).

---

## Screenshots

| Dashboard | Installation |
|:---------:|:------------:|
| ![Dashboard](screenshots/dashboard.png) | ![Setup](screenshots/setup.png) |

| Agents | Settings |
|:------:|:--------:|
| ![Agents](screenshots/agents.png) | ![Settings](screenshots/settings.png) |

---

## Features

- **One-click installation**: Git, Obsidian, and the agent crew are installed directly from bundled installers (no browser downloads)
- **Cross-platform**: macOS, Windows, and Linux support with platform-specific installers
- **Vault creation**: creates the `.obsidian` directory structure and opens Obsidian for full initialization
- **Agent management**: view, enable/disable, and configure all 8 core agents + any custom agents
- **Model & tools editing**: change the AI model (Opus/Sonnet/Haiku) and toggle tools/permissions per agent
- **Raw markdown editing**: view and edit agent `.md` definition files directly, with save functionality
- **Dark / Light theme**: toggle between themes, persisted across sessions
- **Search & filters**: find agents by name/description, filter by Core/Custom/Active/Inactive

## The 8 Core Agents

| Agent | Role |
|-------|------|
| **Architect** | Designs the vault structure and organization |
| **Scribe** | Writes and formats notes |
| **Sorter** | Categorizes and organizes existing content |
| **Seeker** | Searches and retrieves information |
| **Connector** | Links related notes and concepts |
| **Librarian** | Maintains indexes and references |
| **Transcriber** | Transcribes and processes media |
| **Postman** | Handles imports and exports |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (latest stable)
- Tauri CLI: `cargo install tauri-cli`

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/gnekt/My-Brain-Is-Full-Crew-UI.git
   cd My-Brain-Is-Full-Crew-UI
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Add platform installers** (for bundled installation)

   Place the following files in `src-tauri/resources/`:

   | File | Platform |
   |------|----------|
   | `Obsidian.dmg` | macOS |
   | `Obsidian-Setup.exe` | Windows |
   | `Obsidian.AppImage` | Linux |
   | `Git-Installer.exe` | Windows |

   > On macOS, Git is installed via `xcode-select --install`.
   > On Linux, Git is installed via the system package manager.

4. **Run in development**

   ```bash
   npm run tauri dev
   ```

5. **Build for production**

   ```bash
   npm run tauri build
   ```

   The output bundle will be in `src-tauri/target/release/bundle/`.

---

## Tutorial: First-Time Setup

### Step 1: Install Git

Open the app and go to the **Installazione** page. Click **Installa Git**.

- **macOS**: Triggers `xcode-select --install` (Apple's Command Line Tools)
- **Windows**: Runs the bundled `Git-Installer.exe` silently
- **Linux**: Installs via `apt`, `dnf`, or `pacman` depending on your distro

![Step 1 - Git](screenshots/setup.png)

### Step 2: Install Obsidian & Select Vault

Click **Installa Obsidian**. The app installs Obsidian from the bundled installer:

- **macOS**: Mounts the DMG and copies `Obsidian.app` to `/Applications`
- **Windows**: Runs the NSIS installer silently
- **Linux**: Copies the AppImage to `~/Applications` and creates a `.desktop` entry

After installation, you'll be prompted to **select your vault folder**. The app will:
1. Create the `.obsidian/` directory with base configuration files
2. Open Obsidian pointing to that folder so it completes initialization

### Step 3: Clone the Repository

Click **Clona Repo**. This clones the [My-Brain-Is-Full-Crew](https://github.com/gnekt/My-Brain-Is-Full-Crew) repository into your vault folder.

If the repo already exists, it will run `git pull` to update.

### Step 4: Install the Crew

Click **Installa Crew**. This copies into your vault:

- 8 agent definition files (`.claude/agents/*.md`)
- Reference documents (`.claude/references/`)
- Skills (`.claude/skills/`)
- `CLAUDE.md` configuration
- `.mcp.json` MCP server config

You're ready! Open your vault in Claude Code and say **"Inizializza il mio vault"** to start.

---

## Tutorial: Managing Agents

### Viewing Agents

Go to the **Agenti** page. All installed agents are displayed as cards with:
- Agent name and description
- Current AI model (Opus / Sonnet / Haiku)
- Enable/disable toggle
- Tool count

Use the **search bar** to find agents by name or description, and **filter chips** to show only Core, Custom, Active, or Inactive agents.

### Configuring an Agent

Click on any agent card to open the **detail drawer** with three tabs:

#### Panoramica (Overview)
- Agent description, status, name, model, type
- Full list of assigned tools
- File path to the agent definition

#### Configura (Configure)
- **Model selector**: click on Opus, Sonnet, or Haiku to change the AI model
- **Tools & Permissions**: check/uncheck tools (Read, Edit, Write, Bash, Glob, Grep, WebSearch, WebFetch, etc.)
- **Enable/Disable** toggle

#### Markdown
- View and edit the raw `.md` agent definition file
- Includes YAML frontmatter (name, description, model, tools) and the agent's system prompt
- **Warning**: Errors in the YAML frontmatter can break the agent
- Click **Salva** to save changes

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Tauri v2](https://tauri.app/) |
| Frontend | [React 19](https://react.dev/) + [Vite 7](https://vite.dev/) |
| UI Library | [Material UI (MUI)](https://mui.com/) |
| Backend | Rust |
| Styling | MUI Theme (dark/light) with custom tokens |

---

## Project Structure

```
My-Brain-Is-Full-Crew-UI/
├── src/                          # React frontend
│   ├── app/
│   │   ├── routes/
│   │   │   ├── dashboard.tsx     # Dashboard page
│   │   │   ├── setup.tsx         # Installation wizard
│   │   │   ├── agents.tsx        # Agent management
│   │   │   └── settings.tsx      # App settings
│   │   ├── router.tsx            # React Router config
│   │   └── provider.tsx          # Theme provider
│   ├── components/
│   │   └── layout/
│   │       ├── Sidebar.tsx       # Navigation sidebar
│   │       └── MainLayout.tsx    # App layout
│   ├── hooks/
│   │   └── useTauriCommands.ts   # Tauri IPC wrappers
│   └── theme/
│       ├── index.ts              # MUI theme definitions
│       └── ThemeContext.tsx       # Theme state management
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   └── main.rs              # All Tauri commands
│   ├── resources/               # Bundled installers
│   │   ├── Obsidian.dmg
│   │   ├── Obsidian-Setup.exe
│   │   ├── Obsidian.AppImage
│   │   └── Git-Installer.exe
│   └── tauri.conf.json          # Tauri configuration
└── screenshots/                  # README screenshots
```

---

## License

MIT
