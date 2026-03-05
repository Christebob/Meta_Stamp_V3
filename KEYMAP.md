# KeyMap — Reprogrammable Keyboard for Creative Software

**Part of the Meta-Stamp / Pockets ecosystem.**

KeyMap solves the muscle-memory problem for creative professionals who switch between different software. It maps the keyboard shortcuts from one professional application onto another — so a Pro Tools engineer opening Final Cut Pro for the first time can use their existing muscle memory immediately.

---

## What It Does

| Problem | Solution |
|---|---|
| Pro Tools engineer opens Final Cut Pro — nothing works | KeyMap maps Pro Tools shortcuts onto FCP |
| Logic Pro musician switches to Premiere for a video project | KeyMap generates a Karabiner rule in one click |
| CapCut editor tries DaVinci Resolve | KeyMap shows a coverage heatmap and fills gaps with AI |
| Studio switching from Mac to Windows | KeyMap exports AutoHotkey scripts for every app |

---

## Architecture

```
Meta-Stamp V3
├── backend/app/
│   ├── services/keymap/
│   │   ├── shortcut_db.py       ← 179 shortcuts across 6 apps
│   │   ├── export_engine.py     ← 5 export formats
│   │   └── codex_prompts.py     ← AI gap-filling + workflow guides
│   ├── api/v1/keymap/
│   │   ├── routes.py            ← 7 REST endpoints
│   │   └── ai_routes.py         ← 5 Codex-powered AI endpoints
│   └── mcp/
│       └── keymap_tools.py      ← 5 MCP tools for AI agents
└── frontend/src/
    ├── pages/KeyMap/            ← Main UI page
    ├── components/keymap/       ← 5 React components
    ├── services/keymap/         ← API client
    └── types/keymap/            ← TypeScript types
```

---

## Supported Apps

| App | Type | Mac | Windows | Shortcuts |
|---|---|---|---|---|
| Pro Tools | DAW | ✅ | ✅ | 35 |
| Final Cut Pro | NLE | ✅ | — | 40 |
| CapCut | NLE | ✅ | ✅ | 19 |
| Adobe Premiere Pro | NLE | ✅ | ✅ | 29 |
| Logic Pro X | DAW | ✅ | — | 28 |
| DaVinci Resolve | NLE/Color | ✅ | ✅ | 28 |

**Total: 179 shortcuts across 6 apps, 7 categories.**

---

## Coverage Matrix

| Source → Target | Coverage |
|---|---|
| Pro Tools → Final Cut Pro | 74% |
| Pro Tools → CapCut | 43% |
| Logic Pro → Premiere Pro | 86% |
| Pro Tools → DaVinci Resolve | 77% |

---

## API Reference

### Core Endpoints

```
GET  /api/v1/keymap/health                     Health check
GET  /api/v1/keymap/apps                       List all supported apps
GET  /api/v1/keymap/apps/{app_id}/shortcuts    Get shortcuts for an app
GET  /api/v1/keymap/apps/{app_id}/categories   Get categories for an app
POST /api/v1/keymap/map                        Map shortcuts between apps
POST /api/v1/keymap/export                     Download remapping script
GET  /api/v1/keymap/export/formats             List export formats
```

### AI Endpoints (Codex-powered)

```
POST /api/v1/keymap/ai/explain        Explain a shortcut in plain language
POST /api/v1/keymap/ai/fill-gaps      AI suggestions for unmapped shortcuts
POST /api/v1/keymap/ai/custom-app     Generate shortcuts for any unlisted app
POST /api/v1/keymap/ai/transition     Workflow transition guide
POST /api/v1/keymap/ai/stream-deck    Optimal Stream Deck layout
```

### Example: Map Pro Tools → Final Cut Pro

```bash
curl -X POST http://localhost:8000/api/v1/keymap/map \
  -H "Content-Type: application/json" \
  -d '{
    "source_app": "pro_tools",
    "target_app": "final_cut_pro",
    "platform": "mac"
  }'
```

### Example: Download Karabiner JSON

```bash
curl -X POST http://localhost:8000/api/v1/keymap/export \
  -H "Content-Type: application/json" \
  -d '{
    "source_app": "pro_tools",
    "target_app": "final_cut_pro",
    "platform": "mac",
    "format": "karabiner"
  }' \
  --output keymap-pro-tools-to-final-cut-pro.json
```

---

## Export Formats

| Format | Platform | File | Use Case |
|---|---|---|---|
| `karabiner` | Mac | `.json` | Low-level key remapping via Karabiner-Elements |
| `keyboard_maestro` | Mac | `.kmmacros` | Macro engine with app-specific scoping |
| `autohotkey` | Windows | `.ahk` | Background script, app-specific hotkeys |
| `stream_deck` | Mac + Win | `.streamDeckProfile` | Hardware button layout |
| `markdown` | Both | `.md` | Printable reference table |

---

## MCP Tools (for AI Agents)

KeyMap is fully accessible to AI agents via the Meta-Stamp MCP server:

```json
{
  "jsonrpc": "2.0",
  "method": "keymap_map_shortcuts",
  "params": {
    "source_app": "pro_tools",
    "target_app": "final_cut_pro",
    "platform": "mac"
  },
  "id": 1
}
```

Available MCP tools:
- `keymap_list_apps` — discover all supported apps
- `keymap_map_shortcuts` — map shortcuts between apps
- `keymap_export` — generate remapping scripts
- `keymap_get_shortcuts` — get all shortcuts for an app
- `keymap_search_action` — find which shortcut performs an action

---

## Frontend Components

| Component | Purpose |
|---|---|
| `KeyMapPage` | Main page — orchestrates all state |
| `AppSelector` | Grid of app cards with icon + type |
| `KeyboardVisualizer` | QWERTY heatmap — coloured by category |
| `MappingTable` | Sortable table with `<kbd>` badges |
| `CoverageBar` | Coverage percentage with colour coding |
| `ExportPanel` | Format picker + download + install guide |

---

## Adding a New App

1. Add shortcuts to `SHORTCUT_DB` in `shortcut_db.py` — use existing `action_id` values for cross-app mapping
2. Add metadata to `APP_METADATA`
3. Add the bundle ID to the export engine maps in `export_engine.py`
4. The API, MCP tools, and UI all update automatically

---

## Codex Integration

KeyMap uses OpenAI's API (gpt-4.1-mini) for:

- **Gap filling**: When no direct mapping exists, AI suggests the closest equivalent
- **Custom apps**: Generate a full shortcut database for any app not in our list
- **Workflow guides**: 2-week transition plans for switching between apps
- **Stream Deck layouts**: AI-designed hardware button layouts per app + role

All prompts are in `codex_prompts.py` — fully editable and extensible.

---

## Deployment

KeyMap is a zero-dependency module — no database, no Redis, no auth required.
It works standalone or as part of the full Meta-Stamp stack.

```bash
# Standalone (no MongoDB/Redis needed)
cd backend
pip install fastapi uvicorn openai
uvicorn app.main:app --reload

# Full stack
docker-compose up
```

---

## Roadmap

- [ ] User-saved custom profiles (MongoDB)
- [ ] Community shortcut submissions
- [ ] Ableton Live, FL Studio, Avid Media Composer
- [ ] Physical keyboard firmware export (QMK/ZMK)
- [ ] Browser extension for web-based DAWs (Soundtrap, BandLab)
- [ ] iOS/Android companion app
- [ ] Pocket integration — index shortcut profiles as licensable content
