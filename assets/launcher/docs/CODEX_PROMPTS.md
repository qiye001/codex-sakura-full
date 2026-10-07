# 发给 Codex 的安装与定制提示词

本文件中的内容是可复制给 Codex 的任务提示词，不是 Codex 的内置斜杠命令。Codex 仍会在需要执行 PowerShell 或写入本机文件时按其自身权限流程请求确认。

## 安装当前预设：落樱

将下面整段内容发送给 Codex。它下载固定的 `v1.1.1` 发布包，并使用同一发布页的 SHA-256 文件校验下载结果；不会使用 `Invoke-Expression`、不会直接执行网络响应。

```text
请在当前 Windows 用户下安装 Codex Windows 主题启动器的内置预设“落樱”。

发布包：
https://github.com/syiibfs-hash/ritual-ink-codex-theme-launcher/releases/download/v1.1.1/CodexThemeLauncher-v1.1.1.zip
校验文件：
https://github.com/syiibfs-hash/ritual-ink-codex-theme-launcher/releases/download/v1.1.1/CodexThemeLauncher-v1.1.1.zip.sha256

请严格按以下要求执行：
1. 仅支持 Windows。先检查 Microsoft Store 官方 OpenAI.Codex 应用和 PATH 中的 Node.js 22+；任一条件不满足则停止并说明原因。
2. 将 ZIP 和 .sha256 下载到临时目录；读取 .sha256 文件中的 SHA-256 值，计算 ZIP 的 SHA-256 并比较。不匹配则停止，绝不解压或执行。
3. 校验通过后，将 ZIP 解压到 %LOCALAPPDATA%\CodexThemeLauncher\packages\falling-sakura-v1.1.1；不要改写 WindowsApps、app.asar、注册表、API Key、Base URL、登录信息、项目或插件设置。
4. 从解压目录运行 install.ps1，并传入 -ShortcutName "Codex - 落樱"。安装器创建的桌面与开始菜单快捷方式应保持隐藏启动，不打开额外终端或托盘窗口。
5. 运行安装后 engine\scripts\injector.mjs 的 --self-test，主题目录使用 %LOCALAPPDATA%\CodexThemeLauncher\active-theme。不要自动关闭或启动当前正在使用的 Codex 窗口。
6. 最后只报告下载版本、SHA-256 校验结果、安装目录、创建的快捷方式和自检结果。

不要使用 Invoke-Expression、irm | iex、未经校验的 main 分支下载，或任何与上述工作无关的操作。
```

安装完成后，点击 `Codex - 落樱` 快捷方式进入主题版。首次主题启动可能需要重启已打开的 Codex；因此应先发送或保存未完成的输入。

## 根据参考图创建自定义主题

先在当前对话上传你拥有使用权的参考图，再将下列内容发送给 Codex。参考图只用于提取视觉方向；不要把来源不明、带 UI 的截图或受限制素材直接作为公开预设发布。

```text
请基于我刚上传的参考图，为已经安装的 Codex Windows 主题启动器创建一个新的本地自定义主题。

目标：
- 主题 ID：preset-[仅小写字母、数字和连字符]
- 显示名称：[主题名称]
- 外观：dark 或 light
- 强调色：#[六位十六进制颜色]
- 文字安全区：left、center、right 或 none
- 任务页表现：ambient、banner 或 off

要求：
1. 参考图仅用于视觉方向。若当前环境支持图像生成，请基于其色彩、构图和氛围生成一张新的、干净的 16:9 壁纸；不要复刻角色、Logo、文字、水印或 UI。若无法生成图片，先要求我提供一张可用的纯壁纸。
2. 将新壁纸保存为无歧义的英文文件名，大小不超过 16 MB。不要把带 UI 的截图作为壁纸。
3. 仅调用 %LOCALAPPDATA%\CodexThemeLauncher\engine\scripts\set-background.ps1 更新活动主题，并传入 -ImagePath、-Variant、-Accent、-ThemeId、-ThemeName、-FocusX、-FocusY、-SafeArea 和 -TaskMode。
4. 保持原生布局、输入可点击性、宠物透明窗口兼容、固定任务栏官方图标和缩略图自定义图标策略不变。
5. 不修改 WindowsApps、app.asar、API Key、Base URL、登录信息、项目、插件或其他官方应用文件。不要删除原有预设或覆盖原始素材。
6. 完成后运行 injector.mjs --self-test，并报告壁纸路径、主题 ID、显示名称和自检结果。
```

自定义主题只写入当前 Windows 用户的 `%LOCALAPPDATA%\CodexThemeLauncher\active-theme`，不会自动上传到 GitHub。要公开新预设前，请先确认壁纸、图标和参考素材具有可再分发权利。
