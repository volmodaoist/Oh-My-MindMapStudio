# 开发文档入口

从 [index.md](index.md) 搜索文件、能力或 K 编号，按需读取相关段落。

- 开发前
  - [架构](architecture.md)：模块职责、公共入口与依赖边界。
  - [决策](decisions.md)：跨文件行为的权威结论。
  - [约定](conventions.md)：按主题整理的摘要；K 编号稳定，方便源码引用。
- 修改与验收
  - [流程](process.md)：文档维护义务、提交与发布。
  - [测试](testing.md)：自动化门禁、视觉验证与实机边界。
  - [Markdown 标准](../docs/markdown-mindmap-standard.md)：当前数据契约。
- 按需查证
  - [基线](baseline-metrics.md)：历史性能读数，使用前重新测量。
  - [检查脚本](../scripts/check-gates.mjs)：自动统计规模并执行门禁；历史变化查 Git。
  - [CHANGELOG](../CHANGELOG)：简短版本变化和 base → feat 源码快照。

规则冲突时先遵守根目录 `AGENTS.md`，数据格式以 Markdown 标准为准。
逐文件清单和当前规模只在索引维护；实现细节写在源码契约中。
K 编号只用于定位，不表示主题、优先级或当前版本。
