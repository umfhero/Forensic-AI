# forensic-ai desktop

Cross-platform Electron application that wraps the Forensic-AI MCP server in a dense, utility-first investigation dashboard.

Runs on Windows, macOS, and Linux (including the SANS SIFT Workstation VM used for the hackathon).

## Design

The UI follows strict design rules defined in the root [`Designrules.md`](../Designrules.md):

- Geometric grotesque sans-serif (Inter / Helvetica Neue fallback) + JetBrains Mono
- No gradients, no glassmorphism, no glows
- Flat surfaces separated by 1px borders and distinct background shades
- Thin-stroke (1.25) non-filled SVG icons — no emojis anywhere in the UI
- Muted monochrome palette with purposeful status accents (sage / ochre / clay) for CONFIRMED / INFERRED / UNCERTAIN confidence tags
- Dense grid layout, mathematical type scale, sharp edges

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Electron renderer (React + Vite + xterm.js)        │
│  - Three-pane dashboard (sidebar / main / inspector)│
│  - Phase indicator · findings list · report view   │
└──────────────▲──────────────────────────────────────┘
               │  contextBridge IPC (preload.ts)
┌──────────────┴──────────────────────────────────────┐
│  Electron main process (Node)                       │
│  - McpBridge: spawns mcp-server via stdio           │
│  - Forwards stderr diagnostics to the UI            │
└──────────────▲──────────────────────────────────────┘
               │  @modelcontextprotocol/sdk (stdio)
┌──────────────┴──────────────────────────────────────┐
│  ../mcp-server (TypeScript MCP server)              │
│  - vol_pslist · vol_netscan · build_supertimeline   │
└─────────────────────────────────────────────────────┘
```

The renderer never talks to the MCP server directly. All tool calls go through IPC → `McpBridge` → stdio. That keeps Node APIs off the renderer and preserves the context-isolated preload surface.

## Project structure

```
desktop/
├── electron/
│   ├── main.ts          # BrowserWindow + IPC handlers
│   ├── preload.ts       # contextBridge surface (window.forensicAI)
│   ├── mcpBridge.ts     # Spawns + talks to ../mcp-server
│   └── tsconfig.json    # Node ESM build config
├── src/
│   ├── main.tsx         # Renderer entry
│   ├── App.tsx          # Three-pane layout
│   ├── components/
│   │   ├── TerminalView.tsx
│   │   ├── PhaseIndicator.tsx
│   │   ├── FindingsList.tsx
│   │   ├── ReportView.tsx
│   │   └── icons.tsx    # Thin-stroke SVG set
│   ├── lib/state.ts     # Finding / Phase types
│   ├── styles/
│   │   ├── tokens.css   # Design tokens from Designrules.md
│   │   └── app.css      # Layout + component styles
│   └── types/preload.d.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Quick start

```powershell
cd desktop
npm install

# Dev: runs vite + electron concurrently, with MCP server launchable from the UI
npm run dev
```

The app boots with the MCP server idle. Click **start (mock)** in the sidebar to spawn `mcp-server` in `MOCK_MODE=1`, then click **list tools** to enumerate the three forensic tools. Clicking a tool invokes it and appends a finding to the dashboard.

## Build

```powershell
npm run build     # Compiles renderer + electron, emits ./dist and ./dist-electron
npm start         # Launches the packaged app
```

## Current scope

This scaffold ships the UI shell, design system, xterm terminal, MCP bridge, and live tool invocation against the mock server. Still to come:

- Wire the embedded terminal to a real AI agent session (routing commands through Claude Code or the MCP server)
- Confidence tagging driven by skill-file output rather than hard-coded `"inferred"`
- Phase progression driven by the triage loop (Phases 1 → 5)
- Packaging (`electron-builder`) for Linux AppImage / macOS DMG / Windows installer
