# Changelog

## 0.4.0 — GitHub release candidate

- Prepare the latest local development through 0.13.0 for the next GitHub release after v0.3.0.
- Add a multi-model library, native input and graphing, spreadsheet, statistics, programming and other experimental model features. See the local milestone notes below and compatibility documentation for limitations.

## 0.13.0 — Local Windows update, 2026-11-01

- Connect native CALC menu input for integer quotient/remainder, logab, derivatives, tolerance-aware integration, Sigma, bounded Solve, multi-root SolveN and closed-interval FMin/FMax.
- Keep scalar Ans separate from ListAns, carry per-result approximation metadata through Program and Run-Matrix, and restore pending Program Input focus after numerical warnings.
- Accept documented first-derivative/integral terms within Solve/SolveN; preserve original nested-calculus restrictions, isolated native scopes, domain errors and fatal timeouts.
- Deduplicate pasted native integer and Metric tokens, preserving atomic deletion, Undo and canonical CLIP.
- Keep the explicit numerical algorithm/default-parameter policies and incomplete device-parity audit.

## 0.12.0 — Local Windows update, 2026-11-01

- Preserve exact unreduced CG50 fraction carriers across Manual/Auto settings, scalar memory, Program, Run-Matrix and restart; add native CALC Simp with optional divisor and F readout.
- Add the native CONVERT catalog with 11 categories and 106 units, Math/Line commands, scalar/List conversion and documented operator precedence.
- Add one-shot Statistics column-header formulas and elementwise List arithmetic.
- Fix native List/Mat/Vct prefixes and indexed reads followed by Metric, Line mixed-fraction formatting, and keyboard routing between Metric and CAPTURE overlays.
- Retain experimental model status and the open chapter-by-chapter parity audit.

## 0.9.3 — Unreleased, local development

- Keep the LCD frame and status row fixed when MathLive scrolls tall fractions into view; scrolling stays within formula/result regions.
- Leave more space between the status row and formula, and give unfinished input the full LCD height while the result is empty.

## 0.9.2 — Unreleased, local development

- Rename the application, window titles, model library, Windows executable and desktop entry to `scientific calculator simulator`; use the corresponding repository slug `scientific-calculator-simulator`.
- Remove shared application branding from every calculator body, protective cover and model preview. Keep each calculator's model identification.
- Preserve existing user profiles and stable internal storage identifiers while changing the visible product name.

## 0.9.1 — Unreleased, local development

- Show the selected calculator already in position, then remove its protective cover on startup and model changes. Draw six original case profiles with separate color, rim, grip and motion details: rail removal for X/EX, CG50 and TI, and clip release/lift for first-generation CW.
- Add a bilingual Uncover replay button; typing or using a calculator key immediately clears the decorative layer. Respect reduced motion and preserve focus, expressions and model state.

## 0.9.0 — Unreleased, local development

- Replace the text-only selector with a responsive model library, original configuration-based vector previews, explicit model/status labels, active markers and keyboard access.
- Rework X/EX chassis proportions, silver rim, solar panel, four round controls and scientific/numeric key rows against front photographs. Add four-column icon menus with a selected caption and overlapping-row scrolling and a borderless LCD editor.
- Add fx-991EX as Experimental with an independently researched keyboard/configuration: twelve apps, native 1–9/A/B/C selection, nine variables without z, Calculate SOLVE, CODATA 2010 constants and 45/30-row tables.
- Apply EX distribution order/parameter order, 160/80/53-row statistical limits, volatile statistics, and a spreadsheet cleared on app exit. Parameterize spreadsheet memory accounting, preserve 999 policy and reject overlong copied formulas transactionally.
- Support EX blue Base-N and physical HEX A–F keys, saved base, Ans continuation and ALPHA DEL undo; report QR as unavailable. Correct X SHIFT common-log entry, equation-menu size labels, hidden frequency weighting and full-reset transient data clearing.
- Add model-library, EX numerical/state and actual Electron regressions. No model is promoted to complete hardware parity; no publication is performed.

## 0.8.3 — Unreleased, local development

- Remove the main formula entry's rectangular focus outline, bottom border and focus background. Keep the cursor, selection, scrolling and parameter-form styling.
- Verify blank, editing and blurred states on X/CW/999 in actual Electron; retain existing input/layout regression checks.

## 0.8.2 — Unreleased, local development

- Correct X SOLVE to retain the equation in Calculate, with ALPHA CALC equality entry, editable variable values, unknown selection and decimal root/residual output. Keep CW/999 Solver in Equation.
- Draw stacked fraction and mixed-number key symbols; capture preceding numerators, distinguish infix division, and fix main-line mixed-number formatting without subtractive rounding artifacts.
- Separate scrolling formula/result regions, contain result columns, reserve CW SHIFT legend space and fit the chassis to narrow windows at fractional zoom.
- Add numerical and actual Electron regressions for these workflows, both interface languages and key/display bounds. Preserve existing suites and Experimental model status.

## 0.8.1 — Unreleased, local development

- Remove the fixed regional-edition label from both CW chassis headers in every interface language.
- Use English for the default repository README and community contribution/reporting files; add a separate Simplified Chinese README with reciprocal language links.
- Refresh affected application screenshots and verify the CW headers in Chinese and English without changing mathematical behavior.

## 0.8.0 — Unreleased, local development

