# 项目实现决策

按主题查跨模块结论；函数级优先顺序、算法与排查过程留在源码契约和测试。
Markdown 数据语义以 [标准](../docs/markdown-mindmap-standard.md) 为准，开发边界见 [架构](architecture.md)。

## 决策表

### 模块与入口

- **Fork 品牌与作者（K37）**
  - 入口：`manifest.json` / `package.json` / `main.registerHoverLinkSource`
  - 决策：显示品牌 Oh-My-Mindmap-Studio，维护作者 volmodaoist、作者 URL 指向其 GitHub；包名 oh-my-mindmap-studio 与 lock 根名称同步。设置及悬停来源由 manifest.name 呈现。
  - 详细边界：K37；函数级规则与回归见对应源码和测试。

- **本地开发与安装入口（K212）**
  - 入口：`Makefile` / `scripts/install.mjs`
  - 决策：Makefile 包装既有开发监听、测试监听、构建、lint 与 check:gates；默认只显示帮助。安装路径唯一定义在 Makefile 的 vault 变量，默认当前用户的坚果云云笔记，命令行 vault 覆盖；以原始环境值传给安装器，由安装器展开 ~/、校验库、构建、备份和 SHA256 核对。
  - 详细边界：K212；函数级规则与回归见对应源码和测试。

- **纯逻辑（无 obsidian / 引擎依赖）**
  - 入口：`domain/`
  - 决策：领域层允许引用本层叶子和文档公共模型，不依赖上层、宿主、vendor 或外部包。

- **通用机制（常量/文案/错误/并发/事件/持久化）**
  - 入口：`core/`
  - 决策：各一份，不分模块重复

- **Obsidian 平台集成**
  - 入口：`platform/`
  - 决策：宿主渲染、工作区与系统能力由 platform 适配；业务层经窄接口注入。


- **默认打开与临时导图（K218）**
  - 入口：`domain/document/mindmap-file` + `markdown/md-open` + `platform/workspace/mindmap-auto-open` / `markdown-mindmap-action`
  - 决策：专用 `.mindmap.md` 且启用属性命中时默认导图。普通 `.md` 由标题栏官方 `MarkdownView.addAction`、文件菜单或命令显式打开，切换与返回均不写属性；标签选择以 WeakMap 按 leaf/当前 TFile 保留，重命名随对象更新，导航换文件后失效，重启恢复普通笔记为 Markdown。
  - 详细边界：K218；函数级规则与回归见对应源码和测试。

- **新建导图初始内容（K201 / K218）**
  - 入口：`creation.createNewMindMap` + `domain/document/mindmap-file` + `services/document/document-service`
  - 决策：新建 `名称.mindmap.md`，仅含启用/布局属性与空正文；重名编号插在完整后缀之前，输入的 .md 或 .mindmap.md 只归一一次。中心与标签显示去掉格式后缀的名称，中心改名保留完整 .mindmap.md 后缀，走官方 FileManager 更新引用。
  - 详细边界：K201、K218；函数级规则与回归见对应源码和测试。

- **访问引擎内部形态**
  - 入口：`engine/index.ts` 具名函数
  - 决策：防腐收口

- **引擎离屏测量容器的残渣（`-99999px` 处那份节点内容副本）**
  - 入口：`engine/index.ts` 的 `clearMeasureResidue`（在 `createMindMap` 内挂 `node_tree_render_end`）
  - 决策：每次节点树渲染落地后清理离屏测量副本，避免读屏和 Tab 命中残留组件；常驻测量容器仍复用。
  - 详细边界：K152；函数级规则与回归见对应源码和测试。

- **引擎类型与领域树**
  - 入口：`core/engine-types.ts`
  - 决策：引擎实例类型从 core/engine-types 导入；文档算法使用领域树与 core/node-data 的投影适配。engine 内部才允许直连 vendor。

- **模块依赖矩阵（谁可依赖谁）**
  - 入口：`scripts/module-boundaries.mjs`
  - 决策：**唯一定义**（eslint 边界块与 `tests/contracts/module-boundaries.test.ts` 共同消费）；勿在 `eslint.config.mts` 或测试里另写一份

- **节点图片元素判定（含 popout 跨 realm）**
  - 入口：`engine/nodes/mindmap-nodes.isNodeImageElement`
  - 决策：按 `tagName === 'image'` + 取矩形能力；**禁** `instanceof SVGImageElement`（跨窗口恒 false ⇒ 手柄不出现 + 帧内预览静默失效）。帧内预览与 hover 手柄共用这一份

- **事件目标 → 元素（含 popout 跨 realm）**
  - 入口：`core/event-binder.elementFromTarget`
  - 决策：按 `typeof closest === 'function'` 判能力；**禁** `instanceof Element`（跨窗口恒 false ⇒ 点击静默失效）。任务复选框与标签点击共用这一份；**勿**在 `features/view/view-common` 另立一份（它会把 engine → vendor 拖进只读嵌入路径的模块图，K150 ⑧）
  - 详细边界：K150；函数级规则与回归见对应源码和测试。

- **概要（Summary）**
  - 入口：语法 `domain/relations/summary`（值语义）+ `domain/relations/directive`（指令块语法，唯一）；解析归属沿用 `markdown/outline/md-outline`（指令行特例）；回写 `markdown/serialize/md-serialize` + `domain/relations/summary.applySummaries`；落地 `engine/nodes/mindmap-summaries`；交互 `features/relations/view-node-summary`；文字弹窗 `ui/modal-summary-text`
  - 决策：**写在第一个被覆盖的兄弟节点上**：`%%sum:<count> | 文字%%`——`count` = 从本节点起**连续覆盖**的同级节点数（`1..999`）。为什么锚在第一个兄弟而不是父节点：锚父节点就得写「第几个到第几个」，在前面插入兄弟会让整段区间错位；锚第一个兄弟时只有**区间内部**的增删才改变覆盖面，与「这一条起往后 N 条」的直觉一致。

