**English · [简体中文](README.zh-CN.md)**

# Oh-My-Mindmap-Studio

### An Obsidian mind map plugin for your Markdown notes

Open notes as editable mind maps, organize ideas by dragging branches, and keep everything in your local Obsidian vault.

[![Release](https://img.shields.io/github/v/release/volmodaoist/Obsidian-Mindmap-Studio?label=release)](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/releases) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![Obsidian 1.13.0+](https://img.shields.io/badge/Obsidian-1.13.0%2B-7c3aed)](https://obsidian.md)

![Open a Markdown note as an Obsidian mind map, edit a topic, add a branch and drag it into a new hierarchy](assets/demos/edit-and-organize.gif)

[Install](#install) · [Quick start](#quick-start) · [Demos](#demos) · [User guide](docs/user-guide.md) · [Changelog](CHANGELOG)

## What you can do

- **Edit on the map.** Create topics, rearrange branches, collapse sections, and undo changes.
- **Connect your notes.** Complete `[[wikilinks]]`, follow links and preview linked notes.
- **Keep rich content.** Display tasks, callouts, tables, math, Mermaid diagrams and supported plugin blocks.
- **Navigate comfortably.** Use six layouts, search, zoom and the sidebar minimap.
- **Share your work.** Export PNG or SVG while the source stays Markdown.

## Install

Requires **Obsidian 1.13.0 or later** on desktop: macOS, Windows or Linux.

1. Download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/releases).
2. Copy them into `<vault>/.obsidian/plugins/mindmap-studio/`.
3. Restart Obsidian and enable **Oh-My-Mindmap-Studio** in **Settings → Community plugins**.

For a local build:

```bash
npm install
make install vault="/path/to/your/vault"
```

`make install` uses the default vault configured in the Makefile. The installer backs up existing files and preserves plugin settings. Run `make help` for development commands.

## Quick start

**Open an existing note:** click **Open as mind map** in the note header, or use its context menu or command palette. Opening a regular `.md` note adds no properties; editing a topic saves the Markdown body.

**Create a dedicated map:** run **Create new mind map**, choose a name, then select the center and press `Tab` for your first branch. Dedicated maps use `.mindmap.md` and include the mind-map properties.

For example, `Project.mindmap.md` can contain:

```markdown
---
Mindmap: Mindmap
Mindmap Layout: logical
---

# Goals
- Build a prototype
- Collect feedback

# References
- [[Design notes]]
```

The center is **Project**, from the filename; `# Goals` and `# References` are its branches. Renaming the center of a dedicated map renames the file. A dedicated map opens automatically when both its suffix and enabled property are present.

| Action                             | Shortcut                                  |
| ---------------------------------- | ----------------------------------------- |
| Edit a selected topic              | Double-click or `F2`                    |
| Add a child / sibling              | `Tab` / `Enter`, outside text editing |
| Confirm / add a line while editing | `Enter` / `Shift+Enter`               |
| Find a topic                       | `Cmd/Ctrl+F`                            |
| Undo / redo                        | `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z`     |

Dragging empty canvas pans by default; `Cmd` on macOS or `Ctrl` on Windows + drag selects. The **Drag with a hotkey** setting swaps these gestures. While suggestions are open, `Enter`/`Tab` selects a link and `Esc` closes suggestions first.

## Demos

### Wikilinks, right where you write

Type `[[` to find notes and aliases. Use `[[Note#` for headings and `[[Note#^` for block references. Suggestions work in topics and supported Beyond-CodeTab Markdown editors.

<details>
<summary>Watch the wikilink demo</summary>
<img src="assets/demos/wikilink-completion.gif" alt="Complete an Obsidian wikilink in a mind map topic and open the linked Markdown note" loading="lazy">
</details>

### Content that belongs with the idea

Tasks, Markdown formatting and Mermaid diagrams render inside topics. Enable **Beyond-CodeTab** for interactive code tabs or **TikZJax** for LaTeX diagrams. Topic sizes follow the displayed content.

<details>
<summary>Watch the rich-content demo</summary>
<img src="assets/demos/rich-content.gif" alt="Toggle a Markdown task and switch Beyond-CodeTab code tabs inside an Obsidian mind map node" loading="lazy">
</details>

### Stay oriented as your map grows

Search jumps to a matching topic. The right sidebar minimap shows the whole map and lets you navigate the canvas; the toolbar provides zoom and fit controls.

<details>
<summary>Watch the minimap demo</summary>
<img src="assets/demos/minimap-navigation.gif" alt="Zoom an Obsidian mind map and navigate its canvas with the sidebar minimap" loading="lazy">
</details>

## Guides and community

- [User guide](docs/user-guide.md): editing, layouts, rich content, export and common questions.
- [Markdown reference](docs/markdown-mindmap-standard.md): the complete file and syntax contract.
- [Plugin content integration](docs/plugin-content-rendering.md): renderer support and host APIs.
- [Release notes](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/releases) · [Report a bug or suggest a feature](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/issues).
- Community topics: [Obsidian](https://github.com/topics/obsidian) · [mindmap](https://github.com/topics/mindmap) · [Markdown](https://github.com/topics/markdown) · [PKM](https://github.com/topics/pkm) · [local-first](https://github.com/topics/local-first).
- [Community tags and suggested repository topics](docs/community.md): `#Obsidian` · `#MindMap` · `#Markdown` · `#PKM` · `#LocalFirst`.

**Find this project:** Obsidian mind map plugin · Markdown mindmap editor · wikilinks · personal knowledge management · Mermaid · TikZJax · Beyond-CodeTab.

## Development and license

Use `make dev` for build watching, `make test` for tests and `make check` for the project gates. See [development workflow](.agents/process.md) for contribution and release details.

Maintained by [volmodaoist](https://github.com/volmodaoist), forked from [WinterMosquito&#39;s MindMap Studio](https://github.com/WinterMosquito/Obsidian-Mindmap-Studio). Licensed under [MIT](LICENSE); bundled dependencies include [simple-mind-map](https://github.com/wanglin2/mind-map) and [Pele](https://github.com/obsidianmd/pele). See [third-party notices](vendor/THIRD-PARTY-NOTICES.md).
