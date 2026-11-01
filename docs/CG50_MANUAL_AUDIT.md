# fx-CG50 OS 3.00 手册验收账本

核对日期：2026-11-01。对象：`scientific calculator simulator` 的 fx-CG50 实验型号。依据为本地 `.verification/cg50-software-v300.txt` 的目录及正文，来源为 [CASIO fx-CG50 Software Version 3.00 User’s Guide](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v300_EN.pdf)。页码使用手册印刷页码，例如 16-6。

**用户要求的“逐项对照真机手册，完整复刻全部功能”尚未验收完成；全部 16 个整章仍为部分完成。** 19 个主菜单入口、数学实现、组件界面通过、主控制器通过、原生文件样本通过分别记账，不能互相替代。本账本覆盖全部章、附录、考试模式及 E-CON4，但没有穷尽所有例题、命令组合和错误域。

部署边界：**0.13.0 已在 2026-11-01 替换桌面旧版**，软件与桌面入口名称为 `scientific calculator simulator`，实际安装程序的版本、标题及 `packaged: true` 均已核对。CALC主控26项、phase12主控22项、Run-Matrix13项、G3M9项、财务/考试7项、扩展主控18项、Graph12项、分数布局10项，合计117项真实包回归通过；归档为八份 `.verification/*packaged-0.13.0.json`。`.verification/desktop-update-0.13.0.json`、`installed-0.13.0.json`及`userdata-before/after-0.13.0.json`确认本次更新前后的6个型号profile、当前选中 `cn999cw`，及计算器、矩阵、向量、列表和程序数据hash一致。旧程序/入口/用户数据备份在 `release/desktop-backup-20261101-192304`。完整部署证据见 [VERIFICATION.md](VERIFICATION.md)；这些通过仍不等同全部手册/真机1:1。

phase12历史：Manual/Simp、106单位原生输入和列头公式已纳入0.12.0，当次最终Node843/843、新主控源码/包各22项、包回归91项及原5个profile保留均有封存证据。SET UP14、Metric菜单13/输入10、一次性列头公式12与原Statistics26为独立177px组件证据。旧快照 `.verification/source-0.12.0.json` 的digest为 `c09be0e254e6d31dea0f6d7d76992a9ca90e41c0bb1773167a825113f619bcfc`；以下CORE12等历史行保留各自当次范围。

**phase13 原生CALC已纳入0.13.0。** 最终完整Node回归926/926，跨型号源码UI50项（Models17/Native Entry23/分数布局10），新增CALC主控26项在源码及真实包均通过。函数输入组件9项UI、输入纯回归61项与后续Line CLIP修复37项分别记账；数值专项34项及联合53项、Model5项、原生积分/Σ5项的范围另列。最终源码快照为 `.verification/source-0.13.0.json`，digest `c45e445531137de5354f8587e4b50c5171df1dc2200a65a22bcc36d056fb0961`。所有16章仍保持部分完成；默认搜索、数值算法与全部域未获真机认证。

## 状态和证据的读法

| 标记 | 含义 |
| --- | --- |
| 软件实现 / 部分 | 有数学、状态或界面实现；只有明确列出的操作和预算范围可以声明。 |
| 项目用例通过 | 已执行的 Node 或真实 Electron 工作流程成功。用例数不是厂商功能数；不同报告有重叠，不能简单相加。 |
| 待验证 | 代码/脚本存在但没有对应成功记录，或仍需更多边界、样本和真机对照；不能计为通过。 |
| 原生文件证据 | 针对明确二进制变体的解析、修改、保存或独立读取；与 JSON/CSV、设备通信分别验收。 |
| 真机验证 | 实体 fx-CG50 的键序、屏幕、数值、错误或文件收发；本轮全部章节均无此项。 |

本轮仍无实体 fx-CG50，但“没有原厂数据文件”的旧描述已经过时：现在有公开作者的原始 G3M 程序文件和原厂资源导出的 G3B 样本，来源及范围见 N-MEM/N-PIC。它们没有证明混合内存记录可由实体机接收，也没有证明所有导入游戏可运行。引擎使用 IEEE-754 双精度和有界算法，不执行 CASIO 固件；容差用例不等于原机十进制内部算法、全部末位或完整定义域认证。

### 可追溯成功记录

