# 第一代 fx-991CN CW 界面对照

本次针对第一代 CN CW，**不混用 CW II、国际 fx-991CW 或 fx-999CN CW 的独有应用**。外壳、按键和图标由原创 CSS/SVG 绘制，机身和保护盖不附加软件项目字样，不嵌入厂商 Logo 或机身贴图。

资料核对日期：2026-10-22（Asia/Shanghai）。

- [Casio 官方 fx-991CN CW 产品页](https://www.casio.com.cn/scientific-calculators/product.FX-991CNCW/)
- [官方正面产品图片](https://www.casio.com.cn/content/dam/casio/product-info/locales/cn/zh-cn/calc/product/scientific/F/FX/FX9/fx-991cncw/assets/fx-991CN-CW.png)
- [第一代 CN CW 官方说明书](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-zh-cn/f/fx-991CNCW_999CNCW_CN.pdf)：印刷页 7–8（方向/翻页及 OK/EXE）、12–14（HOME/SHIFT/指示符）、16–18（应用次序）、30–32（幂根式/对数）、34（变量）、37（格式）。

## 物理位置

控制区有 16 个按键，含四个方向键、OK 和两个独立翻页键。下方是两行六列科学键，再下方四行五列数字键；共 48 键。格式键位于最下面一行第四列，Ans 是它的 SHIFT 功能，没有额外的独立 Ans 键。

| 行 | 从左到右 |
| --- | --- |
| 科学键 1 | x、分数、√、xⁿ、x²、logₐ |
| 科学键 2 | (−)、sin、cos、tan、(、) |
| 数字键 1 | 7、8、9、DEL、AC |
| 数字键 2 | 4、5、6、×、÷ |
| 数字键 3 | 1、2、3、+、− |
| 数字键 4 | 0、.、×10ˣ、格式、EXE |

SHIFT 层按照片核对，包括 √→n 次方根、xⁿ→倒数、x²→常用对数、logₐ→ln，以及数字键上的 A–F/x/y/z。HOME 使用三列两行的可见应用区，由方向键/翻页键与 OK 选择。数字直达和 F4 等仍是项目的电脑键盘快捷方式，不是新增实体键。

## 已实现与边界

本次修正物理键位、主要副功能和 HOME 显示；独立变量、f/g、表格容量、历史隔离及已有数学功能保留。Tab 补全属于额外的电脑输入辅助，见 [AUTOCOMPLETE.md](AUTOCOMPLETE.md)。

**CW 仍为 Experimental。** 原机的全部 CATALOG/TOOLS/SETTINGS 子菜单、屏幕字形/像素、错误域、数据保留规则和逐位数值尚未全部复现；共享表单仍有桌面适配，不能宣称整机严格一致。保留独立标识是项目的分发约束，不将其称作厂商原版界面。

原机数学输入下的 SHIFT DEL 自变量捕获、完整运算验证及部分编辑规则也尚未复现；现有“插入/覆盖”属于桌面输入行为，不能据此声称兼容原机的数学插入流程。科学常数和完整 FORMAT 仍受兼容清单中的限制。

官方参考图片/PDF 仅保留在忽略的 `.verification/` 研究目录，不随程序分发。实际窗口截图与执行结果见 [VERIFICATION.md](VERIFICATION.md)。

[本地 CW 窗口](cw-calculator.png) · [HOME](cw-home.png)
