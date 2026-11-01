# 型号兼容矩阵 / Model compatibility · 0.10.0 local

这是独立数学软件的实现范围，未使用厂商固件，未取得原厂认证。**本项目尚无任何型号完成全部函数、输入域、末位数值和逐键操作的真机等价验证。** “可用”表示本项目既有功能可操作；“实验性”表示存在已实现的型号差异但覆盖不完整；“计划中”不允许选择。

本轮按源码和本地运行检查更新范围；用户未提供真机或原厂数据文件，相关对照仍未执行。菜单可进入、计算可运行与全部手册功能复刻是不同的验收条件。

This matrix describes the independent implementation. No model has full hardware-equivalence certification. Available is not a claim of complete parity; experimental is a usable documented subset; planned models are disabled.

## 型号差异 / Model differences

| 项目 / Item | fx-991CN X — Available | fx-991CN CW — Experimental | fx-991EX — Experimental |
| --- | --- | --- | --- |
| 可选择 / Selectable | 是 / Yes | 是 / Yes | 是 / Yes |
| 主菜单顺序 / Home order | 计算、复数、基数、矩阵、向量、统计、表格、方程、不等式、比例 | 计算、统计、表格、方程、不等式、复数、基数、矩阵、向量、比例 | 十二模式：计算、复数、基数、矩阵、向量、统计、分布、电子表格、函数表格、方程、不等式、比例；1–9 / A / B / C |
| 功能键 / Interaction | SHIFT、ALPHA、OPTN、CALC、MENU、S⇔D；四列双行图标菜单 | 48 键物理布局、独立翻页、HOME 六图标分页；SHIFT/HOME/CATALOG/TOOLS/FORMAT、变量与 f/g | 独立英文键帽与 SHIFT/ALPHA；四列双行图标菜单，向下露出 5–C；非 X 改名 |
| 存储变量 / Variables | A–F、x、y、z、M、Ans | A–F、x、y、z、Ans；无独立 M | 九变量 A–F、M、x、y，另有 Ans；无 z |
| CALC 与求根 / Substitution and solve | 在计算模式输入方程；ALPHA CALC 输入等号，SHIFT CALC 编辑变量/选择未知量求解 | 无 X 式 CALC；Solver 在方程应用，Shift+F6 也切换至方程 | 第一个 Calculate 模式保留主方程；ALPHA CALC 输入等号、SHIFT CALC 求局部单根；Equation/Function 保留多项式/联立方程 |
| 注册函数 / Registered functions | 不提供 CW 式 f/g 注册；表格可直接输入公式 | f/g 定义、调用与复合；循环引用拒绝 | 不注册 f/g；Table 直接输入一个或两个表达式 |
| 表格上限 / Table capacity | 单 45 / 双 45；双 45 为保留的桌面扩展，非真机容量声明 | 单 45 / 双 30，按官方表格资料限制 | 单 45 / 双 30；超限拒绝 |
| 科学常数 / Constants | 47 项 CODATA 2010 | 六类 47 项 CODATA 2018，依据第一代手册 p.55 与 NIST | 47 项 CODATA 2010，保留原手册时代精度 |
| 单位换算 / Conversions | 原有 40 个方向 | 使用共用桌面换算入口；未逐项验证 CW 目录/精度 | 共用桌面换算入口；未声明全部原机目录与精度等价 |
| 分布 / Distribution | 不提供独立应用 | 不提供独立应用 | 七种，Normal PD/CD/Inverse 在前，正态参数 σ 在 μ 前；离散列表最多 45 项 |
| 统计 / Statistics | 既有项目策略 | 既有项目策略 | 一/二/三列最多 160 / 80 / 53 行；离开统计应用清空，不持久化 |
| 电子表格 / Spreadsheet | 不提供 | 不提供 | A1:E45；激活其他应用、重启或切换型号清空；1,700 字节估算，非固件精确编码 |
| 独立状态 / Profiles | 历史、实数变量、设置、矩阵/向量/统计 | 独立于 X，另存 f/g 定义 | 独立历史、九变量、设置、矩阵/向量；统计与电子表格为易失会话数据 |
| QR / Native interaction limits | 不保证全部原机键序 | 不保证全部原机目录/工具 | SHIFT OPTN 生成可扫描的计算文本 QR，明确标注模拟器导出；未实现 CASIO 专有 WES 编码/服务兼容 |