| ID | 脚本 / 报告或测试 | 已证明的范围 |
| --- | --- | --- |
| MAIN-OLD | `scripts/expanded-main-ui-test.mjs`；`.verification/expanded-main-ui-results.json`，2026-10-27，18 项 | 真实主控：19 应用入口及所测操作、Program/Financial、Getkey F2=69/左=38/SHIFT=78、标量复数及桌面重启。TI/EX 项不计作 CG50 功能；不能覆盖此后全部新改动。 |
| MAIN-RUN | `scripts/cg-runmatrix-main-ui-test.mjs`；`.verification/runmatrix-main-packaged-0.11.0.json`，2026-10-29，13项，`errors: []` | 已部署0.11.0真实包：Run-Matrix软键、List存储/Sum、Fix/分数偏好、Mat/Vct与SET UP草稿、极坐标复数列表、共享Capture1–20、F-MEM、Program格式/数组、同名字形与原子编辑/双向CLIP、共享VWIN及实际重启。此封存报告不替代phase12新变更回归。 |
| MAIN-FIN/EXAM | `scripts/cg-manual-main-ui-test.mjs`；`.verification/cg-manual-main-ui-results.json`，2026-10-29，7 项，`errors: []` | 主控：手册7-20财务 OPTN/VARS、Program 财务共享；COS/7/AC 进入空白考试会话、应用/通信限制、重启保留、12小时退出恢复。 |
| MAIN-NATIVE | `scripts/cg-main-memory-ui-test.mjs`；`.verification/cg-main-memory-main-ui-results.json`，2026-10-29，9项，`errors: []` | 实际production main：作者原件读取/byte-identical SAVE、IMPORT保持Link存活、构造混合Program/List/Mat/Vct/标量/SETUP与opaque、冲突保留/确认REPLACE、导入数值程序运行、CURRENT EXPORT下载、坏header拒绝、真实重启、已删除程序不再出现在导出/重启中。不是实体机文件收发认证。 |
| LINE | `tests/cg-linear-editor.test.js`；`scripts/cg-linear-ui-test.mjs`；`.verification/cg-linear-ui-results.json`，2026-10-29 | 14项纯模型、12项实际340×177 Electron DOM/键盘通过：同字形 Finance/Stat n、普通P/Y除法与菜单寄存器、原子编辑/删除、引号、函数/帽子、canonical CLIP API、Undo/Redo、输入回退及destroy。明确为组件，不是 main 集成。 |
| SETUP | `tests/cg-setup.test.js`；`scripts/cg-setup-ui-test.mjs`；`.verification/cg-setup-ui-results.json`，phase12 当前18项纯测试、14项实际UI | 原生行/F键、Fix/Sci数字窗口、Norm/工程、Math/Line独立于小数显示、分数/复数、Financial共享、Program继承、177px；新增 Simplify Auto/Manual 的 Real/Line 保留、显式精确载体消费者与复数强制约分、Norm 在绝对值达到1e10时转科学记数。此报告为组件，不是整套主控制器或已部署包证明。 |
| ARRAY | `scripts/cg-array-ui-test.mjs`；`.verification/cg-array-ui-results.json`，2026-10-29，17项，`errors: []` | Mat/Vct原生列表、26槽/Answer、DIM、复数单元、行操作/行列增删、999行虚拟网格、向量方向、CSV、SET UP返回草稿、考试限制。 |
| GRAPH | `scripts/cg-graph-native-ui-test.mjs`；`.verification/cg-graph-native-ui-results.json`，2026-10-29，23项，`errors: []` | 实际Graph组件：SET UP/像素效果、Trace/物理数字键、6组V-MEM、独立左右G+G/COPY/SWAP/双窗Zoom、GtoT、共享Pict背景/Fade/BGV-WIN、限定G3P、Simul、格式、20槽F-MEM/组合引用、GPH-MEM重开；夹具已移除专用高度补偿。最终源hash：`2c8b641f93c9d4c97efa463e7deac352896d12cc37eb1ae12271a6801ce714cb`。 |
| GRAPH-COMP | `scripts/graph-completion-ui-test.mjs`；`.verification/graph-completion-ui-results.json`，2026-10-29最新dist重跑，12项，`errors: []` | Y=/极坐标/参数/X=、不等式、378间隔Xdot/参数、INTEGER/ROUND/BOX、GPH-MEM/BUILT-IN/MODIFY、切线/逆图/圆、点线/文字/笔迹。此项为新构建实际主控制器回归，不沿用10-27旧结果。 |
| WORK | `scripts/cg-workspace-ui-test.mjs`；`.verification/cg-workspace-ui-results.json`，2026-10-28，17项，`errors: []` | Table/三序列Recursion/Dynamic/Conic/eActivity、关系类型、物理编辑/绘图键与177px；含早期表格项，新表格专项另列。 |
| SHEET | `scripts/cg-spreadsheet-ui-test.mjs`；`.verification/cg-spreadsheet-ui-results.json`，2026-10-28，15项，`errors: []` | FILE/EDIT/DELETE/INSERT/CLEAR、命名多表、引用/CLIP、行列增删、单元格式/两条条件、表内统计图/回归/G-Solv、Pie颜色、List/Mat/Vct/变量交换、CSV、Auto Calc和177px。 |
| STAT | `scripts/cg-statistics-ui-test.mjs`；`.verification/cg-statistics-ui-results.json`，2026-10-29，26项，`failed: []`、`errors: []` | 六文件/26×999/颜色、三统计图、回归/检验/区间/八分布图、容量失败；新增专用寄存器、反分布右尾/Normal中央区间、复数列表编辑恢复且实数统计整体拒绝复数。包括无异常检查，不是26个手册功能。 |
| EXT | `scripts/extensions-ui-test.mjs`；`.verification/extensions-ui-results.json`，2026-10-28，13项，`errors: []` | Program数组/Canvas/持久图像库、DrawStat/DrawR/DrawWeb/DrawFTG/DrawDyna、Getkey节流/退出提交、复杂List/Mat/Vct JSON、原生TEST；另含Finance/图片安全/Geometry/3D组件。 |
| FIN | `scripts/cg-program-finance-ui-test.mjs`；`.verification/cg-program-finance-ui.json`，19项成功 | Program输入/保存、十类财务页面、栏目隔离/零利率/折旧图/错误输入、原生寄存器/设置共享及恢复后运算，360日模式禁止日期加减。 |
| GEO | `scripts/cg-geometry-ui-test.mjs` / `cg-geometry-extras-ui-test.mjs`；`.verification/geometry-ui-results.json` / `geometry-extras-ui-results.json`，2026-10-28，8+11项，`errors: []` | 原生菜单、形状/构造/变换、依赖拖动/文本/撤销；测量锁/表达式/Area Calc、VWIN/Pan/Scroll/Box/Fit、SET UP、多目标动画/轨迹/表、List/Sheet STORE、G3P/Pict背景与保护。 |
| PIC | `scripts/cg-pictureplot-ui-test.mjs`；`.verification/cg-pictureplot-ui-results.json`，2026-10-28，22项，`errors: []` | T/XY、STORE/RECALL、AXTRANS/P-LINK、DefG/Modify、数字指针/Undo、共享Pict、30帧/播放、真实G3B原样保存/改PGTime；合法大数据只存原生source，重开重建30帧且像素不丢。 |
| 3D | `scripts/cg-3d-ui-test.mjs`；`.verification/cg-3d-ui-results.json`，2026-10-27，16项，`errors: []` | 三槽/Sphere/Line/Plane模板、选择/确认删除/颜色、独立网格/Z域、6组3D-VMEM/20组3D-GMEM、VIEW/两圈旋转停止、Sketch/CROSS、Capture、圆柱与177px。 |
| MAIN-3D | `scripts/expanded-main-ui-test.mjs`的3D专项；`.verification/expanded-main-3d-ui-results.json`，2026-10-29最新dist，1项，`failed: []`、`errors: []` | 主控制器中的球/圆柱/平面/直线均实际生成非空面或点并绘制。只跑该专项，不能说旧expanded-main全部18项已在新构建重跑。 |
| P-UNIT | `tests/cg-program.test.js`、`cg-program-memory.test.js`、`cg-program-arrays.test.js`、`cg-program-statements.test.js`、`cg-program-canvas.test.js`、`cg-program-vwin.test.js` | 2026-10-29本轮相关回归60/60：控制流、复数List/Mat/Vct/Str、26向量方向/native Answers、统计事务、F-MEM/共享数组、22个V-WIN变量/Right/dot/参数、ViewWindow6/9参数、独立快照与逐条绘图坐标。不等于主界面/真机证明。 |
| F/S/A-UNIT | `tests/finance.test.js`、`cg-financial-functions.test.js`、`cg-statistical-functions.test.js`、`cg-program-statements.test.js`、`cg-array-memory.test.js`、`cg-native-list.test.js` | 财务24函数；24分布函数、4个加权离散函数、2个回归估计操作符、12原生TEST语句及寄存器/原子目标写回；手册数组/列表样例。具体成功断言不是全数值域认证。 |
| N-MEM | `tests/cg-main-memory-files.test.js`；`.verification/g3m-native-codec-verification.json`，2026-10-29，更新后22/22 | 六份公开作者原始Program-only G3M/配对TXT/Git blob/token重词法/原样保存；BCD、复杂数组、六列表文件、单变量、SETUP则为独立构造向量。新增4项删除同步覆盖已选已知记录、六文件/Mat/Vct/Answer、保留opaque/未选kind/未提供bank。独立MIT g1m-decompiler仅识别一份新生成程序的名称/赋值/算术/显示token。 |
| N-PIC | `.verification/cg-g3b-original-results.json` / `cg-g3b-write-original-results.json`；`scripts/verify-native-picture-samples.mjs` / `verify-native-picture-writes.py` | 八份资源导出G3B共114帧，由Python zlib独立检查像素hash/元数据；24次原样/改元数据/改帧导出共342帧独立核对，8份原样byte-identical。不是仅双端自洽。 |
| HOST/STATE | `tests/cg-native-profile.test.js`、`cg-run-matrix.test.js`、`desktop-storage.test.js`、`state-extensions.test.js`；`.verification/cg-native-host-core.log` | 原生内存分阶段候选、超预算数组拒绝、共享模式/寄存器、桌面原子保存等；HOST日志当次20/20。主控原生文件闭环另有MAIN-NATIVE，不把构造数据称为原厂真实数组样本。 |
| CORE | `npm test`；`.verification/0.11-core-final.log`，2026-10-29，741/741，0失败/跳过 | 正常Windows权限下完整Node回归，包含存储原子写入。覆盖整个多型号项目，不能把741说成CG50手册功能数，也不替代Electron、包部署或真机验收。 |
| CORE12 | `npm test`；`.verification/0.12-core-final.log`，2026-11-01，843/843，0失败/跳过 | 0.12.0最终源码的完整多型号Node回归，包括精确sidecar、手动约分、单位换算、逐元素List算术、原生前缀索引和列头公式。843是项目用例数，不是CG50手册功能数；主控、打包与安装证据分别记账。 |
| SIMP12 | `tests/cg-rational-display.test.js`、`cg-exact-state.test.js`、`cg-program-exact.test.js`、`cg-run-matrix-exact.test.js`；CORE12、SETUP | BigInt 分子/分母独立于浮点值保存，支持 Manual15/60→F=3、5/20→F=5、1/4，27/63指定因子9→3/7及无效因子错误；Setup/Model/Program/RunMatrix显式提交精确 metadata 与共享 Simplify，数组答案保持独立。使用有界纯语法，不执行getter/随机数第二次，不从任意浮点结果发明未约分表示；中间分母规则、半值舍入和特殊因子边界仍有明确项目策略。 |
| METRIC12 | `tests/cg-metric-conversion.test.js`、`cg-metric-model.test.js`、`cg-metric-input.test.js`；`.verification/cg-metric-ui-results.json`13项、`cg-metric-input-ui-results.json`10项，`errors: []` | 手册2-65–2-67的11分类/106单位、四分类F键分页及十数字单位弹窗；所有106个opaque单位命令的MathLive/Line往返和原子编辑；实数/一维实数List、温标、分类错误与有效范围。按2-3优先级分别绑定Metric操作数，覆盖多转换/嵌套/参数、Math分数与显式除法的区别，以及原生List/Mat/Vct前缀索引。索引经受限RunMatrix求值，通用安全解析器不开放任意accessor。两份UI报告为340×177组件，主控/真实包由MAIN12另证；旧版NIST常数及未由真机证明的约定保留说明。 |
| LIST12 | `tests/cg-list-formulas.test.js`；`.verification/cg-list-formulas-verification.json`13项纯测试；`cg-list-formulas-ui-results.json`12项与`cg-statistics-ui-results.json`26项实际UI | 3-2/3-3列头一次性计算List1+List2→List3={9,11,13}，26列/六文件/名称/逐元素算术/选中文件的隔离采样与失败回滚；点击列头或首行UP后EXE整列写入。源值后改不会自动重算，没有新增持久公式字段。实际Main/打包整列写入由MAIN12确认；空/标量结果、重名和颜色传播等原机细节仍未验证。 |
| MAIN12 | `scripts/cg-phase12-main-ui-test.mjs`；`.verification/phase12-main-source-0.12.0.json`、`phase12-main-packaged-0.12.0.json`，2026-11-01，源码/真实包各22项，`errors: []` | Manual/Simp因子/错误/非法因子不拼接、物理存储、真实重启、Line Simplify命令/无因子Simp/临时混合分数、Program偏好与精确变量、Statistics一次性公式；Math/Line原生Metric菜单及后续+1、温标、共享List与独立标量Ans、Math List1[2]索引、EXIT返回OPTN、CAPTURE叠加键盘、SET UP/切型号清理。0.12.0已部署；此22项不等同完整CALC命令集或全部手册。 |
| PACKAGE12 | `.verification/*packaged-0.12.0.json`、`package-content-0.12.0.json`、`desktop-update-0.12.0.json`、`installed-0.12.0.json`、`userdata-before/after-0.12.0.json` | 七套真实包回归22+13+9+7+18+12+10=91项成功；程序身份/构建资产及Electron源匹配，研究素材未打包；实际桌面入口指向0.12.0，更新前后5个profile的数据hash一致。部署成功不替代未列功能、设备通信或真机逐屏认证。 |
| CORE13 | `npm test`；`.verification/0.13-core-final.log`，2026-11-01，926/926，0失败/跳过 | 0.13.0最终多型号源码回归，包含原生CALC输入/重写/数值、Program近似与notice元数据、Line CLIP边界及所列回退。926是项目用例数，不是手册功能数。跨型号源码UI50项另存 `models-source-0.13.0.json`、`native-entry-source-0.13.0.json`、`fraction-layout-source-0.13.0.json`。 |
| CALC13 | `tests/cg-calc-expression.test.js`、`cg-calc-model.test.js`、`cg-native-calculus.test.js`；`cg-numerical-functions-verification.json`、`phase13-solve-nesting-review.log`、`phase13-solve-nesting-regression.log`；[数值边界](CG50_NUMERICAL_FUNCTIONS.md) | Int÷/Rmdr原生中缀与同乘除左结合、logab(base,value)、diff/diff2、原生积分默认tol1E-5/内部Rad、Σ指定变量与步长、闭区间FMin/FMax返回坐标List、有界Solve和SolveN多根/警告。数值专项34及联合53、Model5/原生calculus5通过；Solve允许一阶微分/积分而仍禁二阶/Σ/极值/递归。默认n6、非多项式[-100,100]、整数安全范围/负商、Σ最终绑定、算法预算仍是明确项目策略。 |
| INPUT13 | `scripts/cg-calc-input-ui-test.mjs`；`cg-calc-input-ui-results.json`9项实际340×177 UI；`phase13-input-pure.log`61项历史输入纯回归、`phase13-line-clip-fix.log`37项后续修复回归 | CALC函数/中缀opaque命令，回调body与SolveN等式不在读取时求值，Sigma绑定变量作用域、Math/Line重载、原子DEL/Undo/CLIP；Line复制恢复后保留Int÷/Rmdr两侧canonical边界，不扩大通用Accessor白名单。组件证据不独立代替MAIN13。 |
| MAIN13 | `scripts/cg-calc-main-ui-test.mjs`；`calc-main-source-0.13.0.json`、`calc-main-packaged-0.13.0.json`，源码/真实包各26项，`errors: []` | 实际三页CALC F键，Math/Line商余数/优先级/DEL/Undo/CLIP，logab底数次序，一/二阶微分与积分Deg保留，Σ变量更新及自然模板，极值/ListAns与独立scalarAns，SolveN警告/EXE/一阶回调、有界Solve、No Solution/错误银行保留；Line/Program近似与notice、Program Input焦点恢复及真实重启。所列流程已纳入桌面0.13.0。 |
| PACKAGE13 | 八份 `*-packaged-0.13.0.json`；`package-content-0.13.0.json`、`desktop-update-0.13.0.json`、`installed-0.13.0.json`、`userdata-before/after-0.13.0.json` | 26+22+13+9+7+18+12+10=117项真实包回归通过；构建资产/Electron源与安装ASAR核对。安装identity为0.13.0/packaged/title正确；本次6个profile、active cn999cw及银行hash保留。没有声称所有OPTN、原生通信或逐屏逐键完成。 |
| NUM | `tests/engine.test.js`、`numerics.test.js`、`cg50.test.js`、`models.test.js`、`display.test.js`等 | 公共数学、型号预算、输入保护及部分边界。仅引用实际运行，不把测试文件存在计作成功。 |

