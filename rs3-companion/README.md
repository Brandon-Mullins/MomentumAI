# RS3 Companion

A **RuneLite-style companion app for RuneScape 3** with a quest helper, player quest sync, and an Alt1-inspired overlay window. This is a **manual-assist tool** — it does not automate gameplay, inject into the NXT client, or send inputs to the game.

## Features

- **Quest Helper** — step-by-step guides sourced from the [RuneScape Wiki](https://runescape.wiki/)
- **RuneMetrics sync** — import quest completion status with a display name
- **Overlay window** — always-on-top quest step panel (Alt1-style companion window)
- **Plugin slots** — architecture ready for clue solvers, XP trackers, and more
- **Offline starter guides** — bundled walkthroughs for early quests like Cook's Assistant

## Important disclaimer

RS3 does **not** officially endorse third-party tools the way OSRS endorses RuneLite. This project follows the **Alt1-style model**: external overlay + wiki/RuneMetrics data, no client modification and no automation. Use at your own risk and follow [Jagex's rules](https://www.jagex.com/en-GB/terms).

## Getting started

```bash
cd rs3-companion
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## How it works

| Layer | Purpose |
| --- | --- |
| `src/services/wiki.ts` | Pulls quest walkthrough sections from the RuneScape Wiki API |
| `src/services/runemetrics.ts` | Syncs quest completion data from Jagex RuneMetrics |
| `electron/main/index.ts` | Hosts the main window and transparent overlay window |
| `src/plugins/registry.ts` | Plugin registry modeled after RuneLite's sidebar plugins |

## Roadmap

- Screen-reading OCR hooks for quest journal detection (Alt1-style, opt-in)
- Treasure Trail / clue solver plugin
- Session XP tracker overlay
- World map arrows and tile hints for active quest steps

## Troubleshooting (Windows)

### The companion did not open

RS3 Companion is **not** part of the RS3 game client. It is a separate desktop app that only opens when you run:

```cmd
cd C:\Users\bmull\MomentumAI\rs3-companion
npm run dev
```

Keep that terminal window **open**. If it returns to `C:\...>` immediately, something failed — scroll up and read the error.

### Checklist

1. **Alt+Tab** — the window may be behind fullscreen RS3. Look for **RS3 Companion** or **Electron** in the taskbar.
2. **Terminal still running?** — `npm run dev` should keep running. Do not close the Command Prompt while using the app.
3. **Try production mode** if dev mode fails:

```cmd
npm run build
npm run preview
```

4. **Allow through Windows Defender** if Electron was blocked.
5. **Node version** — run `node -v` (need 18+).

### `Error: Electron uninstall`

Electron's app binary did not download during `npm install`. Fix it with:

```cmd
cd C:\Users\bmull\MomentumAI\rs3-companion
git pull
node node_modules\electron\install.js
npm run dev
```

You should see a large download (~100MB). After that, check these files exist:

```cmd
dir node_modules\electron\path.txt
dir node_modules\electron\dist\electron.exe
```

If install fails:

1. Check antivirus / Windows Defender did not block the download
2. Make sure this env var is **not** set: `ELECTRON_SKIP_BINARY_DOWNLOAD`
3. Clean reinstall:

```cmd
cd C:\Users\bmull\MomentumAI\rs3-companion
rmdir /s /q node_modules
npm install
node node_modules\electron\install.js
npm run dev
```