- **联系（关系连线）**
  - 入口：语法 `domain/relations/relation`（判定 / 剥离 / 改写 / 树级图解析）；解析归属 `markdown/outline/md-outline`（指令行特例）；回写 `markdown/serialize/md-serialize`（合成拼回）；落地 `engine/nodes/mindmap-relations`；交互 `features/relations/view-node-relation`（建/删/改标签）+ `features/relations/view-relation-anchor`（手绘锚定 DOM）+ `domain/relations/relation-anchor`（锚定几何）；标签弹窗 `ui/modal-relation-label`
  - 决策：**独立指令行**：节点最后一个物理行之后的**若干独立指令行**——拆行只为 diff 粒度与行宽〔一条边一行，改哪条看哪行；枢纽节点不再出现 700 字符长行〕，语义与旧形态完全等价），每行只由 `%%id:xxxxxx%%` / `%%rel:xxxxxx | 标签%%` 组成（list 项按续行缩进）。**语法层已抽到 `domain/relations/directive`**：段形状 / 行判定 / 拆贴 / 规范顺序只此一处（`DIRECTIVE_KEYS` 登记 `id` / `rel` / `sum`），`relation` 与 `summary` 各自只解释**自己 key 的 value**；`isDirectiveLine` 只判**形状与已登记 key**——写错的 value（如 `%%rel:xyz%%`）仍算指令行（隐藏、不产生语义），不再在画布上冒出一个空节点。
  - 详细边界：K153、K154；函数级规则与回归见对应源码和测试。

- **GFM 管道表的识别（表块 / 单元格 / 对齐 / `\ ` 还原）**
  - 入口：`domain/content/pipe-table.ts`
  - 决策：纯逻辑零依赖，**唯一实现**（勿另写一份表格判定）；围栏代码块与块级数学**内**的表格行不识别（保护区复用渲染层 `MARKUP_RE`，不造第二份 fence 判定）。单元格内不做块级内容

- **节点内第三方插件内容（K219）**
  - 入口：`platform/rendering/plugins/bridge.ts` / `platform/rendering/plugins/code-tab.ts` / `features/content/plugin-content-session.ts`
  - 决策：平台桥持有活组件、冻结副本与生命周期。自动宽度依据当前可见内容重测，手动宽度优先；正文写回经文档会话，事件、焦点与 DOM 在重排后保留。
  - 详细边界：K219；函数级规则与回归见对应源码和测试。

- **DOM 事件监听**
  - 入口：`Component.register*` 或 `core/event-binder.ts`
  - 决策：随生命周期自动摘除

- **错误呈现**
  - 入口：用户可感→ `notifyError`；内部 → `console.error/warn`
  - 决策：静默跳过会让问题无痕退化。**失败已由被调方提示过的，调用方不得二次提示**（`return null` 约定见 `media/images-save`，否则弹两条且正文为 `String(null)`，见 `features/editing/view-dnd.ts`）

### 文档会话与状态

- **同文件多视图的同步（两个 leaf 打开同一张导图）**
  - 入口：`services/document/document-session-registry` + `services/document/document-session`（组合根 `main.ts` 的 `vault.on('modify')` → `registry.onModify`）
  - 决策：同文件共享一棵权威树、一次撤销时间线与一条保存管线。提交广播跳过发起视图，接收投影不发 data_change 或增加历史；外部修改取消陈旧写盘，重载并保留草稿撤销恢复。
  - 详细边界：K177、K185、K181、K189、K188、K183、K182、K184、K194；函数级规则与回归见对应源码和测试。


- **写盘时机**
  - 入口：`services/document/document-service.ts` 的 `SavePipeline`（2026-11-09 起**由 `DocumentSession` 持有**：同一文件一条管线，视图不再各自持有）
  - 决策：**照搬 Obsidian `TextFileView`**：内容变更后 **2 秒防抖**写盘（`AUTO_SAVE_DEBOUNCE_MS = 2000`，即官方 `requestSave` 的固定值）；关闭视图 / 切换文件 / 插件卸载时**立即保存**。**没有「自动保存」设置项**（已删）、**没有「连续失败挂起」**（P1b 已删，写失败只报「未保存」并在下一次编辑重试）；外部写入的处理由 `DocumentSession` 单点承接（写盘前发现磁盘正文已变 ⇒ 放弃写盘 → 重载 → 草稿留作一条撤销，见「同文件多视图的同步」行）。
  - 详细边界：K176、K156、K158；函数级规则与回归见对应源码和测试。

- **`data.json` 里 `viewState` 的写盘判据（按文件视口与外观偏好）**
  - 入口：`services/view-state.patch` + `services/engine/engine-controller.persistViewport`
  - 决策：**只写变化**：`patch` 按序列化结果逐字比较，与本条相同即不排写盘（关掉视图时会读一次引擎视口，「没动过就关」是常态）；关闭/切换/切回 Markdown 时若视口**仍是打开时自动设置的那个**（`viewport.defaultSignature` 命中、且未恢复过保存视口）**不写**——默认视口是当场按容器与内容算出来的，落盘只等于把当时的窗口尺寸固化进 data.json（实机：96 张导图 / 39 条状态 / 26 KB，其中 23 条属此类）。**不做**「等于全局默认就省略」：`themeStyle` / `lineStyle` 的「显式切过」与「从没切过」语义不同（前者保持原值、后者跟随未来默认变更，见「边框」行）；`view.transform` 与 `state` 数值重复但由 vendor `setTransformData` 独立消费，**不删**。
  - 详细边界：K195；函数级规则与回归见对应源码和测试。

- **状态栏的保存状态（`保存中…` / `已保存` / `未保存`）**
  - 入口：判据 `services/document/document-service.ts` 的 `isAtLoadedState`；出口 `SavePipeline.schedule()` 的 `ScheduleOutcome`（`scheduled` / `noFile`）+ `onSaved` / `onSaveError` → `features/view/view.setSaveState` → `services/status-bar.showSaveState`
  - 决策：「内容是否已落盘」只有**一份判据**：本轮序列化 vs `markLoaded` 基线（只比正文）。`schedule()` 返回 `scheduled`（报「保存中」）/ `noFile`（加载中/已卸载，什么都不报）；写盘成功含无差异跳过 → `onSaved`（「已保存」）；写盘异常 → `onSaveError`（「未保存」，常驻到下一次成功）。
  - 详细边界：K166；函数级规则与回归见对应源码和测试。

