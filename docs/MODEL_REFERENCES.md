# 型号资料与实现依据 / Model references

核对日期：2026-10-21（Asia/Shanghai）。本页仅记录功能研究来源；官方说明书的图片、厂商 Logo 与固件均未纳入应用。资料存在不等于相应功能已实现，支持状态见 [COMPATIBILITY.md](COMPATIBILITY.md)。

Sources were checked on 2026-10-21. These references establish product identity and selected behavior, not complete compatibility. No manufacturer firmware or manual images are bundled.

2026-10-23 补充核对：第一代 CN CW 手册 p.55 的六类 47 项常数及 [NIST CODATA 2018](https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2018.txt)；TI 当前官方 Guidebook pp.6–8、35、37–40、67–68；CG50 软件 3.00 手册 5-3、5-8、5-17、5-54–5-57。采用内容和限制见 [USABILITY.md](USABILITY.md)，没有改用其他代际的图片或菜单。

## fx-991CN X

- [Casio 官方产品页面](https://www.casio.com.cn/scientific-calculators/product.FX-991CNX-BK/)：型号身份和产品功能参考。
- [现有说明书镜像](https://manuals.plus/m/9c6b41d1f8e83c52eb602fd18a154beda8144dbb748a12661712ebc2dcaac12c.pdf)：原项目菜单/功能研究资料，属于第三方镜像，优先以厂商资料核对疑点。
- [NIST CODATA 2010 存档](https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2010.txt)：X 常数表的数值依据。不能将此数据自动套用给不同代产品。

## fx-991CN CW

本次使用的是[官方第一代 fx-991CN CW / fx-999CN CW 中文指南](https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/)，不是 CW II。指南共用多个型号，必须检查单项的适用型号；例如分布与电子数据表标注仅用于 fx-999CN CW，本项目的 fx-991CN CW 没有据此增加这些应用。

| 官方章节 / Official section | 本次采用的依据 / Implementation use |
| --- | --- |
| [计算器应用程序](https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/calculator_apps_and_menus/calculator_apps.html) | HOME 中 991CN CW 的十种应用及次序 |
| [使用目录菜单](https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/calculator_apps_and_menus/using_the_catalog_menu.html) | CATALOG 作为函数入口；具体分组仍为桌面适配 |
| [使用工具菜单](https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/calculator_apps_and_menus/using_the_tools_menu.html) | TOOLS 随当前应用提供操作 |
| [使用格式菜单](https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/changing_calculation_result_format/using_the_format_menu.html) | FORMAT 提供结果表示选择；并未实现真机所有转换 |
| [注册和使用 f/g](https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/registering_and_using_defining_equations/registering_and_using_defining_equations.html) | 注册定义、使用复合函数与拒绝循环引用 |
| [创建数表](https://support.casio.com/global/cn/calc/manual/fx-991CNCW_999CNCW_cn/using_calculator_apps/creating_a_number_table.html) | 单函数上限 45 行、双函数上限 30 行 |

CW 不提供 ALPHA、独立 M 或 CALC 的 X 式操作。变量菜单和 f/g 定义菜单是本项目可验证的独立行为。0.8.0 按第一代手册 p.55 与 NIST 新增六类 47 项 CODATA 2018 常数；X 的 CODATA 2010 数据保持独立。物理键位和 HOME 依照官方正面照片重排，资料与差异详见 [CW_INTERFACE.md](CW_INTERFACE.md)。菜单深度、屏幕字形与数据保留仍有桌面适配，不能声称整机逐键复刻。

The CW profile has separate navigation, keys, variables and function registration, plus a verified 47-entry CODATA 2018 dataset. Its shared mathematical tools are a documented subset with desktop extensions; they do not establish complete device parity.

## fx-999CN CW（第一代）

2026-10-23 核对[官方白色款产品页与照片](https://www.casio.com.cn/scientific-calculators/product.FX-999CNCW-WE)及上述第一代共用手册的印刷页 16–18、83–93、132。独立实现十二应用 HOME、分布和电子数据表；不向 991CN CW 开放专属能力。资料、手册示例、容量与未实现行为见 [999CW.md](999CW.md)。不混用 CW II/MAX。

## TI-36X Pro 与 fx-CG50

新增实验型号的官方产品照片、软硬件说明书页码、实体键矩阵与数值边界，分别记录在 [TI36XPRO.md](TI36XPRO.md) 与 [CG50.md](CG50.md)。资料核对日期为 2026-10-22；只分发原创键位数据与代码，研究用厂商图片/PDF 留在 Git 忽略的本地目录。它们均未完成整机界面与功能一致性验收。

## fx-991EX（Experimental，0.9.0）

2026-10-24 核对 [Casio 官方完整指南 RJA532432-001V01](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991EX_EN.pdf)、[官方 Quick Start Guide](https://www.casio.com/content/dam/casio/local/us/cpd/pdf/Casio-fx-991EX-QSG.pdf)及[官方正面图](https://www.casio.com/content/dam/casio/product-info/locales/africa/fr/calc/product/scientific/F/FX/FX9/fx-991EX/assets/fx-991EX_F.png)。采用独立九变量/十二应用、1–9/A/B/C、计算模式 SOLVE、表格/统计/分布容量、数据表格生命周期及 2010 常数规则；入口、页码与未完成范围见 [FX991EX.md](FX991EX.md)。新增数值、状态与实际 Electron 兼容测试后以 Experimental 开放，未声称完整等价。厂商素材仅保留在忽略的研究目录。

## 保护盖动画（0.9.1，2026-10-24）

机身固定，保护盖单独运动。X/EX 的滑盖参考 [EX 官方指南第 3 页](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991EX_EN.pdf)；第一代 CN CW 的抬盖/扣合结构见上述中文指南第 10–11 页；CG50 的导向拆盖见 [硬件指南 EN-2](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Hard_EN.pdf)；TI 的滑盖类型见 [TI 官方支持说明](https://education.ti.com/en/customer-support/knowledge-base/scientific-elem-calculators/troubleshooting-messages-unexpected-results/39437)。六款盖子的配色、轮廓、边缘、握持纹与运动节奏采用原创 CSS 表现；移开路径属于桌面演示，不声称精确测量或完整模拟真机结构。未打包厂商图片。

## 接纳真机对照的证据格式 / Hardware evidence format

新增兼容声明应提供：准确型号/地区/代际、官方章节链接、完整按键序列、角度与输入输出设置、输入数据、真机结果、项目结果与容差。截图应由贡献者自己拍摄且有权公开；不得提交固件、厂商图片或来源不明素材。测试通过的含义限定于给定输入和本项目实现，不能外推为整机认证。
