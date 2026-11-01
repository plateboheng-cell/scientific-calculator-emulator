# 输入提示与 Tab 补全 / Mathematical completion

这是本项目的离线桌面输入辅助，不属于所参考实体计算器的功能。它在所有型号的二维公式输入框中提供函数名称、参数签名及中英文说明，不依赖 API 或在线服务。

## 使用

- 输入至少两个字母的前缀，例如 `sq` 或 `si`，显示候选。
- **Tab** 接受当前候选并选中第一个参数空位；**↑/↓** 切换候选，鼠标也可以选择。
- **Esc** 关闭候选并保留算式；**Enter** 保持计算/提交行为，不偷偷接受候选。
- **Ctrl+Space** 主动打开候选，可查看单字母变量及已注册的 f/g。
- 无候选时，Tab 继续执行公式空位/输入框导航；Shift+Tab 保持反向导航。

例如输入 `sq` → Tab → `9` → Enter，计算 √9；在分数的分子输入 `sq` → Tab → `9` → Tab，可继续填写分母。补全只替换当前光标前的字母前缀，不改动两侧内容，也不重建整个 LaTeX 算式。Ctrl+Z 可撤销补全。

## 范围

普通计算提供三角/反三角、双曲、对数、根式、排列组合及其他已验证函数。矩阵、向量和复数的专用候选仅在相应模式显示。型号限制继续生效，例如 TI 仅显示三个矩阵槽及已定义的 f，CW 没有独立 M，CG50 图形不推荐 f/g 或逐像素数值微积分。

矩阵/向量输入中 A–D 具有数据对象含义，因此不将它们作为同名标量变量推荐；矩阵绝对值竖线也不会作为普通 abs 候选误导用户。

候选模板经过项目的 MathJSON 转换与编译检查。输入法组合期间不接管按键。当前不为进制模式的普通文本框、数值列表 textarea 或下拉菜单提供数学补全；它也不是 Python 编辑器或通用代码执行环境。

## 实现与验证

`src/input/completion-catalog.js` 管理可测试的候选和公式原子前缀识别；`src/input/completion.js` 管理弹层、键盘、焦点和插入。只使用 MathLive 公开的光标/选择/插入接口，不修改供应商库。弹层位于机身外的桌面层，不占用或伪造原机实体键位。

`tests/completion.test.js` 验证过滤、型号边界、模板解析/编译和原子范围；`scripts/completion-ui-test.mjs` 验证实际 Tab、嵌套分数、光标两侧内容、撤销、Esc/Enter、鼠标、语言、输入法保护与跨型号工作流。实际通过数见 [VERIFICATION.md](VERIFICATION.md)。

English: type a function prefix, use Tab to complete, ↑/↓ to choose and Esc to dismiss. Ctrl+Space explicitly requests suggestions. Enter continues to calculate; ordinary Tab navigation remains when suggestions are absent. This is an independent offline desktop aid, not a handheld calculator compatibility claim.

[中文实际窗口](completion.png) · [English screenshot](completion-en.png)