0.11.0/0.12.0历史证据继续保留；0.13.0已重跑八套真实包回归，MAIN13单独确认新增CALC26项，PACKAGE13汇总117项及当前6个profile保留。原生G3M主控9项亦在0.13.0重跑；原生codec已记录源SHA256为`3ce1653eeb956c86b51af3aabda144929ac4f2750e06b887b423a747275c23a3`，后续codec变更仍须另核对。

## 第1—4章：基本操作、计算、列表、方程

| 手册目录范围 | 当前实现与入口 | 状态 / 证据 | 仍缺或待验 |
| --- | --- | --- | --- |
| 入门；1.1 Keys、1.2 Display | 原创机身、F1–F6、SHIFT/ALPHA/字母锁，1–9/A–J主菜单和应用软键 | 部分；MAIN-OLD、NUM | 原厂字体/点阵/提示图标、逐键屏幕及全部组合键未认证；19入口不等于整机复刻。 |
| 1.3 编辑、1.4 Math I/O | 自然输入、Line原子token、历史/Undo/Redo、分数结果分离；canonical CLIP；单位/Simp/CALC命令、受限原生数组索引 | 部分；LINE、SETUP、METRIC12、MAIN12、INPUT13、MAIN13、PACKAGE13 | 所列同名字形、物理DEL/双向CLIP、Metric交叉弹窗与CALC中缀复制流程已在主控和包验；全部光标/模板、选区、历史与跨模式组合仍未逐项穷尽。 |
| 1.5 OPTN、1.6 VARS、1.7 PRGM | 分页LIST/MAT/VCT/财务/统计、CALC三页、专用变量、字符串、20槽F-MEM、Graph组合引用/命令目录 | 部分；MAIN-FIN/EXAM、ARRAY、GRAPH、P-UNIT、MAIN13 | CALC所列物理键序已验；其他OPTN分组如HYPERBL/PROB/NUMERIC/ANGLE/ENG-SYM/LOGIC仍有通用目录回退，完整命令树、无括号词法和各应用可用性未逐项完成。 |
| 1.8 SET UP | 原生上下/F键；Math/Line、Mode、分数、Rad/Deg/Gra、Real/a+bi/polar、Fix/Sci/Norm/工程；Financial共享；Simplify由精确载体消费，CALC遵守所测设置/重启 | 部分；SETUP、SIMP12、MAIN12、MAIN13、PACKAGE13 | 所列Setup/Program/RunMatrix共享偏好与Main/真实包流程已验。积分内部按Rad且不改变保存的Deg设置；各应用专属设置/恢复策略、中间分母、全部精确显示条件仍未穷尽。 |
| 1.9 Capture、1.10 故障恢复 | IPC只截LCD；全局Capture1–20与Program/3D共享；Pict由Graph/Program/Geometry/Picture Plot共用 | 部分；MAIN-RUN、EXT、PIC、3D、GRAPH | 原生二进制Pict/Capture及全部跨写/重开组合未认证；硬件RESTART/电池/内存故障未模拟。旧“编号路径未统一”已过时。 |
| 2.1—2.3 基本/特殊/角度显示 | 四则/变量/Ans/存储、10位Norm、Fix/Sci、分数/复数/工程 | 部分；NUM、MAIN-RUN、SETUP | 内部双精度与原机十进制不同；完整显示范围、近似传播、错误位置和末位未认证。 |
| 2.4 函数、2.5 数值 | 三角/双曲/对数/组合/随机、安全F-MEM；CALC三页的Int÷/Rmdr、logab、一/二阶微分、积分、Σ、FMin/FMax、有界Solve、SolveN及Simp | 部分；NUM、P-UNIT、GRAPH、SIMP12、CALC13、INPUT13、MAIN13、PACKAGE13 | 所列原生输入/状态/例题已接入并部署：极值返回坐标List、SolveN多根与警告、Σ循环变量更新、近似传播、失败保留和重启。完整函数域/设备词法、Graph全部省略点/组合路径、复杂值、切根/窄峰/高振荡/病态系统仍未认证；n6/默认搜索区间、整数/舍入/中断与内部算法仍有项目策略，不能称全部CALC或厂商末位1:1。 |
| 2.6 复数 | 标量及List/Mat/Vct复杂算术、共轭/实虚部/模/辐角/JSON恢复；Real保留复杂数据但使用时报域错误 | 部分；ARRAY、STAT、EXT、P-UNIT | 已不再“仅标量”。所有函数/极坐标/混合容器和错误域仍需真机；统计数据通常仍需实数。 |
| 2.7 进制 | Run-Matrix Bin/Oct/Dec/Hex、逻辑/Ans | 部分；NUM | 当前32位二补码/回绕；原机位数/负数/溢出/计算域全表尚未复刻认证。 |
| 2.8 Matrix、2.9 Vector | 26 Mat/26 Vct/Answer、DIM/行操作/行列增删/复数/CSV；真正二维row/column、Norm/DotP/CrossP/Angle/UnitV | 部分；ARRAY、P-UNIT、F/S/A-UNIT | 每维999/矩阵4096格为项目预算，非原生RAM计量；病态线代、CSV全边界、原机末位与完整内存编辑键序未验。 |
| 2.10 Metric Conversion | CONVERT的11分类/106单位、原生数字单位弹窗、Math/Line单位命令及▶、标量/List、受限原生数组索引与正确操作符优先级 | 部分；METRIC12、CORE12、MAIN12、PACKAGE12 | 菜单13项/输入10项组件及所列Main/真实包流程通过，已纳入桌面0.12.0。原机add-in行为、全部末位/极端数值/错误与目录键序尚无真机认证，历史常数及项目布局约定明确保留。 |
| 3.1—3.3 列表编辑/操作/算术 | 26×999、命名/颜色/复数、排序/Seq/累计/差分/百分比；频数Mean/Median、成对Min/Max、ListToMat/MatToList共享；列头一次性整列公式 | 部分；STAT、ARRAY、LIST12、MAIN12、CORE12 | 列头公式12项新组件、原26项及所列Main/真实包流程通过并部署；完整名称/公式词法、排序键序、颜色传播和设备内存规则未齐。第3章未描述持久关联公式或源值修改后自动重算，不将其列为原生缺项。 |
| 3.4 List Files、3.5 CSV | 六文件独立保存；CSV/项目JSON；原生G3M列表分阶段导入/编码 | 部分；STAT、N-MEM、HOST/STATE、MAIN-NATIVE | G3M真实样本没有数组记录；CSV全域未验。六文件清空删除同步有codec用例；主控9项覆盖混合导出与程序删除，不宣称所有数组清空路径已逐个UI验。 |
| 4.1 联立、4.2 二至六次、4.3 Solve | Equation2–6元/2–6次、公共SOLVE、退化输入保护 | 部分；NUM | 复根排序、重/近邻根、病态系统、多解交互、错误域及真机末位未验。 |

