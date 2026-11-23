**[English](README.md) · 简体中文**

# Oh-My-Mindmap-Studio

### 保留 Markdown 的 Obsidian 思维导图插件

直接在导图里编辑笔记、拖动分支整理思路，让知识继续保存在本地 Obsidian 库中。

[![版本](https://img.shields.io/github/v/release/volmodaoist/Obsidian-Mindmap-Studio?label=release)](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/releases) [![许可证 MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![Obsidian 1.13.0+](https://img.shields.io/badge/Obsidian-1.13.0%2B-7c3aed)](https://obsidian.md)

![把 Markdown 笔记以 Obsidian 思维导图打开，编辑主题、添加分支并拖拽调整层级](assets/demos/edit-and-organize.gif)

[安装](#安装) · [快速上手](#快速上手) · [功能演示](#功能演示) · [使用指南](docs/user-guide.zh-CN.md) · [更新日志](CHANGELOG)

## 可以做什么

- **在图上编辑。** 创建主题、拖动分支、折叠章节，支持撤销和重做。
- **连接笔记。** 补全 `[[双链]]`，点击打开笔记，悬停查看预览。
- **保留丰富内容。** 在节点里显示任务、callout、表格、公式、Mermaid 和支持的插件内容。
- **轻松导航。** 六种布局，搜索、缩放和右侧缩略图。
- **分享成果。** 导出 PNG 或 SVG，源文件仍然是 Markdown。

## 安装

需要 **Obsidian 1.13.0 或以上**，支持 macOS、Windows 和 Linux 桌面端。

1. 从 [Releases](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/releases) 下载 `main.js`、`manifest.json`、`styles.css`。
2. 复制到 `<vault>/.obsidian/plugins/mindmap-studio/`。
3. 完整重启 Obsidian，在「设置 → 第三方插件」启用 **Oh-My-Mindmap-Studio**。

本地构建安装：

```bash
npm install
make install vault="/你的库路径"
```

`make install` 使用 Makefile 中配置的默认库。安装前会备份已有文件，并保留插件设置；`make help` 可以查看开发命令。

## 快速上手

**打开已有笔记：** 点击笔记标题栏的「以思维导图打开」，也可以使用右键菜单或命令面板。普通 `.md` 仅打开时不写属性；编辑节点会保存 Markdown 正文。

**新建专用导图：** 运行「新建思维导图」，确认名称，选中中心后按 `Tab` 添加第一个分支。专用导图使用 `.mindmap.md` 后缀，并带有导图属性。

例如，`项目计划.mindmap.md` 可以写成：

```markdown
---
Mindmap: Mindmap
Mindmap Layout: logical
---

# 目标
- 完成原型
- 收集反馈

# 参考资料
- [[设计笔记]]
```

中心是文件名对应的「项目计划」，`# 目标` 和 `# 参考资料` 是其分支。编辑专用导图的中心会重命名文件。专用后缀和启用属性同时存在时，文件会自动以导图打开。

| 操作                  | 快捷键                                |
| --------------------- | ------------------------------------- |
| 编辑选中的节点        | 双击或 `F2`                         |
| 添加子节点 / 同级节点 | 非编辑状态下 `Tab` / `Enter`      |
| 编辑时确认 / 换行     | `Enter` / `Shift+Enter`           |
| 搜索节点              | `Cmd/Ctrl+F`                        |
| 撤销 / 重做           | `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` |

默认在空白画布拖动会平移，macOS 按住 `Cmd`、Windows 按住 `Ctrl` 再拖动会框选。「基于热键拖拽」设置可以交换这两种操作。候选列表打开时，`Enter`/`Tab` 选择双链，`Esc` 先关闭候选。

## 功能演示

### 写到哪里，双链就补全到哪里

输入 `[[` 查找笔记和别名；`[[笔记#` 查找标题，`[[笔记#^` 查找块引用。节点和支持的 Beyond-CodeTab Markdown 编辑器都可以使用。

<details>
<summary>查看双链补全演示</summary>
<img src="assets/demos/wikilink-completion.gif" alt="在 Obsidian 思维导图节点中补全双链，并打开对应的 Markdown 笔记" loading="lazy">
</details>

### 让内容留在对应的想法旁边

任务、Markdown 样式和 Mermaid 流程图可以直接显示在节点里。启用 **Beyond-CodeTab** 可以使用交互代码标签；启用 **TikZJax** 可以显示 LaTeX 绘图。节点尺寸会跟随当前内容调整。

<details>
<summary>查看丰富内容演示</summary>
<img src="assets/demos/rich-content.gif" alt="在 Obsidian 导图节点中切换任务状态和 Beyond-CodeTab 代码标签" loading="lazy">
</details>

### 导图变大，也能找到方向

搜索可以定位节点。右侧缩略图显示整张导图，点击即可导航画布；工具栏提供放大、缩小和总览。

<details>
<summary>查看缩略图导航演示</summary>
<img src="assets/demos/minimap-navigation.gif" alt="放大 Obsidian 思维导图，并通过右侧缩略图导航画布" loading="lazy">
</details>

## 指南与社区

- [使用指南](docs/user-guide.zh-CN.md)：节点编辑、布局、内容、导出和常见问题。
- [Markdown 格式参考](docs/markdown-mindmap-standard.md)：完整文件与语法约定。
- [插件内容集成](docs/plugin-content-rendering.md)：渲染支持与宿主接口。
- [版本说明](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/releases) · [反馈问题或建议](https://github.com/volmodaoist/Obsidian-Mindmap-Studio/issues)。
- 社区标签：[Obsidian](https://github.com/topics/obsidian) · [思维导图 mindmap](https://github.com/topics/mindmap) · [Markdown](https://github.com/topics/markdown) · [个人知识管理 PKM](https://github.com/topics/pkm) · [本地优先 local-first](https://github.com/topics/local-first)。
- [社区标签与仓库 Topics 建议](docs/community.md)：`#Obsidian` · `#MindMap` · `#Markdown` · `#PKM` · `#LocalFirst`。

**检索关键词：** Obsidian 思维导图插件 · Markdown 思维导图编辑器 · 双链补全 · 个人知识管理 · 本地笔记 · Mermaid · TikZJax · Beyond-CodeTab。

## 开发与许可证

`make dev` 监听构建，`make test` 运行测试，`make check` 执行项目门禁；贡献和发布细节见[开发流程](.agents/process.md)。

由 [volmodaoist](https://github.com/volmodaoist) 维护，Fork 自 [WinterMosquito 的 MindMap Studio](https://github.com/WinterMosquito/Obsidian-Mindmap-Studio)。使用 [MIT 许可证](LICENSE)，内含 [simple-mind-map](https://github.com/wanglin2/mind-map) 和 [Pele](https://github.com/obsidianmd/pele) 等依赖，详见[第三方声明](vendor/THIRD-PARTY-NOTICES.md)。
