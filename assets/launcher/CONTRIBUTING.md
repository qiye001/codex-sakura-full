# 贡献指南

## 适合贡献的内容

- 新版 Codex 的兼容性验证与最小修复。
- 可读性、无障碍性、性能和宠物窗口兼容性改进。
- 不包含私人信息、UI 截图或受限素材的主题预设。
- 安装、还原和文档问题的修复。

## 提交要求

1. 从最新 `main` 创建分支，保持改动聚焦。
2. 不修改 `WindowsApps`、`app.asar`、官方签名或 Codex 配置、账户、API Key/Base URL。
3. 不提交 `%LOCALAPPDATA%\CodexThemeLauncher` 中的状态、日志、认证信息或私人壁纸。
4. 修改脚本后运行 PowerShell 语法检查、`node --check` 和 `node .\scripts\injector.mjs --self-test --theme-dir .\assets`。
5. 提交 PR 时说明测试的 Windows、Codex 和 Node.js 版本，并提供已脱敏的截图或日志。

主题素材必须由贡献者拥有使用与公开再分发权，或明确使用兼容许可证。不要提交角色、商标、人物肖像或来源不清的素材。
