# 自定义主题指南

## 快速替换壁纸

1. 准备一张纯壁纸。推荐 16:9；将主体避开你常输入文字的一侧；不要包含 Codex 窗口、文字、按钮或截图。
2. 安装启动器后运行：

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File "$env:LOCALAPPDATA\CodexThemeLauncher\engine\scripts\set-background.ps1" `
  -ImagePath "C:\path\to\wallpaper.jpg" `
  -Variant dark `
  -Accent "#c58ac8" `
  -ThemeId "preset-my-theme" `
  -ThemeName "我的主题" `
  -FocusX 0.72 `
  -FocusY 0.45 `
  -SafeArea left `
  -TaskMode ambient
```

3. 如果 Codex 没有通过主题快捷方式运行，重新从生成的 `Codex` 快捷方式启动。

该命令会将壁纸复制到活动主题目录、更新 `theme.json`，并在主题会话已运行时重新注入。`-ThemeId`、`-ThemeName`、`-FocusX`、`-FocusY`、`-SafeArea` 和 `-TaskMode` 均可选；省略时保留当前预设配置。主题 ID 仅允许小写字母、数字和连字符，主题名最多 80 个字符。

## 创建有名称的预设

将 `assets/theme.json` 与你的壁纸放在同一主题目录，并修改以下字段：

```json
{
  "id": "preset-my-theme",
  "name": "我的主题",
  "image": "my-wallpaper.jpg",
  "appearance": "dark",
  "palette": { "accent": "#c58ac8" },
  "art": {
    "focusX": 0.72,
    "focusY": 0.45,
    "safeArea": "left",
    "taskMode": "ambient"
  }
}
```

`focusX` 和 `focusY` 范围为 `0` 到 `1`，用于选择画面焦点。`safeArea` 是文字应保持清晰的一侧，可用 `left`、`center`、`right` 或 `none`。`taskMode` 可用 `ambient`、`banner` 或 `off`。

## 可直接粘贴给 Codex 的提示词

上传你的纯壁纸，然后将以下提示词粘贴给 Codex。发送前替换方括号中的内容。

```text
请把这张纯壁纸配置为 Codex Theme Launcher 的新预设。不要修改 WindowsApps、app.asar、Codex 登录信息或任何官方应用文件。

目标：
- 主题 ID：preset-[theme-id]
- 显示名称：[theme name]
- 外观：dark 或 light
- 强调色：[hex color]
- 壁纸焦点：focusX=[0-1]，focusY=[0-1]
- 可读文本安全区：left、center、right 或 none
- 任务页表现：ambient、banner 或 off

请仅执行以下工作：
1. 将我提供的纯壁纸复制到主题 assets 目录，并使用无歧义的英文文件名。
2. 更新 theme.json 中的 id、name、image、appearance、palette.accent 和 art 字段。
3. 保持现有原生布局、输入框可点击性、宠物透明窗口兼容性、任务栏官方图标，以及缩略图自定义图标策略不变。
4. 不要把带 UI 的预览截图作为壁纸，不要修改无关文件。
5. 完成后运行现有注入器自检，并报告修改的文件和验证结果。
```

## 生成壁纸的提示词

```text
为编程应用生成一张干净的 16:9 桌面壁纸：[视觉风格]、[主体]、[颜色方案]。左侧三分之一保持低细节、低对比，方便放置导航和文字；视觉焦点位于[右侧/中央]、约 45% 高度。不要出现 UI、窗口、按钮、文字、Logo、水印或角色名称。画面需要有清晰轮廓、克制对比和专业插画质感。
```
