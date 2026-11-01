# CG50 phase13 数值函数证据与边界

核对日期：2026-11-01。原生CALC所列接口已纳入 **0.13.0桌面版**；本文件分别记录helper、Main/Program和真实包证据，不声称整个CALC、全部函数域或原机算法已1:1完成。全部16章仍按[逐章账本](CG50_MANUAL_AUDIT.md)保留部分状态。

实现：`src/engine/cg-numerical-functions.js`。测试：`tests/cg-numerical-functions.test.js`。

## 手册依据

依据 [CASIO fx-CG50 Software Version3.00 User’s Guide](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v300_EN.pdf) 的本地正文 `.verification/cg50-software-v300.txt` 及对应原PDF页面。

| 功能 | 印刷页码及本地正文行 | 可直接支持的语义 |
| --- | --- | --- |
| Solve | 2-27；2731–2745 | `Solve(f(X),n,a,b)`；n为初值，a/b为下上界；不收敛Time Out；禁止二阶微分/Σ/极值/Solve，允许一阶微分与积分项。 |
| SolveN | 2-27–2-28；2747–2768 | `SolveN(left[=right][,variable][,lower,upper])`；省略右侧为0，省略变量为X，允许A–Z/r/θ；最多10个ListAns结果，No Solution及More solutions may exist.；禁止Solve/d²/FMin/FMax/Σ嵌套，允许一阶微分与积分项。 |
| FMin/FMax | 2-34–2-35；3016–3052 | `FMin/FMax(f(X),a,b[,n])`；闭区间a≤X≤b，a<b；n为整数1–9，控制精度和计算耗时；只对X变化，其他变量为常量；禁止所列嵌套数值函数/RndFix。 |
| 错误 | Appendixα-1–α-2；21992–22104 | 非法语法、数值/非实数/整数要求、Can’t Solve!与Time Out等错误类别，不能由一组成功例题推出所有阈值一致。 |

PDF2-34截图已另存 `.verification/calc-reference-index-81.png`。原例 `FMin(X²−4X+9,0,3,6)` 屏幕结果是 `{2.0000003,5}`，不是单个5；区间符号为≤，正文文本提取曾丢失该符号。本helper结果为 `[2,5]`，可验数学容差，不能称原机末位相同。n=6也没有把输出截成6位有效数字。

SolveN的手册例 `X²−5X−6` 返回 `{-1,6}`，并出现可能遗漏其他解的警告。当前所有非空SolveN结果都保留该警告，`complete`始终为false。

## API

```js
evaluateCGFMin(calculator, expression, lower, upper, precision?, extra = {})
evaluateCGFMax(calculator, expression, lower, upper, precision?, extra = {})
// -> [x, y]

evaluateCGSolveN(calculator, expression, variable = 'x', lower?, upper?, extra = {})
// -> {
//   roots: number[],
//   notice: 'More solutions may exist.' | 'No Solution',
//   complete: false,
//   searchRange: [number, number],
//   explicitBounds: boolean,
//   method: 'polynomial' | 'polynomial-zero-equivalent' | 'scanned',
//   truncated: boolean,
//   evaluations: number
// }

evaluateCGSolve(calculator, expression, guess, lower?, upper?, extra = {})
// -> number
```

表达式字符串交由原有安全编译器验证，不调用eval/Function。Solve/SolveN支持一个顶层等号，两边转为差；函数体和界限在调用层分别解析，helper本身不执行赋值语句。

helper不提交Ans、ListAns、变量、财务/统计寄存器或其他银行。调用层应将FMin/FMax/SolveN的数组按原生ListAns规则提交，并保留独立标量Ans；`notice`通过暂态UI传递，不是持久银行。

`CGNumericalError`继承现有`CalcError`，`message`为错误code，`detail`单独说明项目诊断，使宿主不会将它吞成通用数学错误。当前会返回Syntax ERROR、Argument ERROR、Invalid Type、Ma ERROR、Can’t Solve!或Time Out；这不证明所有输入与厂商错误表逐项一致。

## 算法和明确项目策略

