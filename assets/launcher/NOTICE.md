# 声明与归属

## 上游归属

本仓库的部分主题资源与渲染器代码修改自 `Fei-Away/Codex-Dream-Skin` 的 Windows 实现：

- 上游仓库：https://github.com/Fei-Away/Codex-Dream-Skin
- 上游版权：Copyright (c) 2026 Codex Dream Skin Studio contributors
- 上游许可证：MIT，全文见 [LICENSE](LICENSE)

下列文件属于在上游基础上的修改版本：`assets/dream-skin.css`、`assets/renderer-inject.js` 与 `assets/theme.json`。本项目同样使用外部、仅回环地址的 CDP 注入方式。

## 示例素材与商标

`落樱` 是维护者创作的示例主题名称，不指向、不以名称描绘、也不声称获得任何角色、作品、艺术家或权利方的认可。内置壁纸、图标和宣传截图由维护者授权随本仓库、其 Fork 和发布包公开再分发；它们不属于 MIT 软件许可证的授权范围。素材不得被单独授权、转售或用于暗示任何第三方的认可。具体范围见 [assets/ARTWORK_NOTICE.md](assets/ARTWORK_NOTICE.md)。

本项目不是 OpenAI 官方产品，不受 OpenAI 认可、赞助或背书。OpenAI、Codex 名称、标识、产品外观与应用二进制文件均不由本仓库授权。

## 运行时安全

主题通过 `127.0.0.1` 上的 Chromium DevTools Protocol 注入。同一 Windows 用户下的其他进程可能在 Codex 运行时连接该调试端口。请将主题会话视为敏感状态，结束使用时关闭 Codex 或运行还原脚本。
