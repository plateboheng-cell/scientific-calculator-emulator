# v0.1.0 验证记录

日期：2026-10-16（Asia/Shanghai）。环境：Windows 11 x64，Node.js 24.21.0，Electron 44.8.0，Vite 8.3.4，mathjs 15.2.0。

- `npm test`：84 项通过，0 失败。覆盖基本算术、三角和角度模式、复数、坐标、微积分、求和求积、SOLVE、2–4 次多项式及重根、线性方程组、不等式、统计与七种回归、表格、比例、32 位基数、矩阵/向量、自然结果、常数和单位换算、微小数值及非法输入。
- `npm run build`：生产构建成功；数学字体本地打包。mathjs 主包较大，有构建体积提示，不影响离线运行。
- `npm run test:ui`：在实际 Electron 窗口中执行 22 项流程，全部通过。覆盖键盘四则与连续计算、S⇔D、三角、复数、HEX、矩阵定义与行列式、向量定义与模、统计、表格、二元联立、二次方程、不等式、比例、SOLVE、科学常数、换算、鼠标与 SHIFT、错误恢复、帮助和按键可见性。
- 使用 `CNX_ELECTRON_PATH` 指向 `release/win-unpacked/CNX Calculator.exe`，对打包后的实际程序重复运行上述 22 项流程，全部通过，页面无未处理 JavaScript 错误。
- `npm run release:win`：Windows x64 便携程序构建完成，带原创计算器图标。可执行文件未做发布者签名。
- Electron 原始 ZIP 已对照该版本 npm 包的 `checksums.json` 校验 SHA-256：`1c9319bab793492715f7668e0be0e6a30bf2a8577275e40035bd33601bf6f573`。
- GitHub Actions YAML 已解析检查；云端首次构建及 Release 状态以 GitHub Actions 的实际执行结果为准。

界面证据：[计算界面](calculator.png)、[主菜单](menu.png)。原始日志及运行配置保存在本机 `.verification/`，不纳入源码公开仓库。

这些结果确认所列功能与本项目的测试用例相符，尚未完成与实体 fx-991CN X 的全部函数、定义域、逐键操作和末位数值一致性验证。具体差异见 README 与 COMPATIBILITY.md。
