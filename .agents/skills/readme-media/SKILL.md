---
name: readme-media
description: Refine this Obsidian plugin's bilingual README, record real UI demos, generate optimized GIF assets with Python and build a local preview. Use for README 文档工程、录屏、GIF 演示资产、本地文档预览、社区标签和检索优化; this is a repository-local workflow.
---

# README Media

## Deliverables

- Keep README focused on the product, installation, quick start and demos; move details to the bilingual user guides.
- Capture real Obsidian interactions in an isolated temporary vault using public sample notes.
- Store finished GIFs and metadata in `assets/demos/`; keep raw frames and HTML preview outside the repository.
- Preserve the user's instruction about committing and publishing. For local review, leave changes uncommitted and provide the preview URL.

## Preparation

- Inspect `git status`, current README images, the exact relevant UI code and installed plugin versions.
- Use Node 20+, the repository's npm dependencies and a local Obsidian desktop application.
- Read `scripts/record-demos.mjs` only to change example content or selectors. It reuses `scripts/obsidian-host.mjs` from the repository root.
- Use the input driver requested by the user. The included recorder uses Obsidian UI actions through Playwright/CDP; setup may create demo files and set language, but recorded interactions use clicks, keys and drags.
- Install Python image/Markdown dependencies in the project's ignored venv:

```bash
python3 -m venv .venv-docs
.venv-docs/bin/python -m pip install -r config/docs-requirements.txt
```

## Record

Run from the repository root after `npm run build`:

```bash
CODE_TAB_PLUGIN="/path/to/vault/.obsidian/plugins/obsidian-code-tab" \
  node docs/agents/skills/readme-media/scripts/record-demos.mjs \
  --output /tmp/mindmap-readme-recordings
```

- Use `--only` with `edit-and-organize`, `wikilink-completion`, `rich-content` or `minimap-navigation` to record one scene.
- Inspect the screenshot and actual saved Markdown after failures; correct the target or timing before publishing a scene.
- On macOS, activate the temporary application as well as its window and verify native window focus before global shortcuts; renderer focus alone does not prove the application is active.
- Record the navigation scene with exposed sidebar and toolbar controls. Label only the actions actually captured.
- After preparing the demo sidebar through the Workspace API, trigger `layout-change` and verify the actual minimap image is mounted before capture. Record the hero with a map visible in the first frame and fit again after dragging.
- Preserve the scene's action outcome checks. Only a successful capture may set `complete: true` in its frame manifest.
- Keep the temporary app visible. Close only the process started by the recorder; retain the user's daily vault and settings.

## Encode GIFs

```bash
.venv-docs/bin/python \
  docs/agents/skills/readme-media/scripts/build-gifs.py \
  /tmp/mindmap-readme-recordings assets/demos --width 1040 --fps 7
```

- Reject incomplete captures. Inspect first, middle and final GIF frames for text readability, palette changes and artifacts.
- Pass a recording collection or a single scene directory directly to the encoder.
- Use a shared palette and combine identical frames. Keep pauses long enough to read, with a short action caption outside the UI.
- Keep dark text shades in the palette and report duration decoded from the output GIF, separately from capture duration. Fit the map after a structural drag so the final result is fully visible.
- Inspect dimensions, duration, frame counts and bytes in `assets/demos/manifest.json`; aim for clips below 2 MB each.
- Reuse the same recordings across languages and localize the Markdown alt text.

## Edit and preview documentation

- Keep `README.md` and `README.zh-CN.md` parallel in structure and claims; verify suffix, center/filename behavior, saving and optional plugin requirements from source.
- Use concrete search phrases: **Obsidian mind map plugin**, **Markdown mindmap editor**, **Obsidian 思维导图插件**, **双链补全**.
- Describe the recorded action in GIF filenames and alt text. Put community links and hashtags in a short section; list proposed GitHub repository Topics separately in `docs/community.md`.
- Keep upstream attribution and license links. Update `docs/agents/index.md` when files move or documents are added.

```bash
.venv-docs/bin/python docs/agents/skills/readme-media/scripts/preview.py
python3 -m http.server 18763 --bind 127.0.0.1 --directory /tmp/mindmap-readme-preview
```

- Check relative links, anchors and GIF loading in both pages, including a narrow viewport.
- Run `npm run check:gates` for the changed-file scope and report the actual result.
- Validate bundled tools with `node --check`, Python syntax checks and actual tool execution. Plugin runtime lint excludes skill scripts just as it excludes `scripts/`.
- Deliver local preview links, document size reduction, GIF metadata and any remaining review items.