991CN CW 的应用顺序、变量与函数注册依据[官方第一代 CN CW 指南](MODEL_REFERENCES.md)，不采用 fx-999CN CW 专属分布/电子数据表，也不混用 CW II 资料。共享引擎中的 RREF、单位向量、求积、统计/回归等入口，属于项目数学能力；未经逐项核对的菜单和允许输入域只能按桌面子集/扩展理解。

CW references are the first-generation CN CW manual, with model-specific exclusions. Sharing an engine capability does not prove that a particular physical model exposes the same operation, input domain or key sequence.

CN X 的标量 z 与双函数 45 行属于兼容旧桌面版本保留的扩展，不据此声称原机变量/容量等价。EX 按其官方九变量规则拒绝 z。菜单数字 0 保留为桌面快捷别名，原机 X/EX 图标标签采用数字及字母。

0.8.2 修正 X 与 CW 的求解入口差异、分数键符号与输入、带分数显示及屏幕/键帽布局边界。逐项操作、资料出处和保留差异见 [NATIVE_INPUT.md](NATIVE_INPUT.md)。没有因此宣称整机外观或功能等价。

0.9.0 增加有独立官方资料、键位和容量/生命周期策略的 EX 实验子集，并重做型号库与 X/EX 外观。EX 逐项范围、资料和剩余差异见 [FX991EX.md](FX991EX.md)，外观边界见 [INTERFACE.md](INTERFACE.md)。模型库预览使用原创 SVG 与真实键位数据，不使用厂商照片或虚构计算结果；这些改进仍不构成逐像素或逐键真机等价。

The EX is selectable and Experimental, with independent limits, English legends and volatile-data policies. It provides scanner-readable simulator-text QR export. CASIO's proprietary WES payload/service compatibility, full hardware parity and firmware-level numeric/memory behavior remain outside the completed scope.

## 公共数学能力及验证边界 / Shared capability boundaries

### fx-999CN CW — Experimental

第一代 999 参考白色款正面照片及第一代共用手册，继承 CW 的共享计算和 48 键物理位置，提供十二项 HOME。实际新增七种分布计算（离散列表 45 行、标量近似 Ans），以及 A1:E45 数据表格（常数/公式、相对与绝对引用、范围聚合、填充、复制/剪切、容量限制和重算）。数据表格在当前会话跨应用保留，ON/关机/重启/切换型号清空；不持久化。输入域、容量模拟和原机流程差异见 [999CW.md](999CW.md)。991CN CW 仍保留十项，不提供这两个应用。未完成原机全部目录/工具、自动计算关闭、数据抓取、点阵像素及逐位数值验证，不提升为完整支持。

The first-generation 999 profile adds working distributions and a spreadsheet, rather than a renamed 991 UI. It remains Experimental; consult the dedicated scope and numerical-limit document.

### 新增实验型号 / Additional experimental profiles