- **撤销链的起点（第 0 条历史快照）**
  - 入口：`engine/nodes/mindmap-history.seedInitialHistory`
  - 决策：在 `createMindMap` 里挂**一次性的** `node_tree_render_end`，首帧渲染落地时播种（`if (!isReadonly)`）。**时机必须是渲染之后**：创建瞬间的树还没被引擎规范化（`expand` 等字段渲染期才补），此刻播种会与渲染后那条快照内容不同 ⇒ 多出一条「按 Ctrl+Z 毫无反应」的历史（实测打开后 `2 条 / idx 1`）。
  - 详细边界：K160；函数级规则与回归见对应源码和测试。

- **跨视图应用会话快照**
  - 入口：`engine/nodes/mindmap-snapshot.applySessionSnapshot`
  - 决策：**唯一通道**（经 `engine/index` barrel 导出）。等价于 `updateData` 去掉 `addHistory`：不进引擎历史、不发 `data_change`（编辑期该事件唯一发源），接收视图因此不会重复排保存 / 跑守卫（K181）。
  - 详细边界：K181、K198；函数级规则与回归见对应源码和测试。

- **窗口级拖拽会话**
  - 入口：`features/canvas/drag-session.startWindowDragSession`
  - 决策：收口 mousemove/mouseup 临时监听 + rAF 合帧 + 幂等收尾。`capture` 显式表达「手势独占（`true`）」vs「只观察（`false`，不夺事件）」——现存两个调用方各占一边：图像调宽 `true`（避免节点拖拽串扰）、小地图拖拽不传（面板是画布兄弟节点，引擎本就收不到）；该语义曾由两处（调宽 / 换父辅助）真实分叉过，换父辅助已于 2026-10-11 移除。

- **局部 UI 状态**
  - 入口：视图实例字段
  - 决策：不持久化

- **需跨会话的视图状态**
  - 入口：`data.json`（经 `core/persistence.ts`）
  - 决策：按文件记连线、配色、边框与视口；布局只在文件属性。加载只投影当前字段，不改输入或写盘（K213），保存仍合并顶层 settings 与 viewState。
  - 详细边界：K213；函数级规则与回归见对应源码和测试。

- **图片尺寸缓存**
  - 入口：官方 `App.loadLocalStorage`
  - 决策：按库隔离；**禁**全局 `localStorage`（跨库串味）。**失败记忆（`IMAGE_FAIL_CACHE`，TTL 5 min）在打开文件时按 URL 解除**（`media/images-path.forgetImageFail`，由 `services/document-service.parse` 对本文件的图逐个调用，2026-10-27）：TTL 只该节流**同一会话内的反复渲染**，不该跨打开周期压着瞬态失败（同步刚落地的图 / 库索引未就绪）。

### Markdown 与引用

- **库内文件解析**
  - 入口：`links/links-resolve.resolvePathToFile`
  - 决策：**形态路由顺序即契约**

- **新建引用的路径形态（文档链接 / 图片引用）**
  - 入口：`links/file-lookup.newReferencePath`
  - 决策：官方 `New link format` 三档 + 同名消歧，**唯一定义**（同名口径**随引用形态**：省略 `.md` 的文档链接按去扩展名 basename；带扩展名的图片 / 附件 / `.canvas` 按文件名——`a.png` 与 `a.md` 不歧义，见 `hasNameConflict`。`omitMarkdownExtension` 只给文档链接；md 形态图片仍写完整库内路径）。

- **脚注渲染（引用 `[^id]` / 定义 `[^id]: 内容`）**
  - 入口：判定 `markdown/syntax/md-footnote.ts`（**唯一**：`parseFootnoteDefinition` / `isFootnoteDefinition`；解析侧 `md-outline.isLinkReferenceDefinition` 的 `^` 分支**委托**它）；段型 `features/content/node-inline-tokenize`（`kind: 'footnote'`，`(?!:)` 让定义行保持字面）；装配 `features/content/node-inline-html`（`buildFootnoteRef`）；交互 `features/content/view-footnote.ts`（视图与只读嵌入共用）
  - 决策：**只做读侧**：定义行仍是普通 `plain` 节点，`text` / `mdRaw` 一字不动（硬规则 4），索引由 `collectFootnoteDefinitions` 从**引擎渲染树**现算（`engine.collectRenderNodeData` 的文档序 data 快照 + `node_tree_render_end` 失效缓存）——**会话权威树没有 uid**（uid 是 `ensureUniqueUids` 补在建引擎前的克隆上的），读会话树会让「按 uid 跳转」全部落空。**徽标只承载 id、不承载正文**：段序列按原文寻址缓存，正文在事件发生时现查（点击跳转定义节点 / 悬停浮层预览）——这是「同一原文 → 同一段序列」的前提。
  - 详细边界：K197；函数级规则与回归见对应源码和测试。

- **列表缩进单位（Tab / 4 空格 / `空格+Tab` 混合）**
  - 入口：`domain/document.MdNodeMeta.mdIndentUnit`（只记**虚拟根**）+ `markdown/serialize/md-serialize.ts` 的 `readIndentUnit`
  - 决策：解析期记录原始缩进单位，序列化按原单位输出；缺省或非法值回落两个空格。列表列数与 frontmatter 块标量列数使用各自既有尺子。
  - 详细边界：K164；函数级规则与回归见对应源码和测试。

- **层级语法（Markdown 标题 / 无序列表）**
  - 入口：`domain/document.MdNodeMeta.mdHeadingStart`（只记**虚拟根**）+ `markdown/syntax/md-heading-syntax.ts`（判据与整支升降）+ `md-heading-normalize.ts`（编辑期归一）+ `md-heading-format.ts`（整篇重排）+ `features/editing/view-syntax.ts`（挂引擎 / 提示 / 撤回）+ 设置项 `newMapSyntax`
  - 决策：合法兄弟混排为列表/段落在前、标题在后；仅对会改变结构的排布归一。起始标题级别来自正文，空图才使用设置；原文、链接与指令随节点保留。
  - 详细边界：K172、K178、K170、K179、K171、K168、K169；函数级规则与回归见对应源码和测试。

