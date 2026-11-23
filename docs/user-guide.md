# 使用指南

[返回 README](../README.zh-CN.md) · [English](user-guide.md)

## 选择打开方式

- **已有 Markdown 笔记：** 使用标题栏「以思维导图打开」、右键菜单或命令面板。
  - 打开和返回不修改属性。
  - 编辑节点会保存 Markdown 正文。
  - 布局与外观选择保留在临时视图里；普通笔记通常仍以 Markdown 重开。
- **专用导图：** 使用「新建思维导图」，或右键文件夹选择同一操作。
  - 在弹窗确认名称，创建 `名称.mindmap.md`。
  - 新图只有中心节点；选中它，按 `Tab` 添加第一个分支。
  - 专用后缀和启用的 `Mindmap` 属性使它默认以导图打开。

## 理解层级

- 中心来自文件名，没有对应的 Markdown 正文行。
- `#` 到 `######` 是中心下面的 1–6 级节点。
- 嵌套列表表示子分支，也允许更深层级。
- 段落、代码块等内容归属周围的大纲结构。
- 修改专用导图的中心会通过 Obsidian 重命名文件；想使用独立的内容标题，可以放在中心下面的第一个标题节点。

标题、列表混排及精确回写规则见 [Markdown 格式参考](markdown-mindmap-standard.md)。

## 编辑与整理节点

| 目标           | 操作                                            |
| -------------- | ----------------------------------------------- |
| 编辑节点       | 双击、选中后 `F2`，或节点菜单「编辑文本」     |
| 添加子节点     | 选中节点，按 `Tab`                            |
| 添加同级节点   | 非文本编辑状态按 `Enter`，或使用节点菜单      |
| 确认文本       | `Enter`；`Shift+Enter` 换行                 |
| 结束编辑       | 点击外部或按 `Esc`；内联编辑会保留输入        |
| 精细修改长文本 | 使用「在弹窗中编辑」；这里的 `Esc` 是取消     |
| 改变父节点     | 拖到目标附近，松手后吸附或调整顺序              |
| 删除           | 选中后 `Delete`/`Backspace`，或使用节点菜单 |
| 同级换序       | 节点菜单「上移节点 / 下移节点」                 |

- 拖拽未命中结构目标时回到布局位置，不保存自由坐标。
- 空白画布连续点击不会新建节点。
- 需要明确重置时，在命令面板或画布菜单使用「整理思维导图」。
- 双链候选打开时，`Enter`/`Tab` 选择结果，`Esc` 先关闭候选。

## 用双链连接笔记

- `[[` 搜索笔记和别名。
- `[[笔记#` 搜索标题，`[[笔记#^` 搜索块引用。
- `[[笔记|显示名]]` 显示别名；内联编辑器仍可以编辑 Markdown 原文。
- 点击打开链接，`Cmd/Ctrl` 加点击或中键点击打开新标签。
- 悬停链接文字使用 Obsidian 页面预览；是否显示遵循 Obsidian 设置。
- 「添加链接」可以选择库中文件或粘贴 URL。
  - 完全空白的节点可以直接成为链接。
  - 已有内容的节点会保留内容，并添加一个链接子节点。
- 节点复制、剪切、粘贴使用系统剪贴板中的 Markdown 大纲，可以和文本编辑器互相交换。

## 使用丰富内容

### Markdown、任务与标签

- 节点内支持粗体、斜体、行内代码、高亮与删除线。
- 任务复选框可以直接点击切换，标签可以打开 Obsidian 标签搜索。
- 支持表格、引用、callout 和脚注；脚注提供悬停预览与跳转。
- 将内容放在对应标题或列表项下面，保持正确的分支归属。

### 公式与绘图

- `$…$` 和 `$$…$$` 使用 MathJax 显示公式。
- `mermaid` 代码块显示为图表，也可以复制源码。
- 启用 **TikZJax** 后，`tikz` 代码块可以显示 LaTeX 绘图。
- 异步渲染完成后，节点会重新适应内容尺寸。

### Beyond-CodeTab

- 安装并启用提供公开渲染 API 的 Beyond-CodeTab 版本。
- 标签中包含普通三反引号代码块时，外层 `tab` 使用四个反引号：

`````markdown
````tab
tab: JavaScript
```js
console.log("Hello");
```
tab: 笔记
参考 [[设计笔记]]。
````
`````

- 导图中保留标签切换、支持的内联编辑和标签管理。
- 代码与 Markdown 标签都经导图保存和撤销；Markdown 标签支持双链补全。
- 节点宽度跟随活动页内容，手动设置的宽度优先。
- CodeTab 编辑器中 `Cmd/Ctrl+Enter` 保存，`Esc` 取消；候选打开时 `Esc` 先关闭候选。

接口要求与渲染边界见[插件内容集成](plugin-content-rendering.md)。

### 图片与附件

