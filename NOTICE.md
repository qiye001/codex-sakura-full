# 许可范围与第三方声明

本仓库包含多种不同许可的内容。根 LICENSE 不覆盖第三方未授予同一许可的图片、动画或品牌资产。

1. **MIT 软件范围**：本项目新增的 Windows 安装、维护、诊断与整合工具，以及按上游 MIT 使用的落樱 / Dream Skin 软件部分。保留 Codex Dream Skin Studio contributors、Ritual Ink Bloom contributors 和 qiye001 的相应版权。
2. **启动动画单独授权**：`assets/codex-startup-animation/`，以及 `assets/launcher/scripts/injector.mjs` 中 `STARTUP_BUNDLE_BEGIN` / `STARTUP_BUNDLE_END` 标记间的生成动画，来自 panding999。上游基线未附统一开源许可证；不因根 LICENSE 存在就将这些内容重新许可为 MIT。具体授权见 `docs/ANIMATION_AUTHORIZATION.md`。
3. **落樱素材**：壁纸、图标和随包示例图遵循原 `ARTWORK_NOTICE.md`；可按声明作为项目、Fork 或发布包的一部分再分发，不能据此独立出售或独立授权素材。
4. **动画图像与标志**：默认图像和轮廓按相应授权使用；第三方角色、人物、品牌与官方图标的权利不由本项目扩张授予。
5. **Node.js**：Release 附带 Node 24.16.0。其软件及第三方组件按 `assets/launcher/bin/node/LICENSE.txt` 中各自许可分发。
6. **RePKG**：包格式读取参考 notscuffed 的 MIT 实现，保留 `references/RePKG-LICENSE.txt`。

仓库公开不代表所有第三方内容均可用于商业或任意再分发。请按对应文件的许可范围使用。贡献者应说明其提交的第三方来源，不提交私人图片、凭据、官方应用包或未经授权的素材。
