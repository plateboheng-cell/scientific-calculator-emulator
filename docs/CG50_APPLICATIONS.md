# CG50 application scope · 0.10.0 local

These applications execute in the project's safe numerical engine. They do not load or emulate CASIO firmware. The baseline is the [fx-CG50 Software 3.00 User's Guide](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v300_EN.pdf); the original Program/Financial/graph-helper work checked chapters 5, 7, 8 and 9 on 2026-10-25. This scope was refreshed against the source on 2026-10-27. The profile remains Experimental: working applications and passing project tests do not establish full manual coverage, native-file interoperability or hardware equivalence. No physical calculator or original vendor files were available for comparison.

## Statistics

Statistics provides six independent List Files, each with 26 named lists of up to 999 rows. Switching files snapshots the active lists, names and colors; calculations, Program list access and the list-use callback operate on the active file. The sparse workspace is persisted with the model. The statistics editor enforces a 2 MiB estimate based on the UTF-16 length of its JSON representation and reports Memory Full before accepting an oversized edit. A failed storage write is reported with an export warning; these are desktop storage limits, not native RAM encoding.

One-variable/paired summaries include frequency weights, modes and selectable Std/OnData quartiles. Twelve regression choices cover linear forms, median-median, quadratic/cubic/quartic, logarithmic, exponential forms, power, sine and logistic fitting. Three saved S-Gph configurations can be enabled together, with list/frequency, color, marker and relevant graph-specific settings. Scatter, xyLine, histogram, median box, bar, normal-distribution, Broken, normal-probability and pie plots render actual data. Broken uses histogram class centers; Bar accepts up to three equally sized datasets and rejects overlays with other graph types.

The panel exposes normal, t, chi-square, F, binomial, Poisson, geometric and hypergeometric density/mass, cumulative and inverse calculations, plus probability graphs. Hypothesis tests cover one/two-sample Z/t, one/two proportions, linear-regression t, chi-square goodness-of-fit/two-way, two-sample F and one/two-way ANOVA. Six mean/proportion confidence-interval forms and a labelled desktop slope-interval extension are available. These are bounded numerical implementations; convergence, extreme tails, every firmware domain and pixel equivalence remain unverified.

## Program

`src/engine/cg-program.js` provides a bounded interpreter, and `src/ui/cg-program-panel.js` provides a persistent editor, program selector, examples, output and interactive numerical input. `?→A` pauses and resumes from the same instruction. Programs share A–Z variables and Ans with the calculator when run through the panel. The pure engine itself returns variables without changing its caller.

The editor accepts arithmetic and scientific expressions supported by the shared calculator, including complex scalar calculations when System is set to a+bi, arrow assignment (`→` or `->`), quoted text, `Print`, `Disp`, `?→A`, `Input A`, `If/Then/Else/IfEnd`, `For/To/Step/Next`, `While/WhileEnd`, `Do/LpWhile`, `Break`, `Lbl/Goto`, conditional `⇒`, `Isz`, `Dsz`, `Prog "NAME"`, `Return`, `Stop`, `ClrText`, `Locate`, comments and the `◢` output pause. Commands can be separated by newlines or colons. Function expressions use parentheses, for example `sin(A)`.

The six softkeys and corresponding physical function keys are RUN, NEW, SAVE, DELETE, EXAMPLE and EXIT. Ctrl+Enter runs the selected program; Ctrl+S saves it. A fresh editor starts blank. The explicit EXAMPLE action adds SUM, which asks for N and calculates 1+2+…+N. Physical newline and Undo edit the selected program without replacing its application context.

The interpreter additionally executes List 1–26 and Mat A–Z assignment, one-based element access, dimension changes, paired ascending/descending sort, Fill, ClrList/ClrMat, Seq, Sum/Prod/Mean/Med/Min/Max, Cuml/Percent/Delta, Augment, transpose/determinant/identity and list/matrix conversion. Str 1–20 support concatenation, length/comparison/search, substring, case, reversal/rotation/shift and expression conversion. Deg/Rad/Gra and Fix/Sci/Norm control program calculations/output. `Locate` updates a 21-column × 7-row text buffer.

Program graph output is a real canvas, rendered from typed interpreter commands: Graph/DrawGraph, Plot, F-Line/Line, Circle, vertical/horizontal lines, pixel/text commands, tangent/normal/inverse, view windows and capture/recall. DrawR-Con/Plt/Phase and DrawWeb use saved Recursion settings; DrawFTG-Con/Plt use the saved table range and graph functions. DrawDyna uses saved Dynamic Graph settings, animates the parameter sweep and pauses until EXE continues. Missing formulas/settings produce errors. Drawing captures numeric variables and angle units at each instruction rather than redrawing all curves with final loop values. Timers and frame callbacks are cancelled on AC, Back, application destruction, new runs and display continuation.

