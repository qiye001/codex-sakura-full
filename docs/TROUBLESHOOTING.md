# 故障排查

先确认问题发生在安装、快捷方式启动、官方应用打开，还是外观加载。不要把安装输出成功当成外观成功。

| 问题 | 检查与处理 |
|---|---|
| 找不到路径或 run-hidden.vbs | 确认下载的是完整 Release、已全部解压，重新运行 Install.cmd。桌面图标必须由本机安装器生成，不复制其他机器的 .lnk。v1.0.2 以 Unicode 写入快捷方式，使用完整运行器路径和引擎内相对脚本，不依赖调用方工作目录或维护者电脑的公共路径映射。 |
| 找不到 Node | Source code ZIP 不含 node.exe；普通用户下载 Release 安装包，开发者安装 Node 22+。运行 Install.ps1 -CheckOnly 获取检查结果。 |
| 完整性失败 | 保存完整错误、重新下载并解压；自行编辑源码后需由维护者重新生成清单。校验清单是传输检查，不是发布者签名。 |
| 官方 Codex 找不到 | 从 Microsoft Store 安装官方应用，并在当前 Windows 用户下启动一次。便携副本或其他用户注册的安装不等同于受支持的 Store 注册。 |
| 应用打开但无壁纸 | 查看 launch.log；普通官方会话没有调试连接，保存输入后从菜单退出整个应用，再点击主题版桌面 Codex 图标。 |
| 只关闭窗口后仍无效 | 主进程可能仍留在后台。使用应用退出功能；不要让脚本强杀主进程或清理账号资料。 |
| 状态 starting / restoring | 界面可能尚未就绪；检查辅助进程日志与心跳。脚本会重试，不应为等待而强制重启官方应用。 |
| 重复点击弹错 | 记录 launch.log、浏览器端口、helper PID；健康重复点击应复用同一 helper。若路径/版本不一致，完整重装并再次诊断。 |
| 辅助进程退出 | 查看 injector-error.log；核对文件完整性、Node 版本、官方更新与本项目版本。不要凭旧 PID 终止无关进程。 |
| 壁纸入口缺失或错位 | 官方 DOM 可能更新；提供版本和脱敏截图，等待适配。宠物或分离窗口不应注入完整主题。 |
| 图片模糊 | 核对原图尺寸；列表缩略图不是大背景。Workshop 无可靠原图的项目可能无法应用。 |
| 图片有空白区域 | 检查是否选择完整显示；宽高比不同出现留白是该适配方式的正常结果。 |
| 视频不能播放 | 编码可能不受 Chromium 支持；尝试常见 H.264 MP4 或 WebM。失败时应保留原背景。 |
| 新 Workshop 项目没出现 | 等待扫描或重开设置；确认本机 Steam 库和项目文件存在。复杂场景并不全部支持。 |
| 登录失效或要求重新登录 | 先检查官方服务和包更新，不删除官方资料、不复制 Cookie、不添加自定义 user-data-dir。 |
| PowerShell 策略阻止 | 使用发布包的 Install.cmd；该进程使用 Bypass，不修改全局策略。被企业策略或安全软件拒绝时记录原因，不关闭防护强行绕过。 |
| 安装正在进行 | 等待当前启动/安装锁释放，不反复并行运行安装器。 |

## 收集诊断

在解压包目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Verify.ps1 -FilesOnly
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1 -CheckOnly
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\diagnose.ps1
```

检查 `%LOCALAPPDATA%\SakuraUser` 中的 launch.log、injector-error.log、injector-status.json。报告前删除用户名、本机私有路径、聊天内容和个人媒体信息。不要提供任何凭据或 Cookie。

## 结束外观会话

从包目录运行 `Uninstall.ps1 -RestoreOnly` 恢复样式，再正常退出官方应用并从官方入口打开。不要删除用户资料目录；本项目不以重置账号资料解决外观故障。