- **任务列表项（`- [ ]` / `- [x]` / `- [X]`）**
  - 入口：判定/合成 `domain/content/md-task`；渲染 `features/content/node-inline-html`（`span.mindmap-node-task`）；交互 `features/content/view-node-task`；原文写回 `features/content/node-content-write.applyRawNodeContent`
  - 决策：**只认列表项首行**（`mdType === 'list'` 且 `^\[[ xX]\](?=[ \t]|$)`；`[ ]foo` 不是任务）。**token 留在 `mdRaw`、`text` 与 `mdDerivedText` 一起剥**——只剥一半会让 `rawOk` 恒假，整篇任务节点被当成「已编辑」合成回写；三条合成路径（纯 token / 分段 / 尾插）都要拼回 `mdTaskToken`（大小写原样，`[X]` 不归一）。
  - 详细边界：K151；函数级规则与回归见对应源码和测试。

- **标签 `#tag`（可点）**
  - 入口：判定 `features/content/node-inline-tokenize.pushTagSegments`；渲染 `ui/node-content/content-tag.buildTagElement`；点击 `features/content/view-tag`；私有触点 `platform/workspace/tag-search`
  - 决策：**只认顶层 prose**：轻标记内部（`**#tag**`）不识别，代码 / 数学 / 注释 / 链接内由保护区先吃掉（与配色指令同口径）；`#` 前必须是非词字符（`foo#bar` 不是标签）；全数字不是标签；`/` 分层允许、不得结尾。渲染为 `a.tag[data-tag]` 且**刻意不写 `href`**——既不落进 `ANCHOR_SELECTOR` 的 `a[href]`，也不触发链接三通道；内联样式**与内链同源**（`THEME_LINK_COLOR`）：文字 = 主题链接色，底色 = 同色 14% `color-mix`（兜底落 `#7f6df2` 时与旧 `rgba(127, 109, 242, 0.14)` 等价，无主题变量的环境观感不变）；着色节点取 `tones`（墨色 + chip）。

- **Markdown 代码块只读嵌入**
  - 入口：`features/mindmap-codeblock.ts`
  - 决策：语言键 `mindmap`（`core/constants.CODE_BLOCK_LANGUAGE`＝存量笔记的接口）；只读＝引擎原生 `readonly` + `enableViewDrag: false`（不可拖动）+ 不注册交互插件；**高度随内容、只缩不放**（对齐 Mermaid：`measureContentFitToWidth` + `centerContentAtScale`）；**容器变窄即按新宽度重算**（观察器**常驻**）；**滚轮归宿主页面**（capture 拦截）；超 `CODE_BLOCK_MAX_NODES` 降级大纲；**不写 `data.json`**。**按块布局**＝块体**首行** `%%layout: <值>%%`（键名大小写不敏感；

- **无选中的复制（`Ctrl+C`）**
  - 入口：`features/editing/view-clipboard.copySelectedNodes` + `engine/nodes/mindmap-clipboard.collectWholeTreeSubtrees`
  - 决策：有选中 → 复制选中子树（根被过滤；**只选中根**时集合为空，同样落到整图分支）；**无选中 → 复制整张图**（中心主题作首行，与选中同序列化口径）。**勿**改回「请先选择一个节点」：引擎已 `preventDefault`，那等于按键空转、还容易粘出旧剪贴板（K142）。
  - 详细边界：K142；函数级规则与回归见对应源码和测试。

### 画布与外观

- **画布热键拖拽设置**
  - 入口：`settings` + `engine/viewport/mindmap-viewport.applyCanvasDragMode` + `vendor/patches/canvas-drag*`
  - 决策：`dragCanvasWithModifier` 默认 false：空白左拖平移，Cmd/Ctrl 左拖框选；true 两者互换。设置缺键与引擎未传选项均默认 false，显式 true/false 偏好按原值读取，不迁移或清洗已有设置。
  - 详细边界：K216；函数级规则与回归见对应源码和测试。

- **空白画布点击**
  - 入口：`features/view/view` + `features/editing/view-node-actions`
  - 决策：空白连续点击与双击不新建节点，沿用结束编辑、取消选中的既有点击行为；显式新建保留 Tab / Enter / 节点旁加号 / 右键菜单。删除原空白双击新建绑定，不拦截引擎点击或编辑事件。
  - 详细边界：K200；函数级规则与回归见对应源码和测试。

- **节点编辑态外观**
  - 入口：`features/editing/node-inline-editor` + `engine/nodes/mindmap-editor`
  - 决策：按原内容盒的文字起点和缩放定位；原文变长时宽度增长至内容盒的 maxWidth、随后换行增高，手动固定宽度保留。编辑期隐藏原节点外框，由编辑器独自承担文字/底色/外框，关闭时恢复原显示属性；预览不写节点数据或排保存，提交后才重排。
  - 详细边界：K203、K204、K199；函数级规则与回归见对应源码和测试。

- **边框（节点外观风格：有边框 / 无边框）**
  - 入口：`engine/theme/mindmap-theme-presets.ts`
  - 决策：**UI 叫「边框」，内部沿用 `themeStyle`**（已写进 `data.json` 的键不能改名）。**唯一实现**（只放数据、零分支；管线在 `mindmap-theme.ts`）；id 唯一源在 `core/constants.THEME_STYLE_OPTIONS`（`ThemeStyleId` 由该表 `as const` 派生），两处由 `Record<ThemeStyleId, …>` 编译期对齐（漏写即编译失败）。

- **整图配色与节点色表**
  - 入口：同文件 `PALETTES`（整篇层级色）+ `NODE_COLORS`（节点填充/线条成对）+ `core/constants.PALETTE_OPTIONS`
  - 决策：与「主题色」（明暗）、「主题」（形态）**三维正交**。**不是设置项**：按文件记在 `data.json` 的 `viewState[<路径>].palette`（`services/view-state` 存取），由画布右键的**「配色」级联菜单**切换——与连线样式同一种「按文件记忆」形态，故 `MindMapStudioSettings` 没有该字段（**布局不在此列**：它已移入文件属性，2026-10-29）。
  - 详细边界：K213；函数级规则与回归见对应源码和测试。