The panel accepts `{workspace,matrices,graph,onMemoryChange,onCommand}`. The memory callback receives `{lists,matrices,strings,angle,format}` at completed/input/display/error/user-stop boundaries. Cooperative `Getkey` loops yield animation frames but do not write full memories to storage on every frame. Stopping or destroying a yielding program commits its latest memory snapshot once.

Pict and Capture each have 20 workspace slots. StoPict/StoCapt and RclPict/RclCapt retain encoded RGBA images across rendering sessions using the simulator's `rgba-rle-v1` codec, with a shared 1,200,000-character encoded-bank budget. This is not the native Pict file representation. DrawStat uses the saved enabled S-Gph configurations, active list data, graph types, frequencies, quartile choice and window settings.

This remains a documented bounded BASIC implementation. Native G3M program tokens and G3E eActivity strips are not translated into executable simulator state. Scalar variables may be complex in a+bi mode and use tagged real/imaginary values in the CG desktop profile; List/Mat elements remain real-valued. Serial/peripheral commands and the full OS command inventory have not been certified. `Print` and `Input` are convenient editor aliases. Unknown commands report their source line. Execution is bounded to 50,000 steps by default, 1,000 output lines, 16 nested program calls, 50 saved programs and 40,000 characters per program. User text is rendered as text, and expressions pass the shared safe compiler; JavaScript `eval`/`Function` are not used.

`tests/cg-program-memory.test.js` and `tests/cg-program-canvas.test.js` verify command memories, single evaluation of random/key operands, actual plotted coordinates, state isolation, formatted output, dynamic frame progression, capture recall and explicit timer disposal. `scripts/extensions-ui-test.mjs` verifies the real Program/Finance/Visual modules in an isolated 177px Electron LCD fixture, including graph pixels, always-visible F-key rows, exact-once lifecycle memory commits and bounded local image import.

## Financial

`src/engine/finance.js` uses percentages for rates and signed cash flows. Its panel exposes:

- Simple interest, with 360/365-day basis and SI/SFV.
- Compound interest / TVM, solving n, annual I%, PV, PMT or FV, with independent P/Y and C/Y and beginning/end payments.
- Cash flow NPV, numerical IRR, terminal NFV and discounted fractional payback. The first entered cash flow is CF₀. Multiple discovered IRRs are shown explicitly; absent IRR or payback remains absent.
- Amortization balances, interest, principal and a selected period table.
- Nominal/effective interest conversion.
- Cost, selling price and gross margin, solving any one.
- Actual and US 30/360 day counts and calendar date offsets, in the manual's 1901–2099 date interval. Bond settlement/maturity retain their separate 1902–2097 interval.
- SL, FP, SYD and DB depreciation, including first-year month count and per-year remaining value.
- Bond clean price, accrued interest, dirty cost, days/coupon metadata and numerical yield. Annual/semiannual coupons, actual/30-360 dates, end-of-month schedules and the final partial coupon period are handled.
- Target-profit break-even quantity and sales, added as a project convenience.

The softkeys are CALC, EXAMPLE, TABLE, GRAPH, CLEAR and EXIT. Calculation forms, examples, scalar results, tables and charts run locally. The forms retain entered values by section. Result charts provide project-native visualizations rather than the device's exact financial graph/Trace menus.

The 24 native financial functions listed by OS 3.00 pages 8-48–8-50 also run through Run-Matrix and Program. `src/engine/cg-financial-functions.js` binds the signatures below to the safe numerical engine. Native `Cmpd_I%` is normalized to parser spelling `Cmpd_I`; the manual's text spellings `Amt_SigmaINT`/`Amt_SigmaPRN` represent `Amt_ΣINT`/`Amt_ΣPRN`. This normalization preserves quoted text. The manual does not list `Dep_*` functions or a date-offset function; depreciation and date offsets remain Financial-screen operations.