## 第5章：Graph / Dynamic / Table / Recursion / Conic

| 手册小节 | 当前实现与入口 | 状态 / 证据 | 仍缺或待验 |
| --- | --- | --- | --- |
| 5.1 样例、5.3 绘图 | 20槽Y=/X=/极坐标/参数/不等式、样式/启用/Simul/Plot或Connect；F-MEM/组合引用 | 部分；GRAPH、GRAPH-COMP、NUM | 全部复合/列表同时绘图、覆盖/特殊语法和像素边界未认证；有限采样不证明连续。 |
| 5.2 显示控制 | Graph SET UP/VWIN/6组V-MEM、22个X/Y/Tθ/Right变量及dot联动；Program独立clone/ViewWindow/snapshot | 部分；GRAPH、P-UNIT、MAIN-RUN | 0.11.0跨应用共享VWIN已有封存主控证据；全部命令组合、错误回退和设备像素步进仍未穷尽。 |
| 5.4 保存/恢复 | 20组GPH-MEM、20共享Pict/Capture；背景OPEN/SAVE/Fade/BGV-WIN | 部分；GRAPH、EXT、PIC、MAIN-RUN | BGV-WIN是profile元数据；未知G3P footer/其他像素格式仍拒绝，未宣称完整原生图像互通。 |
| 5.5 Dual Graph | G+G独立左右窗/L/R/B/COPY/SWAP/双窗Zoom；GtoT捕点/切换/删行 | 部分；GRAPH23项 | 旧“独立双窗未实现”已过时；更多关系/设置/重入/剪裁和像素对照仍待验。组件23项不是全main路由证明。 |
| 5.6 手动画、5.12 Sketch | 点/开关/线/圆/横竖线/文字/笔迹/切线/法线/逆图；Program实际Canvas | 部分；GRAPH-COMP、EXT、P-UNIT | 颜色、清除、像素坐标、背景和叠图/图像保存组合未完整对照；有对象/指令预算。 |
| 5.7 Tables | Table共享20槽/参数成对列/范围/CSV/合计/Trace；Graph内GtoT另有工作流 | 部分；WORK、GRAPH、MAIN-OLD | 二者不能互相替代验收；完整表编辑/Setup/列表驱动及内存行为未穷尽。 |
| 5.8 Modify | Graph1–5系数/Step、七BUILT-IN；Picture Plot DefG/Modify；20槽F-MEM | 部分；GRAPH、GRAPH-COMP、PIC | 模板/关系限制、系数更新和原机键序未逐项认证。 |
| 5.9 Dynamic | 扫描参数/范围/帧/播放停止、Program DrawDyna实际动画 | 部分；WORK、EXT、P-UNIT | 完整多函数/速度/重复/存储菜单仍待补验；101帧/总采样预算是桌面策略。 |
| 5.10 Recursion | a/b/c显式/一阶/二阶、耦合更新、初值/下标、表/图/Trace/合计、DrawR/DrawWeb | 部分；WORK、P-UNIT、EXT | 全部模式/表编辑/蜘蛛网键序与错误域未验；1000行/10000演进步为项目上限。 |
| 5.11 Conic | 圆/椭圆/双曲线/横竖抛物线、中心/焦点/顶点/渐近线/准线 | 部分；WORK、NUM | 完整原机方程模板/转换/G-Solv未齐，一般旋转二次曲线不作已完成声明。 |
| 5.13 Function Analysis | ROOT/MAX/MIN/Y-ICPT/ISCT、X/Y-CAL/积分/Trace；Stats/Sheet各自分析 | 部分；GRAPH-COMP、STAT、SHEET | 主要限合适的Y=f(X)，其他关系Trace不等于全G-Solv；全根/切根/极端数值未认证。 |

