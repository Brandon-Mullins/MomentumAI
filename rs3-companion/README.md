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

## License

MIT
