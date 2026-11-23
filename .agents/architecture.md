# 架构与模块边界

## 分层

依赖许可唯一定义在 `scripts/module-boundaries.mjs`；ESLint 与真实依赖图测试共同检查。

- `domain/`：纯领域规则与文档模型；文档模型、源码绑定在 document 能力模块，不依赖宿主或引擎。
- `core/`：共享机制、输入接口和渲染适配类型。
- `links/`、`markdown/`、`media/`、`engine/`、`platform/`：各自的基础能力。
- `ui/`：组件 DOM、局部样式与内部输入；`services/`：文档会话和引擎协调。
- `features/`：业务交互编排，通过窄接口使用下层能力。
- 组合根：`main.ts`、`commands.ts`、`settings.ts`、`creation.ts`，负责生命周期与装配。

精确许可以脚本为准，本文不另抄矩阵。源码与测试清单见 [索引](index.md#代码结构索引)。

## 能力模块

- 第一层目录表示依赖组；第二层按共同状态、契约与变化原因聚合能力。
- 多文件能力通过显式公共出口连接；叶子工具可以保留单文件。
- `index.ts` 仅具名导出公共 API 和类型，不初始化服务、注册事件或引入副作用。
- 模块内部直接使用内部文件，避免经自身 index 形成循环。
- 公共入口迁移与访问规则记录在同一依赖脚本中；纯逻辑测试可以直测内部实现。
- 引擎只保留一个正式防腐入口；业务模块不访问 `renderer`、节点 DOM 或 vendor。

## 领域能力与测试目录

- `domain/document/`：文档模型、源码绑定、文件命名、启用/布局声明与通用树操作。
- `domain/links/`：URL、双链、路径和显示别名的纯语义；Vault 文件解析仍由上层 links 负责。
- `domain/content/`：任务、callout 与管道表的内容规则。
- `domain/relations/`：独立指令块、联系、概要与锚点几何。
- `color.ts`、`node-edit-key.ts`：跨能力使用的单文件叶子，保留在领域根目录。

`tests/domain/` 使用同样的四个能力目录；根目录用例对应叶子工具。
原综合 domain 用例按现有 describe 边界拆成双链测试与树测试，断言保持；任务测试归入 content。
领域根叶子与能力入口统一登记到 `scripts/module-boundaries.mjs`，新文件不能无登记继续堆在根目录。

## 项目根路径

- `@/` 对应项目根目录，例：`@/src/domain/document`、`@/tests/helpers/node-content-dom`。
- 源码/测试跨目录模块引用使用根别名，同目录保留 `./`；公共入口与内部访问边界照常执行。
- TypeScript 在 tsconfig paths 中定义，esbuild 按项目 tsconfig 解析，Vitest 配置相同根目录。
- Node 直接执行的脚本、文件读取/URL 和 Markdown 可点击链接仍使用其原生支持的路径。

## 当前公共入口

- `domain/document/index.ts`：文档模型、来源、声明、文件身份与树操作。
- `domain/links/index.ts`：链接纯语义。
- `domain/content/index.ts`：内容规则。
- `domain/relations/index.ts`：联系、概要与指令。
- `markdown/index.ts`：解析、序列化、语法编辑与打开能力。
- `services/document/index.ts`：共享文档会话与注册表。
- `services/engine/index.ts`：引擎创建、监听与视口恢复协调。
- `engine/index.ts`：引擎防腐 API，内部按 runtime/nodes/viewport/theme 归组。

单文件工具和已有 UI/特性目录继续沿用所属接口；随需求扩大时再收紧边界，避免一次建立大量空壳入口。

## 数据与组件

- Markdown 解析与序列化成对维护；未编辑原文、纯浏览零写盘是硬契约。
- 同文件多个视图共享一个 DocumentSession：权威树、撤销历史、保存管线各一份。
- 各视图持有自己的引擎、视口和选择；渲染、测量和预览不能另建写盘通道。
- UI 内聚骨架、样式、焦点与输入；文件提交、引擎和宿主能力通过 Ports 注入。
- 后续能力扩展所属模块的契约，避免把整个 View 暴露给新的业务控制器。

## 文件规模

- 拆分按职责和共享状态判断，避免把同一判定摊到多个实现。
- 超过 300 行的源文件在 [索引豁免表](index.md#文件规模与豁免) 登记理由；未登记超限只允许减少。
- `check:gates` 核对未登记超限；索引测试核对登记漂移，阈值为双向 `min(15%, 50 行)`。
- `npm run check:gates -- --fix-lines` 回填当前行数；规模和执行结果由同一检查脚本输出，历史详情查 Git。
