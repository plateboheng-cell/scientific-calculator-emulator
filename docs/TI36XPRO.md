# TI-36X Pro · Experimental

本实现是依据 TI 官方资料编写的原创桌面子集，不使用固件、厂商 Logo、产品照片或说明书截图。型号名称仅用于功能识别。当前不声称与实体 TI-36X Pro 的全部按键、显示精度和错误行为一致。

This original desktop implementation is an experimental, documented subset. It does not contain TI firmware or manufacturer artwork and makes no claim of complete hardware equivalence.

## 官方依据 / Official references

资料核对日期：2026-10-23（Asia/Shanghai）。0.8.0 本地改进及具体限制见 [USABILITY.md](USABILITY.md)：MODE 六行设置、独立显示/小数位、CLASSIC、20 常数与七种统计分布已实际接通。

- [TI 官方产品页](https://education.ti.com/en/products/calculators/scientific-calculators/ti-36x-pro)
- [官方说明书下载页](https://education.ti.com/en/guidebook/details/en/858D1A4A484E493DBA150F4F3BD1DC9D/36xpro)
- [TI-36X Pro 官方英文 Guidebook PDF](https://education.ti.com/download/en/ed-tech/858D1A4A484E493DBA150F4F3BD1DC9D/86DCDB61D56D40F79E597C4AEEDD24AD/TI-36XPro_Guidebook_EN.pdf)

下列页码使用说明书页脚印刷页码，PDF 阅读器页数通常多一页。研究用的 PDF/图片仅在本机 `.verification/`，不随源码或程序分发。

| 已采用差异 / Implemented distinction | 资料依据 / Manual |
| --- | --- |
| 八个变量 `x, y, z, t, a, b, c, d`；没有独立 M | p.33，Memory and stored variables |
| 单个 f(x) 的定义、表格与调用；Auto 和 Ask-x 工作流 | pp.51–53，Function table |
| 三个矩阵 [A]/[B]/[C]；行列数选择均为 1/2/3 | pp.54–55，Matrices；尺寸选择器截图 |
| 三个向量 [u]/[v]/[w]；维数选择 1/2/3 | pp.56–57，Vectors；维数选择器截图 |
| 二次/三次多项式，二元/三元线性系统 | pp.60–63，Polynomial solver / System of linear equations solver |
| 2nd、MODE、data、table、三个求解器入口、分数/小数切换 | 官方产品按键资料；说明书 pp.4–10、51、59–63 |
| DEC/HEX/BIN/OCT 与常用逻辑操作 | pp.64–66，Number bases / Boolean logic |

## 原版按键位置核对 / Physical keyboard reference

本次界面验收按[TI 官方正面产品图](https://education.ti.com/-/media/ti/education/images/products/product-details/scientifics/ti-36xpro/36xpro.png)和上述官方 Guidebook 交叉核对。照片只保留在本机研究目录，软件用原创 HTML/CSS 重建布局，不嵌入照片或 TI Logo。原照片约 247×467 像素，低分辨率符号及其含义不能据此宣称已完成逐像素或全功能认证。

实体结构为：方向盘左侧两行、每行三键；方向盘跨这两行；下方七行、每行五键。共 41 个非方向按键，加四个方向按键，合计 45 键。型号选择、应用导航和帮助属于软件外围控件，不占用或伪造原机键位。

下面每格格式为 **主键 / 2nd 副功能**；“—”表示未印副功能。多击主键按印刷的多个函数列出，不把第二个主键函数误当成 2nd。

| 行 | 第 1 列 | 第 2 列 | 第 3 列 | 第 4 列 | 第 5 列 |
| --- | --- | --- | --- | --- | --- |
| 顶部 1 | 2nd / — | mode / quit | delete / insert | 方向盘 | 方向盘 |
| 顶部 2 | ln、log / d/dx | math / matrix | data / stat-reg/distr | 方向盘 | 方向盘 |
| 主区 1 | eˣ、10ˣ / ∫□dx | EE / vector | !、nCr、nPr / random | table / expr-eval | clear / — |
| 主区 2 | π、e、i / complex | sin、sin⁻¹ / num-solv | cos、cos⁻¹ / poly-solv | tan、tan⁻¹ / sys-solv | ÷ / % |
| 主区 3 | x^□ / ⁿ√ | n/d / U n/d | ( / constants | ) / op | × / setop |
| 主区 4 | x² / √ | 7 / [ ] | 8 / convert | 9 / base n | − / 对比度变亮图标 |
| 主区 5 | x、y、z、t、a、b、c、d / clear var | 4 / D | 5 / E | 6 / F | + / 对比度变暗图标 |
| 主区 6 | sto→ / recall | 1 / A | 2 / B | 3 / C | 答案切换图标 / F↔D |
| 主区 7 | on / off | 0 / reset | . / , | (−) / answer | enter / — |

补充证据：Guidebook 印刷 p.4 明确 2nd + 使屏幕变暗、2nd − 使屏幕变亮；这两个圆形箭头不是坐标转换功能。p.9、28 说明三角键循环 sin→asin→sinh→asinh（cos/tan 同理）；p.28 说明 ln→log10、eˣ→10ˣ；p.33 说明八变量顺序；p.49–50 说明概率键 !→nCr→nPr。2nd 左/右方向键移动到表达式开头/结尾（p.10）。

### 函数与未实现项 / Behavior and unsupported entries

- `physicalLayout.topRows`、`physicalLayout.rows` 是真实位置数据；`multiTapTokens` 说明主键的多击序列。连续按同一函数键应轮换函数，不应插入两个不相关函数；例如 ln/log 的第二态是普通 log10，不是 CNX 的任意底数双槽模板。
- 概率键的第二态需要保留左操作数。手册示例 52 → 概率键两次 → 5 对应 nCr(52,5)，不能改算成 52×nCr(5)。
- 软件应用导航位于机身外，不增加 `Apps` 实体键；solver、matrix、vector 的副功能位置按官方照片排列。
- constants 使用当前官方指南 pp.67–68 的独立 20 项数据；op、setop、convert、对比度、reset 等尚未完成的副功能保持明确的未实现动作，不能连接不同型号的目录来声称兼容。
- 2nd 7 在低分辨率照片中呈方括号图样；精确含义尚未从手册正文定位，因此保留位置/图样并标注该输入尚未实现，不猜测行为。
- data 与 2nd data、MODE 与软件应用导航、答案切换与 F↔D 必须分别处理；当前布局数据本身并不证明这些菜单和键序已全部复现。

## 数据与数值边界 / Data and numerical scope

- 八个存储变量保持原机小写名称；没有 ALPHA 或独立 M。
- 向量内部用 VctA/VctB/VctC 对应 TI 的 [u]/[v]/[w]；界面显示和输入使用 u/v/w。矩阵内部符号为 MatA/MatB/MatC。
- 表格采用单函数 Auto/Ask-x。当前 45 行是软件的有界结果上限，不是对原机容量的声明。
- 函数支持 f，禁止注册和调用 CW 特有的 g。数据、历史和语言按型号隔离；保留规则尚未与真机逐项比对。
- 二维输入和数值结果仍由共享数学引擎提供；近似结果标记为近似，不代表 TI 内部精度、全部 MathPrint 细节或错误行为已认证。

## 尚未实现或未核对 / Limits

官方手册还列出三次回归、非整数统计频数、完整单位换算及各种格式/错误域。这些尚未全部实现；当前共用统计/回归和换算等入口按项目桌面子集/扩展理解。0.8.0 的七种分布、42 项列表与二项 ALL 已实现，列表公式和输出到 L1/L2/L3 尚未复刻。常数与 MODE 细节见 [USABILITY.md](USABILITY.md)。

数值 solver 主要使用 x 作为未知数，不能据此声称支持真机任意变量求解、40 字符限制和全部数值解规则。系统求解器当前拒绝无唯一解的输入，尚未复刻原机所有无解/无限解闭式展示。矩阵/vector 共同结果存储、matrix×vector 的列向量自动转换及完整多行历史屏幕行为，也未获得整机一致性验证。

The implementation retains the shared engine's documented numerical limits. Multi-tap keys, MODE, constants and bounded distribution workflows have actual Electron regressions. Full native data-list/statistics menus, arbitrary-variable numeric solving, pixel fidelity and firmware error behavior remain unverified or unimplemented.

## 验证 / Validation

`tests/ti36xpro.test.js` covers documented variables, keyboard controls, f-only registration, the manual's parabola example, capacity restrictions and quadratic/cubic/two-/three-variable solving. Overall execution counts and UI results belong in [VERIFICATION.md](VERIFICATION.md); configuration or the existence of a test file is not a passing result.
