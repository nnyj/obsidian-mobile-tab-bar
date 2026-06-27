Obsidian plugin: mobile-only tab bar replacing title bar

Build:
- `npm run build` → tsc check + esbuild → `main.js`
- `npm run lint` → eslint with `eslint-plugin-obsidianmd`
- copy `main.js`, `styles.css`, `manifest.json` to vault `.obsidian/plugins/mobile-tab-bar/`
- bump version: `npm version patch`

Obsidian API:
- use `window.setTimeout`/`window.clearTimeout`, not bare globals
- use `activeDocument` not `document` (popout window compat)
- use `getActiveViewOfType(MarkdownView)` not deprecated `activeLeaf`
- avoid `any`, cast through `unknown` with typed interface
- `!important` in CSS is acceptable when overriding Obsidian host styles

Release:
- tag push triggers `.github/workflows/release.yml` → draft GitHub release
- publish draft manually, add release notes
- submit to community via community.obsidian.md dashboard (manual)

Optional dep:
- save dot integrates with `autosave-control` plugin via `.save-status-icon` DOM class
- dot hidden until autosave-control state is known
