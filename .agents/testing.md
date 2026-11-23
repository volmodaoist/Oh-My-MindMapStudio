# 测试与验收

## 自动化门禁

入口：`npm run check:gates`。固定顺序为 build → test → lint，附加项由 `scripts/check-gates.mjs` 根据变更集计算。

- `--dry-run`：检查规模并显示计划；不执行测试。
- `--fix-lines`：只回填索引豁免行数。
- `--all`：包括 vendor 重打包，需先安装 BUILD.md 所列打包依赖；普通代码改动使用默认变更集计划。

| 范围 | 命令与目的 |
|---|---|
| 类型与构建 | `npm run build`，检查 src、tests 与被纳入的配置 |
| 单元与契约 | `npm test`；迭代可用 `npx vitest run tests/<path>.test.ts` |
| 依赖与规范 | `npm run lint`，在插件根目录执行 |
| CSS | `npm run lint:css`，检查源样式与发布 styles.css |
| 文件与导出 | `npm run check:dead-code`，检查未使用文件、导出和类型 |
| 发布元数据 | `npm run check:release`，版本、CHANGELOG、README 与许可 |
| vendor | `npm run build:vendor -- --check`，补丁与 sha256 契约 |
| 真浏览器渲染 | `npm run verify:visual -- --require-chrome` |

## 测试归属

- 模块测试对齐 src 的能力目录；domain 的 document/links/content/relations 与同名测试目录对应，根测试仅覆盖已登记叶子；组合根测试留在 tests 根目录。
- `tests/contracts/` 检查依赖矩阵、模块出口、索引、标准文档、vendor、构建与安装。
- `tests/helpers/`、`tests/mocks/`、`tests/fixtures/` 提供共享支持；测试直接调用内部纯逻辑，不扩大公开 API。
- Markdown 回归
  - `tests/markdown/document-contract.test.ts`：原始分段、虚拟根、插件围栏与派生字段写回边界。
  - `tests/markdown/md-roundtrip.test.ts`：具体语法与边界。
  - `tests/markdown/md-roundtrip-property.test.ts`：fast-check 往返性质与规范化不动点。
- DOM 替身
  - 保持与真实具名导入一致；新增宿主符号同时核对 Obsidian mock 和视觉 shim。
  - 替身测试验证逻辑，真实布局、命中和活组件生命周期由浏览器验证。

## 文档与模块契约

- `agents-md-sync.test.ts`
  - 读取唯一 `.agents/index.md`；完整路径登记源码/测试，拒绝陈旧或重复项。
  - 检查参考文档存在、K 编号和引用、表格列数与规模漂移。
- `module-boundaries.test.ts`
  - 按解析后的路径检查层级许可、组合根隔离和运行时循环。
  - 公共入口规则来自同一矩阵；入口不能隐藏深层访问或自导入。
- `docs-standard.test.ts`
  - 校验 Markdown 标准目录、章节指针、当前版本和合法字段映射。

## 视觉与宿主验收

- `verify:visual` 使用真实引擎与仓库 CSS，检查节点几何、编辑自适应、拖拽、视口、小地图、主题和导出。
- `--bench-open` 测量大图打开基线；历史毫秒和体积只作参考，比较时重新测同轮对照。
- 交互与插件内容
  - 点击空白不创建节点；显式新建和节点编辑继续正常。
  - 结构拖拽自动归位，视口保持；默认拖拽平移偏好保留。
  - CodeTab 使用活 DOM，切换标签或异步内容就绪后重测，删除/关闭时释放。
- Obsidian 实机
  - 安装后 reload，重新启用并确认插件实例存在，再读取 dev:errors。
  - 保持窗口可见：引擎初始化使用 rAF，完全遮挡时可能不执行。
  - 验证同文件多视图广播、撤销/重做、外部修改、重命名引用更新与纯浏览零写盘。
  - 中文 IME、第三方主题 CSS 和拖拽手感仍需人工验收。
- 自动宿主回归可用 `scripts/verify-plugin-obsidian.mjs` 与 `scripts/verify-wikilink-obsidian.mjs`；联测 CodeTab 时按脚本要求提供产物路径，使用临时库。

## CI

- lint workflow：发布元数据、构建、测试/覆盖率、lint、CSS、死代码和 scanner；具体顺序以 workflow 为准。
- 视觉 CI 当前为非阻断，但要求 Chrome 且归档失败日志；本地渲染变更仍必须通过视觉门禁。
- release workflow 自带 tag/CHANGELOG 条目检查与发布门禁，不能依赖 branch workflow 替代。
- 未运行的测试不标为通过；自动化结果与人工验收分别记录。