- **节点级颜色（`%%#89CFF0%%` 注释指令）**
  - 入口：入口/动作 `features/editing/view-node-color` + `features/view/view-context-menu`（节点右键「配色」）；解析 `features/content/node-inline-tokenize.colorDirectiveOf` / 写入 `setColorDirective`；归一/亮度/继承 `domain/color`；落地 `engine/theme/mindmap-colors`；自定义弹窗 `ui/modal-color`
  - 决策：**语法**＝注释语法包裹三/六位十六进制色，写在节点行的**顶层**（围栏代码 / 行内代码 / 数学内不算；其它标记内部不识别）。**写入落点**：**标题节点写独立行**（`# 标题` 的下一行；行尾形态会被 Obsidian 的 heading 缓存算进标题文本，`[[#标题]]` 解析失败——与联系指令同一教训，见 K174）；其余节点无指令时追加到**末行行尾**；末行若是**闭合围栏**或**表格行**则**另起一行**——在闭合围栏行尾接内容会让围栏不再闭合（CommonMark 要求其后只有空白，`markdown/outline/md-outline-lines.classifyLines` 同口径），其后的同级节点被整段吞进代码块；在表格行尾接内容会被 GFM 当成新单元格。
  - 详细边界：K174、K175；函数级规则与回归见对应源码和测试。

- **竖栏两态开关（边框 / 连线）的状态表达**
  - 入口：`ui/toolbar/toolbar.Toolbar.render`
  - 决策：视觉仍**只由图标**表达、tooltip 只报名字，但按钮必须同时带 `aria-pressed`（`ToggleRowState.pressed`；口径＝图标所示那一档：边框＝有边框 `square`、连线＝曲线 `spline`）。**每次 `syncState()` 都要重挂**——官方 `setTooltip` 会重写 `aria-label`，按下态不在 label 里，只写一次会被抹掉；置灰的连线开关不写（`disabled` 已表达不可用，再报是假信息）。
  - 详细边界：K159；函数级规则与回归见对应源码和测试。

- **右缘工具栏的整理入口**
  - 入口：`features/view/view-toolbar.buildToolbar`
  - 决策：K205 后移除常驻整理按钮，四组共 10 个按钮；整理保留在右键、命令面板及布局切换内部。见 K206。
  - 详细边界：K205、K206；函数级规则与回归见对应源码和测试。

- **节点结构拖动与吸附**
  - 入口：`engine/runtime/mindmap.createMindMap` + vendor `patches/structural-drag.js`（补丁 18）
  - 决策：只改变层级/顺序；未命中回原位，不写自由坐标。原生分区/连线/命令共用，坐标统一、屏幕容差、每帧合并与松手最终确认。
  - 详细边界：K205；函数级规则与回归见对应源码和测试。

- **右键拖拽＝框选**
  - 入口：引擎 `select` 插件（**自带，勿另造**）+ `features/view/view-context-menu` 的 `takeRightDrag` / `RIGHT_DRAG_THRESHOLD_PX`
  - 决策：插件保持右键框选；左键与修饰键手势由 `dragCanvasWithModifier` 设置决定（见 K216），不切到上游右键平移模式。命中是**矩形相交**（vendor `checkInNodes`，不是"完全包含"），垂直排布时下沿擦到邻居会顺手带上它；框**外**的已选中节点会被移出选中集。
  - 详细边界：K216；函数级规则与回归见对应源码和测试。

- **右侧缩略图与 Outline（K215）**
  - 入口：`platform/workspace/minimap-sidebar`（承载）+ `features/view/view-minimap`（原组件会话）+ `engine/runtime/mindmap.captureMiniMap` / `core/minimap-geometry`（原几何）
  - 决策：主窗口只暂借同窗口右侧栏的一枚 Outline `ItemView.contentEl`，scoped CSS 隐藏该视图原内容和控件（含刷新后新增子项），不改核心 view/state/renderer，也不改变其它页签或 tag 面板。最近主内容用官方 `getMostRecentLeaf(rootSplit)`，侧栏获焦仍跟随原导图；同文件多个视图按引擎身份绑定，Markdown/关闭/卸载立即拆组件并清最初容器 class。
  - 详细边界：K215；函数级规则与回归见对应源码和测试。

- **小地图连线形态（按布局五态）**
  - 入口：`core/minimap-geometry.connectorModeForLayout` + `buildMiniMapLinks`
  - 决策：**唯一映射**：`branchH`（逻辑结构图/思维导图）、`busV`（组织结构图）、`railLeft`（目录组织图）、`chainRail`（时间轴族）、`fishbone`（鱼骨族）。几何**按画布实测复刻**：水平折点 **0.6**、竖直母线 **0.7**；目录/时间轴锚在**子节点左边界**（目录一级落左上角）、目录竖轨 `child.left − 12`、时间轴竖轨取 `parent.left + 0.6×(child.left − parent.left)`。
  - 详细边界：K141；函数级规则与回归见对应源码和测试。

- **小地图视口框越界时的落位**
  - 入口：`core/minimap-geometry.projectViewportBox` 的 `fitSpan`（`FRAME_PX`）
  - 决策：**框的外框必须整体落在面板内**：先按可视区与面板求交（越界一侧贴边），再把外框回夹——`FRAME_PX = 4` 是两侧 `2px` 边框之和。缘由：`border-box` 下宽高小于边框总和时浏览器**不缩边框**，而 `left/top` 是唯一锚点 ⇒ 多出的厚度只朝**右/下**伸出，被面板 `overflow: hidden` 裁掉。

- **小地图视口框的几何来源**
  - 入口：`features/view/view-minimap.updateBox`
  - 决策：投影使用当前画布缓存（`resize` 事件及取图刷新），取不到时回退绘制快照；内容与面板几何共用原 `miniMapScale`。平移缩放仅本地重投影，不能每帧强制布局或重取整图。
  - 详细边界：K140、K215；函数级规则与回归见对应源码和测试。