- Prioritize existing profiles: fix scale-sensitive SOLVE false positives, reject underflow plateaus and tiny nonzero minima, and replace raw quadratic normal equations with centered/scaled weighted QR and stable approximate prediction.
- Add the first-generation CW 47-entry CODATA 2018 catalog and the TI guidebook's distinct 20-entry constants.
- Implement TI's six MODE rows, independent notation/decimals, engineering carry, polar results, Classic input and persisted base; add seven documented statistics distributions with SINGLE/LIST and bounded binomial ALL.
- Extend CG50 Graph with five stored line styles, extrema/intersections/intercepts, X/Y coordinate calculations, numerical area, zoom factors, AUTO, ORIGINAL/SQUARE/PREVIOUS, and previous/next analysis navigation.
- Add numerical/model/state and actual Electron workflow regressions. Preserve Experimental until full native-menu, visual and hardware-behavior acceptance is complete. See docs/USABILITY.md and docs/VERIFICATION.md.

## 0.7.0 — Unreleased, local development

- Add the first-generation fx-999CN CW as Experimental, researched against its official manual and white-model front photograph: shared 48-key CW positions with a distinct twelve-app HOME.
- Implement seven probability distributions, scalar and 45-row discrete lists, stable small normal tails, approximate result provenance and validated bounded input domains.
- Add a working A1:E45 spreadsheet with constants/formulas, relative/absolute references, range aggregates, formula/value fill, copy/cut/paste, capacity checks and transactional single-cell edits. Keep sheet data volatile and clear it on ON/power-off, restart and model switching.
- Share CW model policy and physical keyboard data while keeping 991's ten apps and all model histories isolated. Add independent numerical, model-policy, state and actual Electron regressions; document remaining native differences.
- Keep local Windows packaging and the existing desktop shortcut. No push, tag or public release is performed.
- Stabilize CW keycap glyph painting under Windows display scaling, retain caret editing of existing spreadsheet formulas, and keep the selected row visible during continuous entry.

## 0.6.0 — Unreleased, local development

- Rebuild the first-generation fx-991CN CW keyboard against the official front photograph: 48 keys, circular keycaps, a central cursor cross, independent page keys, two six-key science rows and the bottom-row FORMAT key with SHIFT Ans.
- Correct CW SHIFT functions, including nth root, reciprocal, base-10 log, ln and the variable letters; paginate HOME into six visible applications with independent original SVG icons.
- Add offline mathematical suggestions with signatures and Chinese/English descriptions. Tab inserts a selected template; arrows select, Esc dismisses and Ctrl+Space explicitly requests suggestions. Preserve Enter calculation, native placeholder Tab, undo, cursor-adjacent content and IME composition.
- Restrict suggestions to supported model/mode variables, matrices, vectors and defined functions. Add parser/compiler checks for every template and 20 actual Electron interaction regressions.
- Preserve results and computation errors when MathLive emits an input notification without changing the expression.
- Keep native menu/numerical limitations and independent branding explicit. No public release or push is performed.

## 0.5.0 — Unreleased, local development

- Add experimental TI-36X Pro and fx-CG50 profiles with original CSS keyboards based on official manuals and front photographs. Do not claim complete hardware equivalence.
- Implement TI multi-tap log/exponential/trigonometric/probability/variable keys, eight variables, f-only Auto/Ask-x tables, three matrices up to 3×3 and quadratic/cubic/two-/three-variable solver limits.
- Add a shared bounded graph engine and CG50's twenty Y= slots, context-sensitive F1–F6, DRAW, Trace, Zoom IN/OUT, View Window, G↔T and numeric ROOT/next root. Keep unfinished native applications and menu branches explicit.
- Isolate model-specific data limits and graph state. Add physical-layout, graph, formula and actual Electron interaction/restart tests; preserve existing regressions.
- Keep the same-download automatic OS language selection and manual overrides introduced in 0.4.1. No push, tag or public release is performed.

## 0.4.1 — Unreleased

- Detect the preferred OS UI language on first launch of the same download: Chinese locales use the supported Chinese UI; other locales fall back to English.
- Preserve saved manual language choices and legacy preferences across restarts and model switching.
- Expose only immutable OS language data through a sandboxed preload; keep Node integration disabled.
- Add language resolution, storage fallback and actual Electron startup/restart regressions.

## 0.4.0 — Unreleased

- Extract shared engine/model-policy boundaries, per-model keyboard mapping, renderer helpers and validated state storage.
- Add a bilingual model selector, remembered model, isolated profiles and X-only legacy migration with backup retention.
- Preserve fx-991CN X workflows; add an experimental fx-991CN CW profile with its own HOME order, keys, variables, function registration and table limits.
- Keep fx-991EX planned and disabled. Do not claim complete physical-device parity.
- Add model, keyboard, state and numerical regression checks and extend actual Electron UI validation.
- Mark numerical integration/differentiation, SOLVE and polynomial roots as approximate decimal results; add regression protection for repeated-root boundaries. Add an explicit saved-statistics editing entry while preserving blank new inputs.
- Run Linux core checks and Windows tests/UI/packaging on push and PR; retain failure evidence. Remove automatic public GitHub Release creation.
- Document architecture, verified compatibility limits, model references, dependency review, contribution and security policies.

此条目记录本地开发范围，尚未发布；测试的实际通过/失败/未执行情况见 [验证记录](docs/VERIFICATION.md)。

## 0.3.0 — Prior codebase

The previous codebase provided an offline Windows calculator centered on fx-991CN X: ten modes, Chinese/English menus, graphical formula/data input, keyboard interaction and Electron packaging. Historical verification is recorded in Git history; the current verification document describes the present checkout.

原有版本围绕 fx-991CN X 提供十种模式、中英文、二维公式/数据输入、键盘操作与 Windows 便携打包。本条不推断 GitHub 实际发布日期。
