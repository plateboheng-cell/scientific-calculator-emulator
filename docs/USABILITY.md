# 现有机型可用性改进 · 0.8.0 本地开发

本轮暂停新增型号，完善已有实验机型。**Experimental 标签保留：常用流程可运行与整机逐键、像素、末位一致是不同的验收条件。** 本项目没有厂商固件或认证，不自动发布。

0.8.2 后续输入修复：X 的计算模式 SOLVE、分数键与带分数、公式/结果隔离及中英文按键边界见 [NATIVE_INPUT.md](NATIVE_INPUT.md)。下文保留 0.8.0 的数值与实验机型范围。

## 公共计算

- SOLVE 不再凭固定绝对残差接受根。使用归一化 Newton 步、局部符号证据和有界区间后备搜索；拒绝已发现的小尺度无实根、极点和指数下溢平台。只求一个实根，不保证全根；无法解析的切根、平坦零区间可能保守报错。
- 二次回归先平移、缩放 x，再以加权 Householder QR 求解，避免原始正规方程的消减。显示 a/b/c，同时保留非枚举的工作坐标用于预测；不能通过复制或序列化系数恢复全部工作精度。大偏移下直接手算 a+bx+cx² 仍可能发生消减。
- 回归系数和预测以近似值显示。常数近似来源、通用符号证明与数值识别的既有边界仍适用。

## fx-991CN CW 与 fx-999CN CW

按[第一代官方共用指南](https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/)印刷 p.55，新增六类、共 47 项 CODATA 2018 科学常数，入口为 CATALOG → 科学常数。F7 是电脑快捷键。两款型号使用相同的手册数据；X 仍使用独立的 CODATA 2010 数据。

数据核对 [NIST 2018 归档](https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2018.txt)。精确 SI 定义衍生的值在双精度中计算，不声称与固件内部位数完全相同。999 原有分布和数据表格继续使用独立入口与生命周期，未将这些功能开放给 991。

## TI-36X Pro

依据[官方 Guidebook](https://education.ti.com/download/en/ed-tech/858D1A4A484E493DBA150F4F3BD1DC9D/86DCDB61D56D40F79E597C4AEEDD24AD/TI-36XPro_Guidebook_EN.pdf)，本轮核对 2026-10-23 可取得的版本；不同生产代际的常数可能不同。

- pp.6–8：MODE 的 DEG/RAD/GRAD、NORM/SCI/ENG、FLOAT/0–9、REAL/a+bi/r∠θ、DEC/HEX/BIN/OCT、CLASSIC/MATHPRINT 六行设置。方向键移动、ENTER 确认、clear 或 2nd quit 返回。记数法与小数位独立保存，极坐标输出遵循角度单位，重启恢复进制与输入方式。
- CLASSIC 提供可编辑的线性输入和基础多击键；复杂操作数的组合/排列编辑与原机全部错误定位仍需完善。MathPrint 继续使用原创 MathLive 编辑器，不声称复刻四行点阵历史。
- pp.67–68：独立 20 项物理常数，保留手册给出的 R、F、Cc 数值精度；不使用 X 的常数表。目录名称和列表渲染仍是桌面适配，NAMES/UNITS 原生标签切换未实现。
- pp.37–40：2nd data → 右键 DISTR，按手册顺序提供 Normalpdf、Normalcdf、invNorm、Binompdf、Binomcdf、Poissonpdf、Poissoncdf。离散函数 SINGLE/LIST；二项函数另外提供 ALL。复用已测试的离线概率引擎，没有新增独立的 TI “分布应用”。
- 每个分布列表最多 42 项，对应手册 p.35 的列表容量；ALL 超限明确拒绝。列表目前在表单输入，未连接原机 L1/L2/L3 列表公式或自动写入列表。STAT-REG 页保留现有统计入口，完整原生选项及 TI 系数命名仍待迁移。
- 逆正态只接受严格介于 0 和 1 的面积；端点不返回无穷大。离散 x/N 不超过 10⁶；二项 x>N 拒绝。TI 的非整数统计频数、三次回归及完整换算/op/setop 等尚未完成。

## fx-CG50

依据[软件 3.00 官方手册](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v300_EN.pdf)与既有[正面照片](CG50.md)。本轮扩展 Graph 应用，未开放其他未实现的原机应用。

- 5-3、5-17：TOOL → STYLE，支持 Normal、Thick、Broken、Dot、Thin，按函数槽保存。
- 5-54–5-57：G-Solv 的 ROOT/MAX/MIN/Y-ICPT/ISCT；第二页 Y-CAL/X-CAL 与指定区间 ∫dx。多曲线时方向键选择并用 EXE 确认；两曲线交点可直接计算，三条以上分两次选择。
- 左右键可搜索前后数值根、极值或交点；超出可解析范围报错并清除旧坐标。结果保持近似，不修改变量 X 或 Ans。
- 5-8：FACTOR、IN/OUT、AUTO；第二页 ORIGINAL、SQUARE、PREVIOUS。X/Y 缩放系数独立保存。当前仅支持 >1 且 ≤100 的因子，缩放中心仍为视窗中心；原机指针中心行为未完成。BOX、ROUND、INTEGER 不冒充已实现。
- 只提供有限采样的实值 Y=f(x)。局部极值及根可能漏掉非常狭窄、相邻或病态特征，不作全局完备证明。参数/极坐标/不等式类型、MODIFY、SKETCH、图形存储及其他应用保持未实现。

## 验证与本地更新

新增真实缺陷回归、逐型号共享计算检查，以及独立 Electron 可用性套件。旧测试继续执行；原先“常数未实现”的断言更新为检查实际 20 项目录与结果，未删除失败测试。实际计数、失败修复过程与制品见 [VERIFICATION.md](VERIFICATION.md)。

Windows 开发命令：

```powershell
npm ci
npm test
npm run build
npm run test:ui
npm run release:win
```

安装依赖后完全离线运行；开发依赖首次下载需要网络。当前桌面稳定入口为 `scientific calculator simulator`，目标 `release/win-unpacked/scientific calculator simulator.exe`。验证通过才替换目录，保留旧目录备份；不推送、不创建公开 Release。