- **画布几何与大图 resize 调度**
  - 入口：节点盒 `core/minimap-geometry.readNodeLayoutBox`；选区块 `engine/viewport/mindmap-viewport.measureNodesCanvasBox`；调度 `features/view/view.onResize`
  - 决策：几何一律读**布局坐标 × 当前变换**（`screen = content × scale + translate`，与 `projectViewportBox` / 联系手绘锚定同口径），**不读 DOM 包围盒**——性能模式把视口外节点摘出 DOM，`getBoundingClientRect` 对大选区返回空，且在同步块里是 N 次查询。≥ `LARGE_MAP_RENDER_HINT_NODES` 时 resize 改**尾随合并**（`RESIZE_DEFER_MS`，停手后一次整树 `engine.resize()`），小图仍走 100ms 节流；两条调度互斥，`onUnloadFile` / `onClose` 取消未决尾随。
  - 详细边界：K165；函数级规则与回归见对应源码和测试。

- **画布滚轮手势（平滑 + Alt 横向）**
  - 入口：`features/canvas/view-viewport.ts`
  - 决策：**引擎负责** `Ctrl/Cmd+滚轮` 缩放（`mousewheelAction: 'move'`）；插件接管**鼠标格纵向**与 **Alt 横轴**，并做 rAF 指数平滑（τ=45ms；`|deltaY| < 50` 的纵向小 delta 仍交引擎逐事件跟手，K144）。必须挂**画布祖先的 capture**：引擎的 wheel 监听在画布自身且先 `stopPropagation`（冒泡收不到；同元素 capture 在 target 阶段排在引擎之后）。
  - 详细边界：K144；函数级规则与回归见对应源码和测试。

- **右缘竖栏 / 右键菜单的入口分工**
  - 入口：`features/view/view-toolbar.ts`（栏）+ `features/view/view-context-menu.ts`（菜单）
  - 决策：**两态开关进栏**（边框 / 连线，点一下互切、图标即当前值）、**多值选择进右键级联**（布局 / 配色）；同一动作不换图标（「自动整理」在栏与菜单都走 `arrangeMindMap` + `sparkles`）；竖栏 tooltip **只报名字**、状态由图标表达（K129）。**「配色」按右键落点分两义**：节点上＝给该节点/子树写正文颜色指令（`features/editing/view-node-color`，多选只写最上层，进入菜单用的是 `node_mousedown` 留存的选中集合——引擎在 contextmenu 阶段已折叠多选）；空白＝改整篇方案（`applyPalette` → `data.json`）。
  - 详细边界：K129、K155；函数级规则与回归见对应源码和测试。

- **右缘竖栏的卡片 / 分隔线样式**
  - 入口：`styles.css` 的 `.mindmap-hud-group` + `features/view/view-toolbar.ts` 的 `HUD_TOOLTIP`
  - 决策：**逐项对齐官方 Canvas**：组内按钮刷平（`gap:0`）、分隔线画在条目自身的 `border-bottom: 1px`（末项去掉）、组圆角 `var(--radius-s)`（4px）、组阴影 `--input-shadow`、**无整组透明度**；悬停 `--interactive-hover` + `--text-normal`、置灰只染 `svg`；tooltip 落在**左侧**（`setTooltip(..., { placement: 'left' })`，对齐 `data-tooltip-position="left"`）。**勿**改回 `gap:1px` + 组底色透出：那是缝隙不是线，实测 1 CSS px = 1.5 物理 px（dpr 1.5），比官方的 1 物理 px 更显眼；**落位在构建与状态回写两处都要带**（`syncState` 曾漏传，切换后提示跳回下方，K143）
  - 详细边界：K143；函数级规则与回归见对应源码和测试。

### 内容渲染与组件

- **创建入口与命名弹窗（K217）**
  - 入口：`commands.registerCommands` / `main.onload` + `ui/modal-name.ts` / `ui/modal-name.css`
  - 决策：新建保留命令面板与文件夹右键，删除丝带注册与相应语言刷新分支，命令 ID 不变。使用官方 `Modal.modalEl` 加专属类，将 `--modal-radius` 局部设为宿主 `--radius-m`；名称输入只设宽度，圆角、字体、边框、聚焦反馈和按钮由宿主提供。
  - 详细边界：K217；函数级规则与回归见对应源码和测试。

