# 0.9.0 local delivery

Historical report. The current application and desktop entry were renamed to `scientific calculator simulator` in 0.9.2, and project marks were removed from model bodies, covers and previews. Current validation is recorded in [VERIFICATION.md](VERIFICATION.md).

The model library now presents original calculator previews, exact model names, honest implementation status and a current-model marker. It supports Chinese/English, keyboard selection and narrow/wide layouts. Preview screens contain no invented calculations and introduce no calculator controls or duplicate IDs. X/EX appearance is drawn from reference photographs using original CSS and vectors: silver rim, higher solar panel, four round controls and physical key rows. Their four-column menus retain the previous row when scrolling. CNX remains the independent application mark.

The UI stage was verified against the five existing profiles before fx-991EX development. EX is now a separately configured Experimental profile, with its own English keyboard, twelve applications and 1–9/A/B/C shortcuts, nine variables without z, Calculate SOLVE, CODATA 2010 constants and 45/30-row tables. Distribution order/parameters, 160/80/53-row statistics, volatile data and spreadsheet memory/lifecycle rules follow its cited manual. Blue Base-N keys, physical HEX letters, saved base, Ans continuation and ALPHA DEL undo have actual workflows. QR reports unavailable.

## Files changed in this update

- src/ui/model-picker.js; new model-picker.css and model-preview.js: responsive product library, configuration-based inert previews, status/current identity and accessible controls.
- New src/ui/classwiz-menu.js and classwiz-chassis.css; calculator.js and physical-keyboard.js: original model appearance, four round controls, actual key rows, four-column scrolling menus and selected captions.
- New src/models/ex.js and src/keyboard/ex.js; models/registry.js: independent researched EX policy and English legends, plus X native menu shortcuts. keyboard/cnx.js fixes SHIFT common-log input.
- src/main.js: UI routing/scrolling, model-specific menu keys, distributions, statistics capacities/frequency behavior, Base-N input/status and continuation, volatile sheet/statistics clearing, undo and full-reset session cleanup.
- src/engine/model-calculator.js, modes.js and spreadsheet.js: shared statistics capacity checks, safe integer Ans in Base-N, and configurable transactional sheet memory limits while preserving 999 defaults.
- src/state/store.js and i18n.js: EX base restoration, EX-only definition removal/volatile statistics and translated limits/errors; legacy CN X profile behavior retained.
- New tests/classwiz-ui.test.js, ex.test.js and ex-sheet.test.js; updated models.test.js, state.test.js, i18n.test.js and keyboard.test.js. Unknown-model rejection and all earlier numerical coverage remain.
- New scripts/model-library-ui-test.mjs, ex-ui-test.mjs and electron-layout.mjs; updated native-entry-ui-test.mjs and graphical-ui-test.mjs. The layout helper verifies the requested viewport/zoom before reading bounds. Existing suites remain in the full CI command.
- package.json / package-lock.json: version 0.9.0 and the two new UI commands, without dependency-version changes.
- README.md, README.zh-CN.md, CHANGELOG.md; new docs/FX991EX.md and INTERFACE.md; updated COMPATIBILITY.md, MODEL_REFERENCES.md, ARCHITECTURE.md, ROADMAP.md, VERIFICATION.md, this report and affected actual application screenshots.

## Validation and current support

Final pass/fail/not-run counts, actual executable metadata, checksums, desktop backup and retained intermediate failures are recorded in [VERIFICATION.md](VERIFICATION.md). Source and packaged Electron checks are distinct; a build alone is not UI verification. Hosted CI is not claimed to have run.

Six profiles are selectable: X is Available within its documented scope; CW, 999, EX, TI-36X Pro and CG50 remain Experimental. No profile has complete native-pixel, full-key-sequence or all-domain numerical parity. MathLive/KaTeX and several forms/results remain desktop adaptations, QR is unavailable, and sheet byte encoding is estimated. See [FX991EX.md](FX991EX.md), [INTERFACE.md](INTERFACE.md) and [COMPATIBILITY.md](COMPATIBILITY.md).

The next priority is systematic native-screen/error/setup comparisons for these profiles, rather than adding unverified models. Existing dependency notice/audit work and code-signing evaluation remain separate. No push, tag, public release or repository setting change was performed.

## Windows run, test and package

Use Node.js 24 LTS. Run npm ci, npm test, npm run build, then npm start. Full actual UI: npm run test:ui. Targeted checks: npm run test:ui:library, npm run test:ui:ex and npm run test:ui:native. Package locally with npm run release:win, which specifies publish never. The portable file is release/CNX-Calculator-0.9.0-Windows-x64.exe.

The desktop CNX 计算器 entry retains its name and stable release/win-unpacked/CNX Calculator.exe target. Keep the entire runtime directory. Local updates preserve the daily profile and back up the previous runtime. Dependencies were reused for this update; npm ci was not rerun because dependency versions did not change.