- 使用「添加图片」、剪贴板粘贴或文件拖拽添加图片。
- 悬停图片可以调整尺寸，点击可以进入全屏查看。
- 库内文件可以拖进导图；添加链接子节点时保留原节点内容。
- PDF 等非图片附件显示为可点击引用，节点内不嵌入整套文档查看器。
- 系统文件拖入使用附件流程；修饰键插入绝对路径的规则见 [Markdown 格式参考](markdown-mindmap-standard.md)。

## 导航与外观

- **画布：** 默认拖拽平移；macOS `Cmd` / Windows `Ctrl` 加拖拽框选。「基于热键拖拽」交换两种手势。
- **搜索：** `Cmd/Ctrl+F` 后输入节点名称，`Enter`/`Shift+Enter` 遍历结果。
- **缩略图：** 打开右侧栏查看整图并导航；独立窗口保留自己的浮动缩略图。
- **工具栏：** 返回 Markdown、导出、边框/连线样式、缩放、总览、撤销和重做。
- **画布菜单：** 选择布局、配色和层级语法；布局包括逻辑结构、思维导图、组织结构、目录组织、时间线和鱼骨图。
- **每图状态：** 专用图的布局写在 frontmatter，外观和视口偏好保存在插件数据；普通笔记的临时视图选择留在内存。
- **联系与概要：** 从节点菜单进入，按提示选择目标或端点；这些改动也进入同一撤销时间线。

## 嵌入与导出

- 普通笔记中使用 `mindmap` 围栏，显示只读导图。
  - 块体仍然使用标题和列表大纲。
  - 按笔记可用宽度适应大小，链接仍可点击。
  - 只读插件内容关闭编辑和标签管理。
- 在设置中选择 **PNG** 或 **SVG**，再使用工具栏或「导出图片」命令。
- 插件内容导出当前展示页的静态结果。

## 常见问题

- **为什么不自动打开？** 检查 `.mindmap.md` 后缀和 `Mindmap: Mindmap`；普通 `.md` 仍可从标题栏临时打开。
- **为什么改中心会改文件名？** 中心是文件的虚拟根节点；独立内容标题可以放在第一个标题节点。
- **为什么插件块变成源码？** 检查对应渲染插件是否安装、启用；Beyond-CodeTab 需要公开渲染 API，未支持的块使用普通代码显示。
- **整理按钮在哪？** 在画布菜单和命令面板；日常拖拽已自动返回结构布局。
- **怎么交换平移和框选？** 调整设置中的「基于热键拖拽」。
- **更新后怎么还是旧效果？** 替换插件文件后完整重启 Obsidian。

反馈时可以在 [Issue](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/issues) 中提供 Obsidian 版本、插件版本和一段最小 Markdown 示例。



# User guide

[Back to README](../README.md) · [简体中文](user-guide.zh-CN.md)

## Choose how to open a note

- **Existing Markdown:** use the header's **Open as mind map** action, the context menu or command palette.
  - Opening and returning leave the properties alone.
  - Editing a topic saves the Markdown body.
  - Layout and appearance choices remain in the temporary view; the note normally reopens as Markdown.
- **Dedicated mind map:** run **Create new mind map** or right-click a folder and choose the same action.
  - Confirm a name in the dialog; the result is `name.mindmap.md`.
  - A new map starts with the center only. Select it and press `Tab` for a branch.
  - Its enabled `Mindmap` property and `.mindmap.md` suffix make it open as a map automatically.

## Understand the hierarchy

- The center comes from the filename and has no corresponding Markdown line.
- `#` through `######` form levels 1–6 beneath the center.
- Nested lists form child branches and allow deeper levels.
- Paragraphs, code blocks and other content follow the surrounding outline.
- Editing the center of a dedicated map renames its file through Obsidian. Use a heading beneath it for a content title that differs from the filename.

See the [Markdown reference](markdown-mindmap-standard.md) for mixed headings/lists and exact write-back rules.

## Edit and organize topics

| Goal                  | Action                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| Edit a topic          | Double-click,`F2` with a selection, or **Edit text** in the node menu |
| Add a child           | Select a topic and press `Tab`                                              |
| Add a sibling         | Press `Enter` outside text editing, or use the node menu                    |
| Confirm text          | `Enter`; `Shift+Enter` inserts a line                                     |
| Finish editing        | Click outside or press `Esc`; the inline editor keeps your text             |
| Fine-tune longer text | Use**Edit in dialog**; its `Esc` cancels                              |
| Change the parent     | Drag a topic near its target; dropping attaches or reorders it                |
| Delete                | Select and press `Delete`/`Backspace`, or use the node menu               |
| Move among siblings   | **Move node up/down** in the node menu                                  |

- A drag that misses a structural target returns to the layout; free coordinates are not stored.
- Repeated clicks on empty canvas do not create topics.
- **Arrange mind map** remains in the command palette and canvas menu for an explicit reset.
- When link suggestions are open, `Enter`/`Tab` chooses a result and `Esc` closes the suggestions first.

