# 开发与发布流程

## 小步开发

- 确定职责
  - 查相关决策、Markdown 标准与现有公共入口。
  - 新能力放入最接近的模块；新增一级组先在依赖矩阵定层。
  - 宿主能力先查 `obsidian.d.ts`；私有触点必须防御并登记。
- 实现与检查
  - 纯逻辑直接测试，DOM 与渲染跑视觉门禁；详见 [testing.md](testing.md)。
  - 更新下表要求的文档，回填豁免行数。
  - `npm run check:gates`：按变更集执行，首败即停，全绿后才能提交。
- 提交
  - 仅在用户授权的分支和范围内提交；逐项暂存，保护其它工作区改动。
  - 提交说明写入临时文件，先运行 `python3 .github/check-commit.py <文件>`，再 `git commit -F <文件>`。
  - 标题简短，正文说明改动与决策依据；不添加署名或工具标记。
  - 不自动推送、创建远程 PR 或发布。

## 文档维护规则与同步义务

| 变更 | 唯一维护位置 |
|---|---|
| 新增、删除、重命名 src/tests 文件 | `index.md` 的分层文件链接；索引契约强制 |
| 新增、删除文档 | `index.md` 参考文档；链接必须真实存在 |
| 跨文件行为与架构决策 | `decisions.md` 的结论、`conventions.md` 的简短摘要 |
| 单文件实现细节 | 源码文件头或函数契约 |
| Markdown 数据格式 | `docs/markdown-mindmap-standard.md`；修订说明记同目录 history |
| 固定规则、读取入口或门禁命令 | `AGENTS.md`；门禁映射同步 `scripts/check-gates.mjs` 与测试 |
| 新增 K 条目 | 保留稳定编号，更新 conventions 与 index 的最大编号；不复用编号 |
| 超过 300 行文件 | `index.md` 豁免表，使用 `--fix-lines` 回填 |
| vendor 补丁 | patches → build:vendor → BUILD.md 与 vendor 契约的 sha256 |
| 批次收尾 | `line-count-log.md` 追加提交摘要、依据、真实检查结果 |

- 文档写法：主题 → 结论 → 必要边界，使用分层 bullet。
- 同一事实只展开一次；其它文件给指针，避免复制代码与排查过程。
- 当前契约允许破坏性演进；加载不自动迁移或清洗文件，Markdown 保真继续有效。

## 本地安装

- `make install vault="/path/to/vault"`：校验已有 `.obsidian`，构建并复制 manifest.id 对应的三件套。
- 默认 vault 由 Makefile 配置；中文和空格路径通过环境变量传递。
- 安装器备份旧三件套与 data.json，复制后核对 SHA256；笔记、设置和插件启用清单保留。
- 安装后重载 Obsidian 并确认插件已启用。单纯停用/启用不能保证重新 require main.js。
- `make dev/build/test/test-watch/lint/check` 包装既有 npm 命令，`make help` 查看入口。

## 发布

- 更新版本
  - `npm version patch|minor|major` 同步 package、manifest、versions 与 lockfile。
  - 同步 Markdown 标准的版本指针和 `docs/release-notes-<tag>.md` 双语发布说明。
  - 不用 `npm version --dry-run`：生命周期仍可能写盘。
- 检查与产物
  - 发布前完成门禁与本地视觉验证；CI 以实际 workflow 为准。
  - `.npmrc` 的 tag-version-prefix 为空；Release tag 必须等于 manifest.version。
  - 分发 `main.js`、`manifest.json`、`styles.css`、LICENSE 与第三方许可声明。
- 发布操作
  - tag 触发 release workflow 创建草稿，由用户 Publish。
  - 保留作者版权和第三方许可；本地优先，无遥测或 vault 内容上传。

提交标题沿用项目习惯：版本提交为版本号，功能/修复可用简短 K 编号，文档/工程可用 docs/chore。
详细依据放正文，不在标题堆积说明。