| 项目 | TI-36X Pro — Experimental | fx-CG50 — Experimental |
| --- | --- | --- |
| 资料/位置 | [官方手册与照片](TI36XPRO.md)；顶部 2×3 + 7×5 + 方向键 | [官方手册与照片](CG50.md)；F1–F6 + 4×2 + 2×6 + 4×5 + 方向环 |
| 已实现差异 | 八个小写变量；连续按键切换函数；f-only Auto/Ask-x；矩阵 [A/B/C] 最大 3×3；向量 [u/v/w] 1/2/3 维；2/3 次及 2/3 元求解 | 原机 1–9/A–J 共 19 个应用有实际工作流；矩阵/向量/进制属于 Run-Matrix；F1–F6 随屏幕变化 |
| 图形 | 无 | 20 槽 Y=/X=/极坐标/参数曲线及 X/Y 不等式阴影；DRAW/TRACE、视窗/Xdot、分析/缩放、MODIFY、SKETCH、20 个 GPH-MEM、7 个 BUILT-IN |
| 本轮补齐 | 六行 MODE、ENG/极坐标/CLASSIC、20 常数；七种分布与 SINGLE/LIST/二项 ALL；40 方向换算、op/setop、带分数模板、reset 与软件对比度 | 六个 List Files × 26 列表、统计图/回归/检验/区间/分布；电子表格、三序列递推、Program、Financial、Geometry、Picture Plot、五类 3D、System/Memory/Link/E-CON4 |
| 尚未保证 | MathPrint 多行历史、全部原生 data/STAT-REG/列表公式与错误域；各换算和按键流程的完整真机等价 | 全部 OS 命令/原生屏幕和数值域；G3M 程序 token、G3E 条带转换、EA200 原生协议；原厂文件/真机互操作与逐位结果 |
| 状态 | 独立实数变量/历史/设置/矩阵/向量及 f 定义；op/setop 和软件对比度设置 | 独立 26 变量、图形/统计六文件、程序、表格、图像库及工作区；版本化 JSON 备份/恢复；CG 复数标量跨重启保留 |
| 一致性 | 物理位置和部分键序已自动测试；公共表单/菜单未完全复刻 | 物理位置和所列流程已自动测试；屏幕字形、像素、全部菜单/数值域未完全复刻 |

两者可在本地选择，但都不满足“整机界面与功能严格一致”的最终验收门槛。不得把共享引擎中未通过原机入口开放的功能计作该型号已实现。原机标签对应的未实现分支报告状态，不返回占位结果。研究用照片/PDF 不随应用分发。执行结果见 [VERIFICATION.md](VERIFICATION.md)。

CG50 的 Program 使用有执行预算的 BASIC 解释器，a+bi 设置下支持复数标量，List/Mat 元素仍为实数。Pict/Capture 图像库持久保存在模拟器工作区；DrawStat 使用已保存的统计图配置。Link 可保存/读取模拟器 JSON、检查并保留 G3M 不透明记录、编解码无页脚 CP0001 RGB565 G3P 图片；这些能力不等于执行原厂程序或完整原厂文件支持。应用范围与资源上限见 [CG50_APPLICATIONS.md](CG50_APPLICATIONS.md)。

### 共用引擎范围

| 范围 / Area | 本项目行为 / Implemented behavior | 尚未保证 / Limits |
| --- | --- | --- |
| 四则、三角、对数、指数、幂 | 表达式解析、优先级、Deg/Rad/Gra、有限值/非法输入检查 | 整机所有输入域、异常位置与末位等价 |
| 分数、根式与自然显示 | 二维编辑与受约束的数字识别；可切换小数；积分/微分/SOLVE/多项式根标记 `≈` 并显示近似小数 | 通用符号推导、任意代数数精确化、全部真机格式规则 |
| 复数 | 四则/幂、共轭、模/辐角、实虚部及极坐标；CG 复数标量以实虚部保存 | 各型号复数域所有限制；其他型号复数变量跨重启保存 |
| 矩阵与向量 | 按型号限制；普通型号矩阵最多 4×4、向量通常 2/3 维，TI 有独立限制；CG50 Mat A–Z 每维最多 999、单矩阵最多 4096 格的桌面预算 | 病态数据、真机尺寸/菜单/允许运算和原生内存编码的全覆盖 |
| 多项式与方程组 | 普通型号 2–4 次/元，TI 2–3 次/元，CG50 2–6 次/元；退化输入保护 | 极端系数、近邻/高重根、病态系统可靠性 |
| 一般方程 SOLVE | 尺度归一化 Newton 与局部符号证据/区间搜索；拒绝已复现的微小非零残差和下溢误判 | 所有根、全局完备性、跨奇点求解；无法解析的切根/平坦零区间可能保守拒绝 |
| 不等式 | 2–4 次，区间/单点/全实数/空集 | 极端根间距与病态系数的全域认证 |
| 统计与回归 | 共用频数、统计量、七类回归和预测；CG50 另有十二种回归选择、Std/OnData 四分位、三统计图叠加、检验/置信区间和八类分布；数值拟合保留工作坐标 | 极端病态数据仍可能拒绝或不准确；仅保存/复制系数不能恢复全部工作精度；全部真机舍入、尾部概率及四分位规则认证 |
| 积分、微分、Σ/Π | 独立数值算法、角度链式因子与基本边界保护 | 所有振荡/奇异函数、误差界和真机内部算法一致性 |
| 基数 | 统一 32 位二补码，加乘溢出回绕 | 真机各进制位数、负数表示与溢出规则一致性 |

