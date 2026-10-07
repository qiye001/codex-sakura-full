# 开发与打包

## 目录

| 目录 / 文件 | 用途 |
|---|---|
| Install.cmd / Install.ps1 / scripts/install.ps1 | 安装入口与正式安装流程 |
| Verify.ps1 / MANIFEST.json | 文件完整性、脚本与行为验证 |
| Uninstall.ps1 / scripts/diagnose.ps1 | 恢复、卸载和当前连接诊断 |
| assets/launcher | Windows 引擎、主题、媒体读取、统一设置与测试 |
| assets/codex-startup-animation | 固定基线的上游动画源码与默认素材 |
| references | 原有来源、许可与实现资料 |
| docs | 公共用户、开发和验证说明 |
| tools | 清单生成、发布包构建、真实快捷方式路径回归测试 |

## 从源码验证

源码仓库不包含 node.exe；安装 Node 22+，再在仓库根运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Verify.ps1
```

Verify 对清单逐文件核对，运行 payload self-test、媒体/场景/浏览器协议测试、PowerShell 启动场景，以及真实 Windows Script Host 快捷方式测试。它不会为测试关闭官方应用。GitHub Actions 在 Windows runner 上执行相同检查。

修改源码后先运行相应测试，再更新清单。不要通过盲目更新清单掩盖未知文件修改。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\update-manifest.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\Verify.ps1
```

## 重建动画

日常图片、字幕与文字使用应用设置即可。修改动画原项目的 animation.js / style.css、时间轴或轮廓后运行：

```powershell
node .\assets\launcher\scripts\build-startup.mjs
```

构建器读取相邻的动画源码，将 Windows 统一设置与字体编辑层加入生成的启动 bundle。bundle 保留原作者授权范围，不因生成过程转为维护者独有代码。更换默认背景时必须同步对应轮廓，避免线稿错位。

## 构建 Windows Release

使用经来源核实的 Node 24.16.0 x64 可执行文件。随包保留 LICENSE.txt；node.exe 不直接提交到 Git。

先确认动画源码、默认图片与公开 Release 的再分发授权记录已完成，然后运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-release.ps1 -RuntimePath "C:\Tools\node-v24.16.0\node.exe" -OutputDirectory "C:\Build\sakura-v1.0.0"
```

构建输出 Windows ZIP 和 SHA256SUMS.txt。ZIP 内含完整包目录与便携 Node，并重新生成包含运行时的逐文件清单。不要只上传源码 ZIP 并宣称免安装 Node。

`-AllowPendingAuthorization` 仅用于本地待审构建，不表示允许公开发布。含 RELEASE_GATE 标记时禁止上传动画代码、bundle 或完整发布包。

## 启动设计

桌面图标目标为系统 wscript.exe，参数为引擎内相对路径，工作目录为当前机器的真实引擎目录。隐藏运行器根据自己的位置设置工作目录。路径测试必须包含中文、空格以及与引擎不同的启动工作目录。

不依赖维护者电脑的公共目录映射，不将同一引擎识别成两套路径。辅助进程按真实引擎身份、端口、浏览器 ID 和心跳复用。普通官方会话缺少连接时保持运行，请用户正常退出一次。

## 发布检查

1. 核对作者、许可证、动画授权和素材范围。
2. 核对源码清单、测试结果及 README 中的实际验证边界。
3. 使用独立环境验证首次安装、重复安装、已有设置保留及卸载；不以维护者电脑已有缓存代替首次安装。
4. 核对包中没有用户名、Cookie、聊天、用户媒体、Workshop 原素材、运行日志、旧 .lnk 或临时证据。
5. 从最终 ZIP 解压后再次校验与测试，上传 ZIP 和 SHA256SUMS.txt，核对远端下载哈希。
6. 记录真实官方应用版本，未来更新不自动视为已兼容。