## 第6—10章：Statistics、Financial、Program、Spreadsheet、eActivity

| 手册目录范围 | 当前实现与入口 | 状态 / 证据 | 仍缺或待验 |
| --- | --- | --- | --- |
| 6.1—6.3 准备/统计图/拟合 | 三S-Gph/九图形/十二回归/频数/四分位、X/Y/GRAPH/PTS寄存器/残差估计 | 部分；STAT、F/S/A-UNIT | 图形混用、标记/公式保存键序、全部病态拟合未认证；仍需全菜单/数据模式矩阵。 |
| 6.4、6.8、6.9 计算/术语/公式 | 加权汇总、4个StdDev/Variance、x-hat/y-hat、原生字母系数与结果列表 | 部分；STAT、F/S/A-UNIT | 复杂数据整体拒绝不丢元素；其他字段顺序/默认/精度/极端域仍未真机认证。 |
| 6.5 Tests、6.6 Interval | Z/t/比例/回归t/χ²/F/单双方差分析/区间；12个Line TEST语句及Program原子目标写回 | 部分；STAT、EXT、P-UNIT | Program目标别名/失败回滚已有用例；最新main Line与原生文件组合待报告，全部数据/尾部/图域未穷尽。 |
| 6.7 Distribution | 八族/24原生函数/列表广播/ALL、反函数右尾/Normal中央limits及独立寄存器 | 部分；STAT、F/S/A-UNIT | 极端尾部、离散反函数边界/所有默认参数和输入域仍需独立/真机数据。 |
| 7.1；7.2—7.10 财务 | 单利/TVM/现金流/摊销/换率/成本售价毛利/日期/折旧/债券、表/图 | 部分；FIN、MAIN-FIN/EXAM | IRR/yield有界可能漏根；不规则期/费用/日期/末位未认证，Break-even为扩展。 |
| 7.11 财务函数 | 24个手册Smpl/Cmpd/Cash/Amt/Cnvt/Cost/Sell/Margin/Days/Bond函数、六设置命令/专用VARS，三应用共享 | 部分；FIN、F/S/A-UNIT、MAIN-FIN/EXAM | 签名/default/例题成功不等于全域/多根/逐屏逐键完成；未猜造手册没列的Dep_*或日期加减函数。 |
| 8.1—8.4 编程/编辑/文件 | 多程序/空白新建/明确请求SUM示例、暂停恢复/Undo；限定原生G3M导入重编码 | 部分；FIN、EXT、P-UNIT、N-MEM | 密码访问/复制保护/搜索/文件夹完整工作流仍缺；保存密码字节不是密码UI，文本编辑不是完整原机状态机。 |
| 8.5 Command Reference、8.6 函数 | BASIC控制流、复杂标量/List/Mat/Vct/Str、26向量/Answers、统计/财务/F-MEM/VWIN/Locate/Draw系列 | 部分；P-UNIT、EXT、F/S/A-UNIT | **不是完整OS3.00命令集或固件。** 外设I/O/命令变体/无括号词法/图形控制/键码待逐项；50000步/1000输出/16层等为项目预算。 |
| 8.7 命令表、8.8 文本转换 | native token子集/标准TXT转义、六个作者原件源码token一致与保真、新程序安全编码 | 部分；N-MEM | 未知token/字形opaque或拒绝；六份文本匹配不证明游戏Getkey/绘图/时序可运行，更不证明全token表。 |
| 8.9 Program Library | SUM及解释器所测数值程序 | 部分；FIN、P-UNIT | 手册程序库未逐例完成；六个公开游戏不是手册Program Library替代。 |
| 9.1—9.3 基础/操作/指令 | A1:Z999/文本公式/引用GRAB/命名多表/行列操作/CLIP/格式/CSV/Undo | 部分；SHEET、WORK | 旧“没行列增删/多表”已过时；全部函数/命名/键序/迁移边界未验，30KiB预算不同原机计量。 |
| 9.4 Conditional Formatting | 两条范围条件/优先级/数值区间、单元前背景色/亮度 | 部分；SHEET | 旧“仅表级阈值”已过时；完整条件公式/颜色/范围/多表复制未穷尽。 |
| 9.5 图形、9.6 内存 | 表内统计图/回归/G-Solv/Pie颜色联动、List/Mat/Vct/变量STORE/RECALL、CSV/命名表持久 | 部分；SHEET | 数学能力不等于全部表格专属键序/存储转换已验；跨应用覆盖/失败组合仍需补充。 |
| 10.1—10.4 eActivity | 命名文档/Text/Formula/Graph/Table strips、计算/删除/重命名/项目JSON | 部分；WORK | 全部应用strip/保护/上下文返还、原生G3E未实现；JSON不冒充原生文件。 |