内部使用 IEEE 754 双精度，正常显示默认 10 位有效数字。积分、微分、SOLVE 和多项式求根明确使用 `≈` 小数，不将这些数值算法的输出识别为精确分数/根式。其余普通结果的简单分数/根式识别仍不是通用符号证明。数值方法有舍入与收敛限制；结果显示、输入转换与计算逻辑都需要回归测试。

The engine uses IEEE 754 double precision and normally displays ten significant digits. Integration, differentiation, SOLVE and polynomial roots show approximate decimals. Other recognized simple fractions or radicals are not general symbolic proofs. Numerical conditioning and convergence limits remain.

## 状态、界面与操作 / State and interaction

- 首次安装显示可切换中英文的深色型号库，记住上次型号；EX 可选择且标为 Experimental。已有 v1 数据仅迁移到 X 并保留原键。
- 每个型号保存各自历史、实数变量、角度/显示设置及允许持久化的数据；语言共用。EX 统计/电子表格不持久化，999 电子表格也不持久化。切换丢弃未提交算式/参数，暂存答案与导航重置。
- 新建统计输入起始为空；“编辑已保存数据”只能恢复当前型号仍保留的数据。EX 离开统计应用后不再保留，不能跨型号读取。
- 输入采用 MathLive 与原创桌面网格，机身和图标为原创 CSS/SVG，不复刻厂商位图 UI；全部循环小数与工程前缀规则仍未验收。
- 软件闲置自动关机已接入：CG50 可设 0–1440 分钟（0 关闭），其他型号当前为 10 分钟；Program/采样忙碌期间不触发。TI 提供持久软件对比度 0–10，CG50 提供亮度 0.4–1.5。这些是界面与定时器模拟，未认证硬件 LCD/电源行为。
- CW 注册函数的可用应用、重启/电源/输入格式更改后的保留策略与真机不完全一致；本项目按型号持久保存定义，属于明确的桌面适配。
- 复数 Ans、MatAns/VctAns 为会话值，不持久化；历史字符串可以保存，但不能恢复一个完整计算会话。

## 电脑输入扩展

各型号的 MathLive 输入框可使用离线函数提示与 Tab 补全；Enter 继续计算，无候选时 Tab 继续空位导航。此能力属于软件扩展，不是实体机功能。候选按型号/模式/已定义函数过滤，见 [AUTOCOMPLETE.md](AUTOCOMPLETE.md)。CW 物理对照见 [CW_INTERFACE.md](CW_INTERFACE.md)，全菜单与整机验证仍未完成。

## 测试声明 / Test claims

早期新增入口、手册章节、TI 分布 42 项容量和域限制集中见 [USABILITY.md](USABILITY.md)；当前 CG50 图形及应用范围见 [CG50.md](CG50.md) 和 [CG50_APPLICATIONS.md](CG50_APPLICATIONS.md)。TI 的分布位于统计菜单，未增加实体机不存在的独立 HOME 应用。

核心测试、型号兼容测试、键盘/状态测试和 Electron UI 检查的是所列用例。不能用测试个数替代真机功能数，不能用构建成功替代运行验证，也不能以配置了 CI 说明云端已通过。实际通过、失败和未执行数量见 [VERIFICATION.md](VERIFICATION.md)。

提出兼容性问题请附准确型号/代际、角度/格式、完整按键序列、真机及项目结果与容差。资料清单见 [MODEL_REFERENCES.md](MODEL_REFERENCES.md)。