- **标注（callout）/ 引用块（`> [!type]` 与普通 `>` 引用）**
  - 入口：判定 `domain/content/callout.ts`（**唯一**）；段型与扫描 `features/content/node-inline-tokenize`（`kind: 'quote'` + `scanQuoteBlocks`）；装配 `ui/node-content/content-quote`（`buildQuoteElement` 只分派 → `buildCalloutShell` / `buildPlainQuoteShell` + `appendQuoteBody`，标题行 `buildCalloutTitle`）；图标 `platform/rendering/callout-icon`（`getIcon` 收口，经 `node-content-factory` 注入）；导出变量 `platform/export-svg-postprocess`
  - 决策：**显示层特性**：`>` 行在解析层是 `plain` 行（标准 §2.1），`text` / `mdDerivedText` / `mdRaw` **一字不动**，前缀只在该层剥。**块级顺序即契约**：引用 → 围栏 → 表格 → 行内（`scanQuoteBlocks` 在最外层）——围栏先切会把「引用块内的围栏」（`> ```js`）从中间抽走、标注只剩首行；反向由 `protectedRanges` 挡住围栏 / 数学 / 注释里的 `> ` 行；**同层 `[!type]` 头部行恒起新块**（解析层吃掉空行 ⇒ 不断块会让第二个标注退化成前一个的正文文字，2026-11-11 实机修复）。
  - 详细边界：K196；函数级规则与回归见对应源码和测试。

- **小地图刷新时机（样式立即 / 布局等渲染落地）**
  - 入口：`features/view/view-minimap.refreshMiniMap` 与 `refreshMiniMapAfterRender`
  - 决策：样式已同步进入 data/主题时立即取样；布局、自动整理、节点级配色等待 `node_tree_render_end` 落地，防止采旧几何/旧颜色。调用方通过 `miniMap: now` 或 `after-render` 声明，不按 key 另猜。
  - 详细边界：K215；函数级规则与回归见对应源码和测试。

- **行内轻标记 / 段序列切分**
  - 入口：`features/content/node-inline-tokenize.ts`（`MARKUP_RE`）
  - 决策：**唯一实现**：粗体标记体逐字符 temper（不越过下一对定界符）、`__` 版对称；接管判定 `resolveSelfDrawSource`。勿在渲染层另写标记判定（见 K126①）

- **弹窗骨架**
  - 入口：`ui/modal-common.openFormModal`
  - 决策：只收Promise + Modal + settle 守卫 + 标题 + 内容根；**「先 settle 再 close」的顺序由 helper 保证**。按钮行与快捷键**刻意不收口**（四者按钮集合/行class/提交键语义各异，硬抽即泄漏抽象）

- **节点自绘内容**
  - 入口：`features/content/node-inline-content.ts`
  - 决策：features 统一分段与接管判定，ui 内聚 DOM、样式和内部输入，平台渲染经单一工厂注入；ui 不重复解析或访问引擎。

- **节点自绘内容的装配**
  - 入口：`features/content/node-content-factory.ts`
  - 决策：平台实现 → `InlineContentOptions` 单向绑定（视图与代码块嵌入共用；新增渲染通道只改这一处）

- **节点内代码块 / 数学的宿主侧渲染**
  - 入口：`platform/rendering/code/prism-code.ts` / `platform/rendering/math/math-jax.ts`（官方 `loadPrism` / `loadMathJax`）
  - 决策：注入式：`node-inline-content` 只写字面占位 + 传参；**观感一律内联**（导出 SVG 不含 `styles.css`）

- **节点内 mermaid 图（```` ```mermaid ```` 围栏）**
  - 入口：`platform/rendering/mermaid.ts`（**内嵌 `pele@1.13.0`**）+ `ui/node-content/content-mermaid.buildMermaidElement`
  - 决策：**内嵌而非宿主 `loadMermaid()`**：宿主的兼容层 `render` 是 `async`（源含 `$$` 还要等 MathJax），`window.pele` 又按窗口**懒加载**（实测 popout 里 undefined）——节点内容在 `customCreateNodeContent` 里**同步**构建、引擎随即同步测宽，只有 Pele 本体满足「首帧即最终尺寸」（因此**没有**定稿回调/重排会话）。产物纯 SVG（无 foreignObject），实测与宿主 Pele 1.12.0 对 16 种图类型输出**逐字节相同** ⇒ 节点与阅读视图一致。
  - 详细边界：K191、K173；函数级规则与回归见对应源码和测试。

- **导出图的 MathJax 字体（stretchy 结构）**
  - 入口：`platform/rendering/math/math-jax-fonts.ts`
  - 决策：**私有触点（规则 9 登记）**：字体路径从 `@font-face` 现取（不硬编码），经 `app://obsidian.md` 取字节转 base64，**按克隆里的 `TEX-*` class 裁剪**后以 `data:` URI 内联（全量 24 个 ≈405 KB）。缺口：导出上下文禁用外部资源，不内联则矩阵竖线 / 根号 / 分式线 / 大括号整片消失。

## UI 组件边界（K207）

工具栏和搜索栏的骨架、局部事件及样式内聚于 `ui/toolbar` / `ui/search`。`features/view/view-toolbar` 提供按钮分组与业务动作，`features/view/view-search` 负责引擎搜索/防抖/跳转；组件不引入 features/services/engine。组件重建前与视图关闭时显式销毁，所有 DOM 监听和焦点任务由所属组件清理，搜索防抖由业务适配清理。CSS 源旁置但仍构建成一个发布资产，宿主的加载方式不变；节点自绘内联样式参与测量与导出，本批不迁移它们。


## 节点编辑组件与提交管线（K208）

`features/editing/node-inline-editor` 管理编辑会话与引擎/节点访问，`ui/node-editor` 内聚文本框 DOM、按键/点击、测量与内联样式；UI 不访问引擎。会话与组件各自持有 `EventBinder`，结束编辑立即清理引擎和 DOM 监听，恢复节点 visibility。共享写回唯一源 `features/content/node-content-write`，原编辑模块仅保留仍有调用的单项写回兼容出口；业务调用方直接依赖提交模块，避免任务/配色/联系通过编辑器加载 UI。按键纯语义在 domain，已有保存/撤销/文档会话契约保持不变。

- 输入边界：`core/editor-input` 定义文本、UTF-16 选区、实时来源路径与范围替换；`ui/node-editor/textarea-input` 适配现有 textarea。
  - 依据：节点输入与插件片段编辑采用不同控件，共享上下文和替换语义即可，替换整套编辑器会扩大焦点、尺寸和保存风险。
  - 范围替换优先使用 Chromium 原生插入保留撤销，不支持时用标准 textarea API；只通知 input，不写盘。
  - ESLint 仅在该输入适配器具名放行已弃用的 execCommand；依据是标准范围 API 缺少原生撤销记录，不关闭其它弃用检查。
- 扩展归属：`NodeEditor.useInputBehavior` 统一管理按键优先级、弹层内部点击与释放。
  - 依据：补全交互属于编辑组件，避免每个 feature 再维护一份键盘 hook、控件排除和销毁链。
  - 未消费按键继续原提交；输入法期间跳过扩展；来源路径读取当前 TFile，重命名后不沿用缓存旧值。