## Connect notes with wikilinks

- Type `[[` to search notes and aliases.
- Type `[[Note#` for a heading, or `[[Note#^` for a block reference.
- `[[Note|Label]]` displays an alias. The Markdown remains editable in the inline editor.
- Click a link to follow it; `Cmd/Ctrl`-click or middle-click opens another tab.
- Hover linked text for Obsidian's page preview. Preview availability follows Obsidian's settings.
- **Add link** lets you pick a vault file or paste a URL.
  - An entirely empty topic can become the link itself.
  - On a topic with existing content, the link is added as a child.
- Copy, cut and paste use a Markdown outline in the system clipboard, so outlines can move between the map and text editors.

## Use rich content

### Markdown, tasks and tags

- Bold, italic, inline code, highlight and strikethrough display inside topics.
- Task checkboxes can be toggled directly. Tags open Obsidian's tag search.
- Tables, blockquotes, callouts and footnotes are supported; footnotes offer hover previews and navigation.
- Place the content under the appropriate heading or list item to keep its branch membership.

### Math and diagrams

- `$…$` and `$$…$$` render with MathJax.
- A `mermaid` code block renders as a diagram, with source copying available.
- Enable **TikZJax** to render `tikz` blocks as LaTeX diagrams.
- Rendering can be asynchronous; the topic resizes as the result becomes available.

### Beyond-CodeTab

- Install and enable a Beyond-CodeTab build that provides the public rendering API.
- Use an outer four-backtick `tab` block when tabs contain ordinary triple-backtick code blocks:

`````markdown
````tab
tab: JavaScript
```js
console.log("Hello");
```
tab: Notes
Link to [[Design notes]].
````
`````

- Tabs remain interactive in the map, including supported inline editing and tab management.
- Code and Markdown tabs share the map's save/undo session. Markdown tabs support wikilink suggestions.
- Topic width follows the active content; a manually set width takes precedence.
- In the CodeTab editor, `Cmd/Ctrl+Enter` saves and `Esc` cancels. An open suggestion list consumes `Esc` first.

For integration requirements and renderer boundaries, see [plugin content integration](plugin-content-rendering.md).

### Images and attachments

- **Add image**, clipboard paste and file drag-and-drop can add images.
- Hover an image to resize it; click it to open the full-screen viewer.
- Vault files can be dropped into the map. Existing topic content is preserved when a linked child is added.
- PDFs and other non-image attachments appear as clickable references rather than inline document viewers.
- System file drops follow the attachment workflow; modifier-assisted absolute links are covered in the [Markdown reference](markdown-mindmap-standard.md).

## Navigate and adjust the appearance

- **Canvas:** drag to pan by default. `Cmd` on macOS / `Ctrl` on Windows + drag selects; **Drag with a hotkey** swaps the gestures.
- **Search:** `Cmd/Ctrl+F`, then type a topic name. `Enter`/`Shift+Enter` moves through matches.
- **Minimap:** open the right sidebar to see the whole map and navigate it. Pop-out windows retain their own floating overview.
- **Toolbar:** return to Markdown, export, toggle borders/line style, zoom, fit, undo and redo.
- **Canvas menu:** choose layout, palette and hierarchy syntax. Supported layouts are logical, mind map, organization, catalog, timeline and fishbone.
- **Per-map state:** dedicated maps keep the layout in frontmatter and appearance/viewport preferences in plugin data. Temporary notes keep view choices in memory.
- **Relationships and summaries:** select these actions from the node menu and follow the target/endpoint steps; changes join the same undo timeline.

## Embed or export a map

- A fenced `mindmap` block displays a read-only map in an ordinary note.
  - Its body uses the same heading/list outline.
  - It fits the available note width and keeps links clickable.
  - Editing and tab-management controls are disabled inside read-only plugin content.
- Choose **PNG** or **SVG** in settings, then use the toolbar or **Export image** command.
- Plugin content exports the currently displayed presentation as a static result.

## Common questions

- **Why does the map not open automatically?** Check `.mindmap.md` and `Mindmap: Mindmap`. Ordinary `.md` notes can still be opened temporarily from the header.
- **Why does changing the center rename the file?** The center is the document's virtual root. Give the first heading your independent content title.
- **Why is a plugin block showing source?** Check that its renderer is installed and enabled. Beyond-CodeTab needs its public rendering API; unsupported blocks use the normal code display.
- **Where is the Arrange button?** Use the canvas menu or command palette. Routine dragging already returns topics to a structural layout.
- **How do I change gestures?** Toggle **Drag with a hotkey** in the plugin settings.
- **Why is an updated build not visible?** Restart Obsidian after replacing the plugin files.

For troubleshooting, include your Obsidian version, plugin versions and a small Markdown example in an [issue](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/issues).