## 第11—13章：Memory、System、Data Communication

| 手册目录范围 | 当前实现与入口 | 状态 / 证据 | 仍缺或待验 |
| --- | --- | --- | --- |
| 11.1 Memory Manager | JSON字节/类型/变量/备份恢复；Link原生G3M记录预览/冲突/REPLACE/导出 | 部分；MAIN-OLD、HOST/STATE、N-MEM、MAIN-NATIVE | Main/Storage分区/目录移动/优化/容量/保护未完整复制；程序删除再导出/重启已验，全部数组/六文件/覆盖组合仍非完整UI验收。 |
| 12.1 Manager、12.2 Settings | 亮度/定时关机/版本/初始化/原生SET UP；忙碌时避免关机；考试会话 | 部分；SETUP、MAIN-FIN/EXAM、MAIN-RUN | 原机语言/字体/电池/区域/full reset/电源时序未全复制；0.4–1.5亮度和0–1440分钟是桌面策略。 |
| 13.1 PC通信 | JSON备份、G3M支持记录分阶段导入/冲突替换/原生编码并保留未知；限定G3P/G3B真二进制图像读写 | 部分；N-MEM、N-PIC、PIC、HOST/STATE | **没有USB/驱动/设备收发认证。** 六份真实G3M只含PROGRAM；数组/SETUP不得据此称真机兼容。Strings、compound/polar alpha槽、fraction/special BCD、List颜色、G3E、未知G3P元数据未支持或未验证。 |
| 13.2 计算器间通信 | 无原生计算器间链路 | 缺项；整章部分 | 3-pin/USB握手/传输选择/中断恢复/通信解考试未实现，文件下载不是设备传输。 |
| 13.3 Projector | OS可显示Electron窗口 | 缺项；整章部分 | 无原厂投影协议/指定设备操作，普通屏幕投影不计本节。 |

