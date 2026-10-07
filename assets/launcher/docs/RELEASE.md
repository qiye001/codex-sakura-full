# 发布流程

## 本地验证

在 Windows PowerShell 中运行：

```powershell
node --check .\scripts\injector.mjs
node --check .\assets\renderer-inject.js
node .\scripts\injector.mjs --self-test --theme-dir .\assets
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\build-release.ps1 -Version v1.1.1
```

构建完成后，`dist` 目录会生成带顶层目录的 ZIP 与同名 `.sha256` 文件。发布前比较本地 SHA-256 与 GitHub 资产摘要，并确认压缩包不含 `.git`、状态文件、日志、私有壁纸或认证信息。

## GitHub Release

1. 提交并推送版本变更，创建对应的 Git 标签。
2. 上传 `dist` 中的 ZIP 和 `.sha256` 文件，使用版本号作为 Release 标题。
3. Release 发布后，下载资产并再次核对 SHA-256。
4. 更新 README 的发布链接、兼容性基线与更新日志。

素材、截图和图标的公开再分发必须符合 [素材声明](../assets/ARTWORK_NOTICE.md)。
