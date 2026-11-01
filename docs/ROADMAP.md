# 开发路线 / Roadmap

优先级是数值正确、可回归的操作流程和可维护架构。未完成项不代表产品承诺或发布日期；测试数量不能替代真机认证。

Priorities are numerical correctness, reproducible interaction and maintainability. Open work is not a release commitment or a claim of hardware parity.

## 当前 0.10.0 本地范围 / Current local scope

- 共享数学引擎与型号配置边界；X 的现有能力保留。
- 首次型号选择、返回选择器、中英文、按型号隔离的状态及旧数据迁移。
- 有官方资料依据的 CW 实验实现：独立主菜单/按键/变量、f/g 注册、表格容量。
- 同包自动识别系统首选界面语言，用户保存的选择优先。
- CW 按第一代官方照片重排 48 键与 HOME 分页；所有二维公式框支持离线候选和 Tab 补全，保留空位导航与撤销。
- 基于官方照片的 TI-36X Pro / fx-CG50 实验布局和已验证子集；TI 多击键、尺寸限制、40 方向换算、op/setop、带分数模板和软件对比度；CG50 20 槽 Y/X/极坐标/参数关系、不等式阴影与随屏幕变化的软菜单。
- 核心/型号/按键/状态/语言与 Electron UI 回归，Windows 打包 CI。
- 第一代 fx-999CN CW 十二应用 HOME、七种分布及 A1:E45 数据表格；真实输入与计算、引用/填充/复制、会话生命周期，实验范围见 [999CW.md](999CW.md)。
- 开源社区文件、依赖通知、兼容范围与验证记录。
- 0.8 阶段曾暂停新增型号，优先修复尺度敏感 SOLVE、二次回归及近似显示，完善 CW/TI 独立常数、TI MODE/统计分布、CG50 图形分析/线型/缩放；这些能力与边界继续保留，详见 [USABILITY.md](USABILITY.md)。
- X 在计算模式使用主方程 SOLVE，保留变量初值/未知量选择；分数键、带分数与显示/按键边界修复，见 [NATIVE_INPUT.md](NATIVE_INPUT.md)。
- 按维护者随后明确提出的 EX 开发要求，加入独立 fx-991EX 实验实现：十二模式、英文键位、九变量、45/30 行表格、160/80/53 行统计、七种分布及退出应用清空的电子表格；不等同于已完成全部真机兼容。范围见 [FX991EX.md](FX991EX.md)。
- 深色型号库显示真实型号/状态和配置驱动的原创 SVG 外观；X/EX 使用按参考图重做的机身、圆键、椭圆方向键和四列图标菜单。软件名为 scientific calculator simulator；各型号机身、盖子和缩略图不印通用软件标识，不使用厂商 Logo 或“中文版”等固定设备标签，见 [INTERFACE.md](INTERFACE.md)。
- CG50 原机菜单的 19 个应用均已接入实际工作流，包括六个 List Files × 26 列表的统计、三统计图叠加、回归/检验/区间/八类分布、A1:Z999 数值/文本表格、三序列递推、Program、Financial、Geometry、Picture Plot 和五类 3D 图形。程序支持 a+bi 标量、工作区 Pict/Capture 图像库及保存的 DrawStat 配置。资源上限和剩余差异见 [CG50_APPLICATIONS.md](CG50_APPLICATIONS.md)。
- CG50 图形实现 MODIFY、SKETCH、20 个 GPH-MEM、7 个 BUILT-IN、Xdot 和扩展缩放；Memory/Link 提供模拟器 JSON 备份，G3M 记录检查/保留及指定 CP0001 G3P 图片编解码。原厂程序 token 与 eActivity 条带尚不转换。
- EX 的 SHIFT OPTN 提供离线、可扫描的计算文本二维码并标注“模拟器导出”；尚未兼容 CASIO 专有 WES 数据/服务。软件闲置自动关机已接入，CG50 可配置时长；亮度/对比度为软件显示模拟。

实际执行结果与仍失败/未执行的检查以 [VERIFICATION.md](VERIFICATION.md) 为准。代码可运行不等于完整实现真机。

## 接下来 / Next

优先完成现有型号的逐项手册覆盖和原机一致性验收：逐个屏幕、按键序列、错误域和状态保留建立章节/图片对照及测试。X/EX 的原生菜单和编辑细节、CW 的目录/工具、TI 的原生 data/STAT-REG/列表公式与求解器菜单，以及 CG50 的字形、完整命令清单、文件格式与数值边界仍需核对。用户目前没有真机或原厂文件，因此本地合成样例和自动化只能验证本项目行为，不能补足真机或真实文件证据。保持 Experimental，达到逐项验收后才提升支持状态；不无限增加未完成型号。公开发行由维护者另行授权。

1. **数值与显示**：扩大病态矩阵、邻近/高重根、极端回归、奇异/振荡积分样例；将数值误差/近似来源贯穿更多结果，避免近似值误报为精确根式。保留局部 SOLVE 的单根语义，增加区间求根前先定义完整性与奇点处理策略。
2. **CW 的逐项兼容**：核对科学常数版本/数据、目录和 FORMAT 子集、函数注册跨应用可用性、表格编辑/重算与变量数据保留。每项需附官方章节与独立测试，再更新兼容矩阵。
3. **原厂格式与协议**：在有可核对资料/样本后实现 G3M 程序 token、G3E eActivity 条带语义，验证 G3P 变体、CASIO WES QR 及 EA200 原生协议。当前 G3M 容器保留、指定 G3P 图片和 CSV 串口能力不构成这些目标的完成证据。
4. **维护性**：继续从 `main.js` 抽取模式控制器，迁移到稳定的语义翻译键；在已有 CG50 版本化 JSON 备份上完善跨型号数据恢复和配额错误处理。
5. **发行安全**：评估 KaTeX 与 electron-builder 审计报告的可行兼容升级；确认缺失的上游版权通知，保留 Electron/Chromium 与数学字体许可；评估 Windows 代码签名。

## fx-991EX 后续验收 / EX follow-up acceptance

EX 从 0.9.0 起为可操作的 Experimental：官方资料、独立键位/模式配置、容量限制和数据生命周期已有实现及专门测试。0.10.0 的 QR 导出已生成可扫描的模拟器计算文本，CASIO 专有 WES 编码/服务兼容仍未实现。接下来应补齐原生输入/错误定位/设置流程，逐项核对允许输入域、末位数值和内存行为；不能根据例题、可打开的菜单或外观预览提升为完全支持。源码、打包 Electron 与 Windows 便携包的实际执行证据统一记录于 [VERIFICATION.md](VERIFICATION.md)。

EX is now a usable, independently researched experimental subset. Remaining work focuses on native interaction and numerical/memory boundaries. Publication still requires the maintainer's authorization; model counts and passing sample cases cannot establish handheld equivalence.

## 明确未规划为当前能力 / Outside current capability claims

目前不提供固件仿真、与原厂逐位认证、通用符号代数系统、云端 API、账号或同步服务。G3M 程序 token/G3E 转换、CASIO WES QR 和 EA200 原生协议未实现；真实设备、原厂样本和全部手册流程未完成验证。999 与 EX 的分布/数据表格仍需继续校对原生流程、错误域及内存行为；EX 的开放依据其独立官方资料，不能因共用引擎或近似型号名称把这些应用默认开放给 991CN X、991CN CW 或其他型号。