### 原生样本精确边界

- **G3M：** `tests/fixtures/casio-main-memory/README.md`记录abppbd/Casio-Basic-Games同一公开作者六份原始文件（PONG、CONNECT4、3DRENDER、MINESWPR、SNAKE、TICTACTO）及TXT/Git blob/许可，全部Program-only。作者文件不是固件。它们证明所含文本/token及保存保真，不证明六个游戏完整运行。数组/BCD/SETUP使用公开格式事实和独立构造向量，新生成混合记录没有真机接收证据。
- **G3B：** [公开原厂资源导出样本](https://www.cemetech.net/downloads/files/2356/x2777)八份，ZIP SHA256 `7ce34692d9d04a2da4c640fb5db38d307ab4d64641e45646027f28022ea2e41d`。已确认CP0001/RGB565/384×192、已测header变体和200字节footer；Python独立验证全部帧。未编辑保存byte-identical；编辑只改确认的时间/窗口/帧并保留未知字段；普通图片序列也可编码该明确支持的G3B变体。
- **尚无证据：** 实体机收发/打开、其他变体、Plot List XY厂商二进制写回、完整G3P应用元数据。Picture Plot会话companion明确是项目格式，不伪装原生XY；不认识的结构仍拒绝或opaque保留。

## 第14—16章：Geometry、Picture Plot、3D Graph

| 手册小节 | 当前实现与入口 | 状态 / 证据 | 仍缺或待验 |
| --- | --- | --- | --- |
| 14.1 文件、14.2 绘制编辑 | tab/F键、点/线段/直线/射线/向量/圆/弧/半圆/多边形/等腰/矩形/正方形/正多边形、依赖/Undo | 部分；GEO | 命名文件/JSON/G3P背景已存在和有列明实测；原生Geometry对象/应用元数据未完整解码写回。全选取/退化/级联边界未验。 |
| 14.2 构造/变换 | 中点/交点/平行/垂线/垂直平分/角平分/切线/附着角、函数图；反射/平移/旋转/对称/缩放/依赖跟随 | 部分；GEO、相关引擎测试 | 旧成组“未实现”已过时。完整约束/退化/重叠/多解和键序未验；源码有而UI无断言的操作不额外计通过。 |
| 14.3 Window、14.4 Text/Labels | VWIN/Xmin/Xmax/Ymid、Pan/Scroll/Box/Fit、文本/标签/背景Fade/保存保护 | 部分；GEO | 全部单位/坐标/遮挡/属性/字符集/数字指针组合未验，未知原始背景footer不作兼容声明。 |
| 14.5 Measurement Box | 可编辑测量/锁、坐标锁、首维度整体缩放、测量引用/格式、Area Calc | 部分；GEO | 全约束关系/多项联立/失解处理及原机键序未认证。 |
| 14.6 Animation | 多点/曲线/Steps/Times/once/repeat/轨迹/动画表，List/命名Sheet STORE覆盖确认 | 部分；GEO | 全对象/中断/修改组合和设备帧率未验，RAF不等于设备动画时序。 |
| 15.1 Menus、15.2 文件 | raster/明确图片序列/限定G3P、G3B1–30帧/时间窗口/原生SAVE，source-only持久 | 部分；PIC、N-PIC | 非完整设备目录/搜索/删除/资源浏览；其他图像变体/应用元数据仍缺。普通raster JPEG重采样是项目策略，native RGB565不降质持久。 |
| 15.3 Plot | 三点旋转校准/采点移动删除/数字指针/Undo/回归/Y= DefG/Modify/Pict | 部分；PIC、相关引擎测试 | 共用图形只有所测子集，完整Trace/Zoom/Sketch/G-Solv未齐；原生XY二进制写回未知。 |
| 15.4 Plot List、15.5 Graph共用 | T只读时间/XY编辑、List STORE/RECALL、T-X/T-Y AXTRANS/三左图/Cutout/值窗/P-LINK/回归COPY | 部分；PIC22项 | 旧“T/AXTRANS/P-LINK未实现”已过时；全部图形共用命令/样式/帧切换/文件关联仍未认证。 |
| 16.1 样例、16.4 Templates | 三槽Sphere FACTOR/EXPAND、Cylinder、Line EXPRESS/P&V/POINTS、Plane VECTOR/POINTS | 部分；3D、相关引擎测试 | Z=f(X,Y)为扩展不能抵扣模板；所有退化/系数符号/颜色/键序未穷尽。 |
| 16.2 V-Window | X/Y独立grid、Zmin/Zmax/度制视角、6组3D-VMEM | 部分；3D | 全范围/极限精度/Setup和像素投影未真机比对，采样预算为项目上限。 |
| 16.3 Function List | 三图SELECT/确认DELETE/独立线面色、20组3D-GMEM | 部分；3D | 旧“仅单图/没有3D-GMEM”已过时；三图全部相交/遮挡/存储组合未验。 |
| 16.5 Screen | VIEW-X/Y/Z/ORIGINAL、键旋转/自动两圈、轴标签/Sketch/CROSS、Capture1–20 | 部分；3D、MAIN-RUN | 组件Capture和main共享bank分别有证据，全部跨应用覆盖仍未验；隐藏面/交点/屏幕逐像素未认证。 |

## 附录、考试模式与E-CON4

| 手册范围 | 当前实现与入口 | 状态 / 证据 | 仍缺或待验 |
| --- | --- | --- | --- |
| Appendix1 Error Messages | 安全解析/维度/范围/预算/定义域/Memory Full、候选导入/事务、未知格式拒绝 | 部分；NUM、ARRAY、P-UNIT、N-MEM、HOST/STATE | 全原厂错误/阈值/定位/返回编辑键序未逐项映射；拒绝未知不等于全错误表。 |
| Appendix2 Input Ranges | 有限值/维数/采样/容量/日期检查 | 部分；数值测试 | 无全手册逐函数域矩阵，项目预算不同设备范围，未崩溃不等于正确。 |
| Examination β-1—β-3 | 关机组合键/F1-F2-EXIT、备份空白隔离/绿边计时/应用向量通信限制/12h电源恢复 | 部分；`tests/cg-exam.test.js`、MAIN-FIN/EXAM | 旧“没考试状态机”已过时；全关机/计时/硬件防作弊/通信退出未真机验，软件限制不是安全认证。 |
| E-CON4 ε.1—ε.2 | f(t)或Web Serial CSV采样、间隔/波特率/开始停止/10000点 | 部分；System源码；MAIN-OLD仅入口 | 无EA200/CLAB协议或设备实测，不能由Web Serial可用推出传感器兼容。 |
| ε.3检测、ε.4传感器 | 无原生发现/选择 | 缺项 | 原厂传感器识别/通道/目录/接口未实现。 |
| ε.5 Sampling Setup | 基本间隔/函数或串流源 | 部分；源码 | Trigger/通道/快速/周期/实时/周期测量等未实现，setInterval不是设备采样时序。 |
| ε.6校准零点、ε.7 Custom Probe | 无专用配置 | 缺项 | 校准/零点/用户单位/换算/探头存储未实现。 |
| ε.8 Setup Memory、ε.10 Data Memory | 单份设置/采样随工作区保存、CSV | 部分；通用STATE，无设备专项 | 无命名设置库/数据集/原生通道元数据/覆盖流程。 |
| ε.9 Starting Sampling | 函数/CSV串流，Stop/destroy释放timer/reader | 部分；源码 | 真实启动/触发/断线恢复/错误和独立采样时序需硬件。 |
| ε.11—ε.12 Graph Analysis | 曲线/数据表/单变量汇总 | 部分；源码 | 多通道/多图/Trace/FFT/积分/周期分析未齐，不能借独立Graph充抵。 |
| ε.13 eActivity联动 | 通用Text/Formula/Graph/Table strips | 缺项 | 无E-CON Setup/Sampling/Data/Graph专用strip与会话返回。 |

## 下一轮验收门槛

1. **CALC全域与其余原生菜单。** 0.13.0已完成所列三页CALC的输入、模型、Main/Program、真实包与重启验收；不再把Int÷/Rmdr/logab/SolveN等接口列为尚未接入。继续核对Graph省略点/复合路径、每个函数的完整复数/错误域、AC可中断时序、原机末位和全部异常组合；其他OPTN分组仍有通用目录回退。n6及非多项式默认[-100,100]、负数商余数、安全整数域、Σ末次绑定及有界算法明确保留项目策略，不能由26项Main和117项包回归推出全域认证。
2. **完整原生命令/程序库。** 按8.5/8.6/8.7逐命令补语法、域、状态与错误证据；全部Getkey编码/按住释放/循环边界、设备I/O、六个公开游戏完整运行待验。步数/层数/输出预算继续公开。
3. **精确分数/数值域。** BigInt未约分载体、Manual/Simp与显式状态提交已有实现和所列证据；继续验证隐式乘法/完整原生词法、各类表达式的精确来源、中间分母、特殊因子、半值舍入和完整函数域。Metric的目录/优先级与列头公式的一次性语义按各自证据验收；不能用名称齐全或测试数抵扣全部精度和错误域。
4. **样本和硬件分开。** 继续取得真实数组/SETUP/String及其他图像变体，保留hash/独立解析修改证据，再验设备收发。opaque保真不代表语义可执行。
5. **逐键逐屏。** 逐项记录OS/Setup、双方键序、输入/期望/错误/容差、截图与重启；没有实体机证据的章继续待验证。

本账本记录已交付局部能力与剩余工作，没有把用户目标缩为入口展示，也没有宣称完整手册、整机或全部原生互通已经完成。