- 双链补全：`platform/workspace/wikilink-completions` 只读取官方文件/元数据缓存、模糊搜索及 fileToLinktext；未完成 token 判定与格式生成复用 domain/wikilink。
  - textarea 由 `NodeWikilinkCompletion` 接入统一输入接口；候选显示/选择与 Vault 查询分开，Enter/Tab 选择仅替换原文，后续提交仍经既有会话。
  - 原生空节点经已有编辑防腐面的 observeNodeTextEditor 暴露挂载/关闭通知，`ContenteditableInput` 用文本节点/BR 与 UTF-16 Range 对齐引擎文本；复用同一补全行为和原生插入，不切换空节点编辑器或改引擎提交。引擎重建/销毁释放输入监听与弹层。
  - 官方 AbstractInputSuggest 公开构造参数仅支持 input/div，不能直接绑定现有 textarea；EditorSuggest 依赖宿主 Editor/文件上下文，片段编辑器没有该上下文。因此 textarea 采用轻量宿主样式弹层，CodeTab 使用自己的公开 completion API，不复制其 CodeMirror 编辑器或文件写盘机制。
  - CodeTab 规则只在实际聚焦的导图插件控件内返回候选；sourcePath 来自控件所属 FileView，重命名后实时读取。仅移除自己的注册，不释放共享补全引擎。
  - CodeTab 配套适配允许已注册 Markdown 规则在普通 Markdown 区域运行；代码语言补全优先，围栏及片段保存行为不变。Markdown 匹配由规则负责，避免 CodeMirror 用 `[[` 前缀筛掉候选。
  - 插件尺寸重排同时保护正文 editing 状态及 root 内实际持焦控件；依据是 CodeTab 标题输入不属于正文编辑，重建 DOM 会触发 blur 并提前保存。焦点离开插件后解除这一保护，控件的保存与取消继续由插件负责。


## 节点内容组件（K209）

统一入口仍是 `features/content/node-inline-content` / `features/content/node-inline-html`，后者只读取节点外观与决定接管/截断/段分派。DOM 与内联样式以内容类型旁置在 `ui/node-content`：root/text/link/tag/task/footnote/table/code/mermaid/math/quote。UI 只接收 core 的段与注入类型，以及统一装配器的窄递归回调；解析不下沉、不再写一份 Markdown 判定。原测量属性/DOM 顺序/导出内联样式/缓存注入和交互属性保持，节点内容组件不保存文件、不逐元素绑事件。

## 当前数据契约（K213）

历史兼容已移除：启动不扫描迁移旧属性，文件与嵌入只读当前布局名称，配色只收当前 id/自定义 hex，数值设置只收有限数字。ViewStateStore.hydrate 仅投影当前字段，不返回迁移标志也不排写盘。纯图片节点不把文件名当作文本，显式文件名文本正常保存。保留当前 Markdown 往返、保存/冲突/撤销、引擎 id 转换和实际宿主能力适配；显示品牌已独立，插件标识和存储格式沿用当前契约（见 K37）。

## 能力模块入口（K220）

- `engine/index.ts` 是唯一引擎防腐出口；实现分 runtime、nodes、viewport、theme，导出仍为叶子文件。
- `markdown/index.ts` 统一公开解析、序列化、语法编辑和打开能力；内部按 outline、serialize、syntax、links 组织。
- `services/document/index.ts` 提供共享会话与注册表；历史和保存管线由文档能力内部管理。
- `services/engine/index.ts` 提供引擎控制器；依赖、选项和视口状态留在模块内部。
- index 只具名转出；规则在 `scripts/module-boundaries.mjs` 唯一定义，依赖图测试覆盖外部深层引用与内部反向 import。
- 快照预算归 `core/history-budget.ts`，文档会话不用为了纯计算加载引擎运行时。

## 文档模型与扩展（K221）

- 领域模型见 `domain/document/model.ts`，源码绑定见同模块 node-meta/source；公共入口为 index。
- 解析结果保留文件头、空白分隔、原始正文和权威树；DocumentService 不另复制加载字段，DocumentSession 仍独占撤销与写盘。
- 树结构不依赖 vendor 类型，当前渲染字段通过 `core/node-data.ts` 的适配与泛型携带；这是结构边界基础，后续按需求逐步收紧投影字段。
- 持久化语义以 Markdown 标准为准；未知字段不自动序列化，当前 H1 与虚拟根行为保持。

## 领域能力与测试归属（K222）

- document 聚合模型、源码、声明、文件命名和树操作；links 聚合 URL/双链/别名；content 聚合任务/callout/表；relations 聚合指令/联系/概要/锚定。
- URL 与双链纯规则属于 domain/links，实际 Vault 文件索引仍属于 src/links；不合并这两个依赖层。
- 每个能力只具名转出跨模块使用的 API；颜色数学与编辑按键作为跨能力叶子保留，根目录叶子清单由依赖脚本和契约检查。
- tests/domain 对齐四个目录；综合域测试拆成双链与树两文件，任务测试移至 content，不改变测试主体或产品语义。

## 统一发版记录（K214）

- CHANGELOG 唯一维护用户可读的版本变化和 base → feat 完成快照；历史详细版本文件与映射 JSON 合并后移除，标签保持。
- 每版 2～3 条短说明；尚未发版的 Fork 功能放在未发布区，避免并入历史 0.3.3。
- release-notes.mjs 按二级标题提取目标版本，忽略代码围栏中的标题，缺失/重复/空条目拒绝发布；版本同步提示与 release workflow 共用该入口。

## 项目根模块别名（K223）

- @/ 对应仓库根，跨目录 TS 模块和测试 mock 引用使用该别名；同目录 ./ 保持简洁。
- tsconfig paths、Vitest resolver 与 esbuild 自动配置解析对齐；真实依赖图解析别名目标，ESLint 禁令也覆盖 @/src，不把别名当外部 npm 包跳过。
- 直接由 Node 加载的 scripts/config、文件 URL 与 Markdown 链接保留可直接运行和点击的路径，避免引入额外加载器。

## 节点级布局（K224）

- 语义在 `domain/document/node-layout.ts`：值解析、指令段读取、`mdSide`/`mdFold` 与引擎 `dir`/`expand` 投影。
- 解析与原文写回在 markdown 层统一调用；指令行本身仍由通用指令体系保存，未编辑逐字回写。
- 交互在 `features/canvas/view-node-layout.ts`：右键方向/折叠 + 接管引擎折叠按钮（capture），写入走 `applyRawNodeContents`，一次渲染/保存/撤销。
- 方向仅首层分支与 mindMap/timeline/fishbone；`auto` 与展开不写属性，避免冗余指令。
- 折叠/展开资格检查完整数据树，而非渲染树；折叠的子节点可能没有渲染实例。