| 项目 | 当前实现 | 尚不能宣称的范围 |
| --- | --- | --- |
| FMin/FMax | 检查闭区间两端；随n增加采样密度和收敛要求；比较每个已解析局部候选，再选所测整体最小/最大；可识别多项式时补充全部已解析驻点。 | 不是最左局部极值helper的简单别名；有限采样仍可能漏极窄峰/谷，不能证明连续域上的全局最优。 |
| FMin/FMax默认n | 未给n时采用6。 | **项目策略，不是手册证明的厂商默认值。** |
| SolveN多项式 | 安全AST识别常量、指定变量、四则和小整数幂，degree1–6交给已有`polynomialRoots`；提取实根、排序和去重。 | 不能据此宣称所有多项式条件数/重根/精度或设备算法一致；返回complete仍为false。 |
| 系数近失零保护 | 先用decimal组装系数；只有组装系数能无损回转到Number才走多项式路径。 | `(X−1)²+1E−30`不能因为double展开吞掉小正量而伪造X=1根；不支持的表达式会走保守扫描。 |
| SolveN一般函数 | 有界2048段扫描，符号括根细化，局部绝对值最小的切根检查；正整数幂/Abs可用保持零点的子表达式搜索。 | 极窄/高频/不连续/病态根可能遗漏；一个很小的正最小值本身不算根证据。 |
| SolveN输出 | 最多10个去重实根；更多候选截断并标truncated。 | 没有全部根证明；不得删除More solutions may exist.而声称完整。 |
| SolveN默认范围 | 非多项式且未显式给界限时搜索[-100,100]；识别的多项式使用系数导出的根界限。 | **两者都是项目搜索策略，不是厂商默认区间。** |
| 有界Solve | 初值和两个界限必须有限、a<b、初值在区间内；从完整有界候选中选择最接近初值的根。 | 该选择/并列规则未由真机证明；不能忽略界限去调用无界Newton。内部不受SolveN的10个显示结果截断。 |
| 无界Solve | 复用已有solveReal的Newton与扩张扫描。 | 原helper的半径、迭代、收敛和取根盆地均是项目策略，不是固件复刻。 |
| 非法/不连续函数 | 极值拒绝采到的非实数/非数值/未定义结果，以及未解析的符号跳跃、极点或无界峰；求根不跨越已采到的空洞，把极点误当根。 | 有限采样不能认证处处连续；极窄合法峰也可能保守报错。 |
| 退化零函数 | 恒零多项式或已采样零平台保守报Ma ERROR，避免返回任意10个伪离散根。 | 该退化提示不是手册SolveN恒等式的已验证行为。 |

完全没有有效实数采样点时保留最后的域/类型错误，不将整个区间无定义误报为有效实方程的No Solution。当前非实数log负区间为Invalid Type，恒除零为Ma ERROR；这些是数学domain策略，仍不证明全部厂商错误边界。合法的x²+1则保持No Solution。

内层原生积分或其他数值函数抛出的CalcError(`Time Out`)会提升为fatal数值超时，SolveN/有界Solve立即终止。共享无界solveReal会把一般callback错误当作采样空洞，因此本helper缓存fatal Time Out；后续轻量回退请求直接重抛，不重新执行内层求值，也不再计入实际采样次数。五个API路径的stub测试均只有一次实际callback。

当前角度保持原Setup，不强制Rad。FMin/Solve相关段落没有要求强制Rad；三角微分与积分的Rad注意事项不擅自扩展到这些函数。

默认预算：源表达式1500字符、每个helper最多120000次函数采样、SolveN最多10个输出、识别多项式最高degree6，有限实数绝对值小于1E100。预算与内部double/decimal方法均为桌面项目限制，未模拟设备15位内部十进制、RAM计量或AC按键时序。主控的可中断运行仍需另验。

## 状态隔离与嵌套限制

每次先创建新的readOnlyCalculator隔离上下文。即使调用者已经是该helper的隔离实例，也另建一层并复制可变银行，避免幂等返回导致采样污染调用者。只改变隔离scope中的采样变量。