| Native functions | Arguments |
| --- | --- |
| `Smpl_SI`, `Smpl_SFV` | `(n, I%, PV)` |
| `Cmpd_n` | `(I%, PV, PMT, FV[, P/Y, C/Y])` |
| `Cmpd_I%` | `(n, PV, PMT, FV[, P/Y, C/Y])` |
| `Cmpd_PV` | `(n, I%, PMT, FV[, P/Y, C/Y])` |
| `Cmpd_PMT` | `(n, I%, PV, FV[, P/Y, C/Y])` |
| `Cmpd_FV` | `(n, I%, PV, PMT[, P/Y, C/Y])` |
| `Cash_NPV`, `Cash_PBP`, `Cash_NFV`; `Cash_IRR` | `(I%, Csh)`; `(Csh)` for IRR |
| `Amt_BAL`, `Amt_INT`, `Amt_PRN`, `Amt_ΣINT`, `Amt_ΣPRN` | `(PM1, PM2, I%, PV, PMT, P/Y, C/Y)` |
| `Cnvt_EFF`, `Cnvt_APR` | `(n, I%)` |
| `Cost`; `Sell`; `Margin` | `(Sell, Margin)`; `(Cost, Margin)`; `(Cost, Sell)` |
| `Days_Prd` | `(MM1, DD1, YYYY1, MM2, DD2, YYYY2)` |
| `Bond_PRC`; `Bond_YLD` | `(MM1, DD1, YYYY1, MM2, DD2, YYYY2, RDV, CPN, YLD)`; replace the last argument with PRC for yield |

Omitted compound P/Y and C/Y each default to 12. Successful compound calls atomically update the dedicated n/I%/PV/PMT/FV/P/Y/C/Y registers; other function calls do not overwrite them. Amortization INT/PRN return the PM1 installment, while the Sigma variants return PM1–PM2 totals. Cash lists contain CF₀–CF₂₅₄ at most. Bond_PRC returns the signed `{PRC, INT, CST}` list. The six Program setup commands are DateMode365/DateMode360, PmtBgn/PmtEnd and PeriodsAnnual/PeriodsSemi; initial settings are 365, End and Annual, verified from the default marks on manual 7-2.

The Financial TVM/Amortization forms share their common registers with native calls. Date basis, payment timing and coupon frequency are shared settings; unrelated section inputs remain independent. A successful TVM form calculation fills its solved field. The model's `calculator.financialNative` save data persists `{settings,memory}`. Explicit parser aliases `Finance_n`, `Finance_I`, `Finance_PV`, `Finance_PMT`, `Finance_FV`, `Finance_PY` and `Finance_CY` let VARS insert dedicated registers without overwriting A–Z. Ordinary `P/Y` and `C/Y` division expressions are not globally rewritten.

`tests/cg-financial-functions.test.js` checks all signatures, safe token normalization, the manual 7-20 example, formulas and independent examples, domains, atomic registers, defaults, native calls and Program settings. `scripts/cg-program-finance-ui-test.mjs` additionally exercises Program → Financial → save/reload → Program, section isolation and the prohibition on date offsets in 360-day mode. These tests do not certify every native numerical domain or physical calculator sequence.

Numerical IRR/yield calculations scan and bisect bounded transformed rate intervals; this does not prove that every mathematical root is found. Tangential roots and extremely ill-conditioned cases can be missed. TVM selects the discovered rate nearest the supplied rate guess. Arithmetic is IEEE-754 double precision. Tests check independent loan, par-bond, discounted-bond, known-IRR, cash-flow conservation and calendar examples; they do not establish last-digit firmware equivalence. Depreciation keeps the residual floor and completes the remaining partial-year SYD residual rather than accumulating rounding loss.

## Spreadsheet and graph helpers

`src/engine/cg-workspace.js` exports:

| API | Data and behavior |
| --- | --- |
| `CGSpreadsheet(calculator, data)` | Sparse A1:Z999 sheet; `.set`, `.source`/`.get`, `.value`, `.recalculate`, `.copy(range,to,cut)`, `.fill(range,source)`, `.clear`, `.serialize`/`.save`. Serialized data is `{cells,selected}`. Formulas start with `=`. |
| `cgRange(range)` | Expand a rectangular A1:Z999 range into addresses. |
| `shiftCGReferences(source,dx,dy)` | Shift relative references, retaining `$` row/column anchors. |
| `generateRecursion(calculator,settings)` | Returns `{n,a,b}` rows, with `c` when configured, for up to three explicit, first-order or second-order recursions, with simultaneous evaluation of coupled terms. |
| `graphTable(calculator,expressions,start,end,step,{variables})` | Returns `{x,values,errors}` rows for up to 40 scalar expressions; the application maps 20 graph slots, including both parametric components. Undefined points remain `null` with errors. |
| `dynamicFrames(calculator,settings)` | Returns `{parameter,value,points}` frames without changing saved variables. |
| `conicRelations(settings)` | Returns equation text, center, vertices, foci, asymptotes and directrix metadata. |
| `conicSamples(settings,options)` | Adds sampled curve segments for circle, ellipse, hyperbola or signed horizontal/vertical parabola. |

