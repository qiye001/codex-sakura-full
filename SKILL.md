---
name: codex-sakura-full
description: 在 Windows 安装、迁移、检查和维护 Codex 落樱完整版外观：原图壁纸、Wallpaper Engine 本地导入、原版开场动画、统一设置与桌面图标。用于此扩展的安装和修复，不用于一般 Codex 账户或 API 配置。
---

# Codex 落樱完整版

此技能包含可部署的 Windows 引擎与两个项目的源码，按用户要求安装、迁移、修复或编辑外观。实际设置界面在 Codex 内，日常使用只需桌面 Codex 图标，无需另开壁纸管理软件。

## 安装或迁移

先读 [完整使用说明](README.zh-CN.md)。以本 SKILL.md 所在目录为包根目录，不依赖原电脑路径或当前工作目录。

1. 运行包根目录的 `Verify.ps1 -FilesOnly` 校验文件；用 `Install.ps1 -CheckOnly` 检查正式 Store 版 Codex 与便携 Node。
2. 使用包根目录 `Install.ps1 -Launch` 安装。它创建桌面 Codex 快捷方式、开始菜单入口和当前用户技能；保存已有设置，备份旧引擎，不修改官方包。
3. 普通官方会话无法事后开启调试连接。若该会话正运行，安装器会保留它并说明需要正常退出一次；不要自行强杀、清理用户资料或改用户数据目录来实现接入。已有调试会话可直接恢复。
4. 用 `scripts/diagnose.ps1` 检查当前状态。主窗口中壁纸入口应仅一个，媒体已解码，状态为 ready。实际新电脑冷启动尚未测试时如实区分本地测试和目标机验证。

包中便携 Node 无需全局安装。默认壁纸采用落樱原始素材，动画采用原项目默认头像、背景、轮廓与文字；原电脑的上传媒体、字幕、Workshop 图像注册表和账户资料均不在包内。再次安装默认保留目标电脑现有选择。

## 当前会话修复

读 [启动与兼容性排查](references/troubleshooting.md)，先查看目标机 `%LOCALAPPDATA%\SakuraUser\launch.log`、`injector-status.json` 和 `injector-error.log`，再诊断实际图标、包版本、浏览器 ID、端口及本扩展 helper 身份。

正常图标启动不得停止正在运行的 Codex。缺失 helper 可以恢复；只替换明确属于本引擎的辅助进程，不凭记录中的 PID 终止其他进程。不通过复制 cookies、改账号资料路径或清理浏览器存储处理外观故障。官方更新可能改变 DOM/CDP，无法承诺未来版本自动兼容或账号永不要求登录。

若只需恢复官方外观，执行 `Uninstall.ps1 -RestoreOnly`；移除引擎使用 `Uninstall.ps1`，两者均保留账户、聊天与保存的个人选择。

## 编辑与重新打包

读 [实现与会话成果](references/architecture.md) 以及 [验证范围](references/VALIDATION.md)。常规图片、文字和字幕字体直接通过统一外观设置修改；调整动画时间轴、转场或线稿才编辑源码，并运行 `assets/launcher/scripts/build-startup.mjs` 重建。

保持侧栏贴合原项目：同一张清晰壁纸，内部两栏透明，外层只有 18% 轻暗层，无单独磨砂块；输入框本身的表面、原生按钮和菜单仍应清晰。不要用低分辨率预览替代实际背景。Workshop 原视频直接读取，明确的单底图场景按需读取原始 PNG/JPEG；多层/Spine/网页和未取得可靠原素材的项目隐藏。缓存应按源包指纹失效。

修改启动、媒体或设置代码后运行相关包内测试；保留当前聊天，不为了测试擅自重启应用。重新分发时使用两个上游原始默认素材，排除测试证据、状态文件、私有图片文字、原始 Workshop 缓存与账户数据，更新 MANIFEST.json 和 ZIP。

[来源与许可](references/SOURCES.md) 记录上游提交、素材范围和便携运行时归属。