多项式识别不执行函数，不额外读取scope getter。传入的extra可能包含调用者原生scope的函数闭包，因此不能直接用于隔离scope：array/vector/finance/stat/graph的原生键会在读取其getter之前过滤，再由local.scope绑定到本地银行；其他常量深复制并只读取一次。随机/显式外部回调只由实际采样执行，不能为判断表达式类型再求值一次。原生财务/统计函数在每次局部求值内仍可以更新其**局部**专用寄存器；显式非原生回调自身的任意外部JavaScript副作用不属于银行复制机制的保证。

F-MEM展开后的表达式按外层运算分别检查禁令：FMin/FMax禁止diff/diff2/integral/Σ/极值/Solve等对应原生及内部名字；Solve/SolveN依2-27—2-28的较窄清单允许一阶微分与积分项，仍拒绝二阶微分、Σ、极值及递归Solve。RndFix和项目内部不属于允许项的数值循环仍拒绝。**精确大写Sum/Prod是合法List聚合**，不会被小写sum/prod或CGSum数值循环的禁令误伤。允许的普通函数仍由当前安全编译器白名单决定，未开放任意accessor或属性执行。

## Main、Program与桌面验收

0.13.0的CALC实际主控制器在源码和打包程序各通过26项，见 `.verification/calc-main-source-0.13.0.json`、`calc-main-packaged-0.13.0.json`。包括三页F键，Math/Line商余数/优先级/原子DEL/Undo/CLIP，logab次序，一/二阶微分，积分tol及Deg设置保留，Σ变量更新/自然模板，FMin/FMax的坐标List与独立标量Ans，SolveN多解警告/物理EXE/一阶回调，有界Solve及错误银行保留。Program实际验证近似标志、notice传递、警告关闭后的Input键盘焦点和单次输入，以及Electron关闭重启。

最终Node926/926（`0.13-core-final.log`）；跨型号源码UI50项（Models17/Native Entry23/分数10）；八套真实包26+22+13+9+7+18+12+10=117项。CALC输入组件9项UI、纯输入61项及后续Line CLIP修复37项各自有报告，不能将其相加称为原机功能数。最终源码digest为 `c45e445531137de5354f8587e4b50c5171df1dc2200a65a22bcc36d056fb0961`。

`desktop-update-0.13.0.json`和`installed-0.13.0.json`确认桌面目标、版本0.13.0、packaged状态及标题；`userdata-before/after-0.13.0.json`确认本次已有6个profile、active `cn999cw`及银行hash保持一致。旧运行目录、入口和用户数据备份在 `release/desktop-backup-20261101-192304`。这些是软件交付证据，仍无实体机/协议/全部末位认证；默认n6、非多项式[-100,100]及其余明确项目策略继续适用。

## 已执行验证

- **34/34项专项通过**：手册极值/求根例题、闭区间端点/常量、多峰比较、n控制收敛而非格式、角度、参数与非实数/极点/跳跃错误、嵌套/F-MEM限制、degree6/重复/邻近/微小根、边界过滤、10根截断、切根、近失零/下溢保护、有界初值、独立银行、getter/回调计数和失败回滚；另含Sum/Prod合法聚合、四API传入显式原生scope闭包不污染financial/stat银行、实际Model入口及native getter跳过/普通参数getter仅一次，另验证Solve/SolveN的一阶微分/积分合法项、根2例题、outer采样变量与银行隔离，以及extremum禁令和Solve二阶/Σ/极值/递归禁令未被放宽，并锁定fatal超时传播/只求值一次、完全无定义区间与正常无解的区别。
- 专项日志：`.verification/phase13-solve-nesting-review.log`。
- 与二阶导数、只读数值采样及原生积分/Σ的最终联合隔离回归：**53/53通过**（含上述34项专项及实际Model接入），0失败/跳过；`.verification/phase13-solve-nesting-regression.log`。这是显式scope闭包与Solve嵌套契约修复后最终源的验证，不沿用此前源的联合日志。源hash和范围汇总在 `.verification/cg-numerical-functions-verification.json`。

纯层与所列Main/Program/打包/重启流程分别按各自报告验收。没有列出的OPTN分组、完整函数/复数/错误域、设备I/O、AC中断与真机逐屏逐键对照仍未完成。