Spreadsheet cells accept finite real values, quoted text and formulas. Range functions include Sum, Mean/Average, Min, Max, Prod, Count/CountA, Median, sample StdDev and Variance, with Cell-prefixed aliases. CellIf/comparisons and Len/Length, Left/Right/Mid, Concat/Concatenate/StrJoin, Upper/Lower/Trim/Text support conditional and text formulas. Quoted text is protected when references are shifted. Blank referenced cells are zero; aggregate ranges omit blank cells and numeric aggregates ignore text. Circular references, invalid cell bounds and unsafe expressions produce errors. The UI adds CSV import/export, sorting, decimal display and threshold highlighting. Its sparse-cell budget is a 30 KiB JSON-byte estimate, not native memory encoding; full device formatting and clipboard formats remain unverified.

Recursion settings are `{type,expressions:[aExpression,bExpression,cExpression],initial:{n,a0,a1,b0,b1,c0,c1},start,end,step}`. Types are `explicit`, `first`, `second`. Explicit expressions use `n`; first-order computes term n+1 from current `a,b,c`. In second-order mode, expressions calculate term n+2: `a0,b0,c0` denote terms at n and `a1,b1,c1` denote terms at n+1. Aliases `a,b,c` mean current n+1 terms and `ap,bp,cp` mean preceding n terms. For Fibonacci use `a1+a0` with initial a0=0, a1=1. The second and third sequences are optional. Initial subscript defaults to zero. Indices are integers, output is bounded to 1,000 rows, and recurrence evolution is bounded to 10,000 iterations.

Conic settings are `{type,h,k,r,a,b,p,orientation}`. Types are `circle`, `ellipse`, `hyperbola`, `parabola`; orientation is `horizontal` or `vertical`. Ellipse `a` is the major semiaxis. A signed parabola parameter `p` is its vertex-to-focus distance; a negative p reverses opening. Sample options are `{samples:360,extent:10}`. Sampling is finite and does not establish exact curve intersections or continuity.

Dynamic settings are `{expression,parameter,start,end,step,xmin,xmax,samples}`. A maximum of 101 frames and 150,000 total sample points keeps the UI responsive. Graph and dynamic samples retain holes instead of inventing finite values at singularities.

## Visual applications, System and exchange

Geometry supports editable points, lines/segments, circles and polygons, midpoint/intersection/parallel/perpendicular constructions, measurements and a point-rotation animation. Picture Plot imports a bounded local image, calibrates three coordinate reference points, collects/edits data, fits six regression types and exports coordinates as CSV. 3D Graph samples Z=f(X,Y), spheres, axis-aligned cylinders, general planes and parametric lines, with rotation, zoom and surface/wire display. These are independent mathematical renderers, not a reproduction of every native tool or screen.

eActivity stores text, calculation, graph and table strips in simulator JSON documents. Graph/table strips currently evaluate over −5 to 5, rather than exposing every native strip setting. Memory and Link export/import versioned model backups. Link additionally inspects and preserves opaque G3M archive records and decodes/encodes the footer-free CP0001 RGB565 G3P picture variant, with PNG/Picture Plot use. It does not translate G3M program tokens or G3E strips, and no original vendor samples or device transfers have been verified.

System persists software brightness (0.4–1.5), auto power-off (0–1440 minutes, 0 disables), and shared calculation settings. The idle timer powers off the software while respecting active Program/sampling work; it does not certify hardware timing or power behavior. E-CON4 samples a function or a numeric CSV-text serial stream, imports/exports CSV, and displays graphs/statistics. Web Serial requires support and a permitted device. The EA200 native protocol and physical sensor interoperability are not implemented or tested.

## Verification

`npm test` runs the registered core tests. Focused Electron scripts include `scripts/cg-statistics-ui-test.mjs`, `scripts/cg-program-finance-ui-test.mjs`, `scripts/extensions-ui-test.mjs` and `scripts/expanded-main-ui-test.mjs`; they exercise real panels, function-key dispatch, calculations, graph pixels, persistence and application routing. Current executed results, evidence paths and unperformed checks belong in [VERIFICATION.md](VERIFICATION.md). These project cases do not establish every manual workflow or native-device equivalence.
