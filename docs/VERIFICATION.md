# Verification record: 0.13.0 local Windows update

2026-11-01: **scientific calculator simulator 0.13.0** replaced the existing desktop application. The installed title/version/packaged state, shortcut, visible window and the current 6 profiles were verified. CG50 remains Experimental. The complete 1:1 manual/device objective is **not complete**; all sixteen chapters retain their documented partial status in [CG50_MANUAL_AUDIT.md](CG50_MANUAL_AUDIT.md).

| Final check | Result | Evidence in `.verification/` |
| --- | --- | --- |
| Core engine/state/codec/compatibility | 926 passed, 0 failed | `0.13-core-final.log` |
| Shared source-app UI | Models17, native entry23, fraction layout10: 50 passed | `models-source-0.13.0.json`, `native-entry-source-0.13.0.json`, `fraction-layout-source-0.13.0.json`, `0.13-shared-ui-final.log` |
| New CALC main controller | Complete26 workflows passed in source and actual package, no renderer errors | `calc-main-source-0.13.0.json`, `calc-main-packaged-0.13.0.json` |
| Packaged regression | CALC26 + phase12main22 + RunMatrix13 + G3M9 + financial/exam7 + expanded main18 + Graph12 + fraction10 =117 passed | `0.13-packaged-ui.log`, eight `*-packaged-0.13.0.json` reports |
| Native CALC input | Opaque functions, infix priority, scoped callback bodies, natural Sigma, atomic editing/reload;9 actual340×177 workflows | `cg-calc-input-ui-results.json`, `phase13-input-pure.log`, `phase13-line-clip-fix.log` |
| Numerical helper/domain/isolation |34 specialized and53 combined tests; Source/Model/Program integration separately checked | `phase13-solve-nesting-regression.log`, `cg-numerical-functions-verification.json`, `phase13-calc-model.log`, `phase13-program-metadata.log` |
| Package identity | Built index/JS/CSS and Electron sources match installed ASAR, research fixtures excluded | `package-content-0.13.0.json`, `source-0.13.0.json` |
| Desktop installation | Correct stable target, application title/version, shortcut and visible native window | `desktop-update-0.13.0.json`, `installed-0.13.0.json`, `desktop-visible-0.13.0.json` |
| Retained user data | All6 current profiles, active `cn999cw`; normalized scalar/definition/angle, matrix, vector, List and Program hashes match before/after | `userdata-before-0.13.0.json`, `userdata-after-0.13.0.json` |
| Actual installed-app video |34.44s H.264,480×900,426375 bytes; full decode, Chromium playback/seek passed | `cg-calc-demo-0.13.0/recording.json`, `cg-calc-demo-0.13.0/playback.json`; `录屏/scientific calculator simulator-0.13.0-CG50数值计算演示.mp4` |

Native CALC now inserts and executes integer quotient/remainder, logab, one/second derivative, tolerance-aware integration, native Sigma, bounded Solve, multi-root SolveN and closed-interval FMin/FMax. The latter commands return native List answers while preserving the independent scalar Ans. SolveN warnings require actual EXE acknowledgement, including Program pause/resume Input. Approximation metadata tracks each actual result/assignment and survives loops/index evaluation without reevaluating callbacks. Line paste deduplicates both integer-operator and Metric tokens. Legal first-derivative/integral terms remain accepted within Solve/SolveN; other documented nesting bans, scope isolation, fatal timeouts and invalid-domain errors are maintained.

The first shared native-entry run used an immediate MathLive focus-state assertion and stopped on its asynchronous blur transition, cascading later X checks into the CW model. The harness now waits for DOM/MathLive agreement across two frames and explicitly restores the X profile; every original style and functional assertion remains. Its final23 checks and fraction10 passed; the initial failures remain in `native-entry-0.13-initial-failures/` and `0.13-shared-ui.log`.

The pre-update runtime, shortcut and state are backed up at `release/desktop-backup-20261101-192304`. The current six-profile state differs from the earlier five-profile0.12 milestone; this update compared its own immediate before/after state. Source digest `c45e445531137de5354f8587e4b50c5171df1dc2200a65a22bcc36d056fb0961` is sealed in `release/source-0.13.0.zip`. No remote push or public release was performed.

The algorithms, safe-integer limit, signed division policy, final Sigma binding, default extremum n=6 and non-polynomial SolveN search[-100,100] have explicit project boundaries; these are not asserted manufacturer defaults or exact firmware arithmetic. The remaining native OPTN groups, complex principal-value behavior, random sequences, complete domains, device protocols and other chapter workflows remain open. See [CG50_NUMERICAL_FUNCTIONS.md](CG50_NUMERICAL_FUNCTIONS.md).

## Previous 0.12.0 milestone

2026-11-01: **scientific calculator simulator 0.12.0** replaced the existing desktop application. The installed executable, title, visible window, shortcut and original five model profiles were verified. CG50 remains Experimental: the complete 1:1 manual/device objective is **not complete**; all sixteen chapters retain their documented partial status in [CG50_MANUAL_AUDIT.md](CG50_MANUAL_AUDIT.md).

| Final check | Result | Evidence in `.verification/` |
| --- | --- | --- |
| Core numerical/state/codec/compatibility tests | 843 passed, 0 failed | `0.12-core-final.log` |
| Shared source-app UI regression | Models17, native entry23, fraction layout10: 50 passed, no renderer errors | `0.12-shared-ui.log`, `models-source-0.12.0.json`, `native-entry-source-0.12.0.json`, `fraction-layout-source-0.12.0.json` |
| New real main controller | 22 passed in both source and packaged application | `phase12-main-source-0.12.0.json`, `phase12-main-packaged-0.12.0.json` |
| Packaged regression | New main22, Run-Matrix13, native G3M9, financial/exam7, expanded main18, Graph12, fraction layout10: 91 passed | `0.12-packaged-ui.log`, seven versioned `*-packaged-0.12.0.json` reports |
| Independent component UI | Setup14, Metric menu13/input10, column formula12 plus original Statistics26 | `cg-setup-ui-results.json`, `cg-metric-ui-results.json`, `cg-metric-input-ui-results.json`, `cg-list-formulas-ui-results.json`, `cg-statistics-ui-results.json` |
| Package byte identity | Built index/JS/CSS and Electron sources match installed ASAR; research fixtures excluded | `package-content-0.12.0.json`, `source-0.12.0.json` |
| Desktop installation | Correct stable executable, name, version, shortcut and visible native window | `desktop-update-0.12.0.json`, `installed-0.12.0.json`, `desktop-visible-0.12.0.json` |
| Retained user data | Five original profiles; normalized variables/definitions/angles, matrices, vectors, lists and programs match before/after | `userdata-before-0.12.0.json`, `userdata-after-0.12.0.json` |
| Installed-app recording | 31.88s H.264, 480×900, 439736 bytes; complete decode, Chromium playback and seek passed | `cg-run-demo-0.12.0/recording.json`, `cg-run-demo-0.12.0/playback.json`; `录屏/scientific calculator simulator-0.12.0-CG50计算演示.mp4` |

The new workflows retain exact unreduced fractions through Setup, Program, Run-Matrix, scalar memory and restart. CALC Simp reproduces the documented 15/60 → F=3,5/20 → F=5,1/4 sequence, specified divisor9, invalid-divisor rollback and omission of F when no reduction remains. The native CONVERT catalog supplies eleven categories and106 units with Math/Line opaque commands, correct arithmetic priority, temperature offsets, flat Lists and native indexed scalar reads. Whole-column Statistics formulas evaluate once; later source edits do not automatically recalculate them. Indexed reads use the restricted Run-Matrix adapter; the generic expression safety whitelist was not broadened.

The prior runtime, shortcut and user state are retained at `release/desktop-backup-20261101-100405`. Source snapshot `c09be0e254e6d31dea0f6d7d76992a9ca90e41c0bb1773167a825113f619bcfc` is sealed with this milestone in `release/source-0.12.0.zip`. No remote push or public release was performed.

Native CALC contracts beyond Simp, device protocols, remaining chapter workflows, firmware numerical representation/last digits, intermediate Manual denominators, unusual divisor boundaries and unverified native file variants remain open. Component, mathematical and public-file tests do not constitute physical-device certification.

## Previous 0.11.0 milestone

2026-10-29: the validated Windows application was installed at the existing desktop shortcut, named **scientific calculator simulator**. CG50 remains Experimental. The user's requested complete 1:1 manual/device replication is **not complete**; the current chapter-by-chapter implementation boundaries remain in [CG50_MANUAL_AUDIT.md](CG50_MANUAL_AUDIT.md).

| Final check | Result | Evidence in `.verification/` |
| --- | --- | --- |
| Numerical, state, codec and compatibility tests | 741 passed, 0 failed, normal Windows permissions | `0.11-core-final.log` |
| Ten legacy Electron UI suites | 222 checks passed across the final individual reports; no renderer/network errors | `0.11-ui.log`, `usability-ui-results.json`, `0.11-ui-remainder.log`; the first usability run exposed outdated test navigation/window assumptions, then its corrected 29 checks passed |
| Packaged native main controller | Run-Matrix 13, native G3M 9, financial/examination 7 passed | `0.11-packaged-main.log` |
| Packaged full application/Graph/layout regression | Full main controller 18, Graph 12, six-model fraction layout 10 passed | `0.11-packaged-expanded.log` |
| Native Graph component | 23 actual Electron UI workflows, no renderer errors; actual 177px tool scrolling/readout verified | `cg-graph-native-ui-results.json` |
| Native Line and Setup components | Line 14 pure +12 actual DOM; Setup 13 pure +12 actual UI | `cg-linear-ui-results.json`, `cg-setup-ui-results.json`, tests and manual audit |
| G3M semantic codec | 22 tests; 6 unchanged Program-only author fixtures; independent public Go reader checked a newly generated program | `g3m-native-codec-verification.json`, `g3m-research/independent-reader-result.txt` |
| Windows package contents | Built JS/CSS/index and Electron main/preload/state-file match installed ASAR byte-for-byte; research fixtures excluded | `package-content-0.11.0.json` |
| Desktop runtime | Actual installed packaged app reports 0.11.0, correct title/name and legacy compatible user-data directory | `installed-0.11.0.json`, `desktop-update-0.11.0.json` |
| Retained user data | All 5 existing profiles retained; normalized variables/definitions/angles, matrices, vectors, lists and programs match the pre-update backup | `userdata-before-0.11.0.json`, `userdata-after-0.11.0.json` |
| Actual installed-app video | 30.08s H.264, 480×900; real Chromium playback and seek pass; no renderer errors | `cg-demo-0.11.0/recording.json`, `cg-demo-0.11.0/playback.json`; `录屏/scientific calculator simulator-0.11.0-CG50演示.mp4` |
| Visible installed window | Correct stable path/title, nonzero native window handle and IsWindowVisible=true | `desktop-visible-0.11.0.json` |

New main-controller checks cover native Math/Line command insertion; distinct financial/statistical `n` registers and ordinary `N`; menu `P/Y` versus typed division; physical deletion, atomic undo and bidirectional Math/Line CLIP without losing aliases; native F3 Mat/Vct editing with a pending complex cell across SET UP; Fix/Sci/Norm and fraction preferences; polar complex Lists; 20 function memories; shared V-Window assignments and Program ViewWindow; and global Capt1–Capt20 storage with pixel-identical Run-Matrix recall. Packaged native G3M checks include exact original SAVE, known record import/replace, numeric program execution, mixed memory export, opaque record retention, corrupt-header rejection, and deletion staying deleted after export and restart.

The pre-update runtime, desktop shortcut and saved state were backed up at `release/desktop-backup-20261029-221004`. The retained-variable checker initially compared an old 26-register CG profile directly with the new 28-register shape; it was corrected to initialize documented defaults before hashing both versions. The only added CG registers are zero-initialized `r` and `theta`; existing values were unchanged. No remote push or public release was performed.

The validated sources were snapshotted in `release/source-0.11.0.zip` before the next unintegrated manual-coverage work began. New working-tree modules do not become part of the installed application until a later validated build and desktop update.

There is no physical-calculator verification. Six original G3M samples are all Program-only and from one author, so they do not establish original-device mixed List/Mat/Vct/SETUP interoperability. The native game token codec also does not prove every game or mini-font glyph executes identically. Device protocols, exact decimal arithmetic/rounding, complete native menus, unverified file variants, Manual Simplify and remaining chapter-specific workflows are still separate open acceptance items.

## Previous 0.10.0 milestone

2026-10-27: expanded CG applications, TI operations and EX text QR. The build is an independent implementation and remains Experimental for CG50. The requested complete manual/device parity is **not complete**; the chapter-by-chapter gaps are recorded in [CG50_MANUAL_AUDIT.md](CG50_MANUAL_AUDIT.md).

| Final check | Result | Evidence in `.verification/` |
| --- | --- | --- |
| Engine, state, file-format and numerical tests | 491 passed, 0 failed | `core-expanded-final.log` |
| Full source Electron regression on the final build | 222 passed, no failures logged; all ten reports complete | `ui-regression-current.log` |
| Isolated CG components | Statistics 23, Workspace 17, Extensions 11, Program/Finance 16 passed | `ui-components-final.log`; final changed Program/Finance modules rerun in `extensions-current-final.log` and `program-finance-current-final.log` |
| Packaged main controller | 18 passed, 0 failed, no renderer exceptions | `expanded-main-packaged-0.10.0.json` |
| Packaged Graph operations | 12 passed, no renderer exceptions | `graph-packaged-0.10.0.json` |
| Packaged fraction/status layout | 10 passed across all six models, including 125%/150% CW/TI | `fraction-packaged-0.10.0.json` |
| Packaged bytes | Source JS/CSS/index and all three Electron files match | `package-content-0.10.0.json` |
| Desktop replacement | 0.10.0; old runtime, desktop entry and previous profile data backed up | `desktop-update-0.10.0.json` |
| Recorded demo | 30.76 s, H.264, 480x900; Chromium playback and seek passed | `cg-demo/playback.json` |

Main checks include every configured CG menu entry, arithmetic/store arrow, BASIC shared lists, Getkey F2/left/SHIFT input, TVM, Graph/Table sharing, Recursion/Dyna, six independent List Files, five 3D shapes, native CP0001 G3P picture import, bounded own-window capture, System settings preservation, TI operation/contrast, EX text QR and desktop state surviving an actual close/restart. Complex scalar Z is also restored after restart. Graph checks cover polar/parametric/X=, inequalities, Xdot, zoom, graph memories, MODIFY and Sketch with keyboard focus restored after coordinate confirmation.

The sealed source digest is `ad9642bd10532110e84be69d58a415061147c14ef4e57ae3f4210f378ea732e6` (`release-source.json`). No public release, push or remote rename was performed. Fixture sources now live in `scripts/fixtures/`, so component checks can run from a clean checkout. CI was updated but the hosted jobs were not run locally.

Native G3M token conversion, G3E semantics, CASIO WES QR, EA200/CLAB communication, full Geometry/Picture Plot and multi-graph/native-memory 3D workflows remain incomplete. The user has no physical calculator or manufacturer files for device comparison. Constructed binary fixtures and a few documented workflows do not prove full native interoperability, screen parity or all-domain numerical equivalence. See the audit for the remaining software work as well as physical verification gaps.

## Historical record: 0.9.3 local development

2026-10-25: fixed fraction input touching the D / Math status row. The LCD frame and calculation viewport cannot be scrolled by MathLive; the formula and result retain their own scrolling. Unfinished formulas gain top space and the unused result row is hidden.

- Fraction layout UI: 10 source and 10 packaged cases passed, covering all six models and 125%/150% narrow-window CW/TI scaling (`fraction-ui-source-0.9.3.json`, `fraction-ui-packaged-0.9.3.json`).
- Existing native formula workflows: 23 passed, 0 failed on the final build (`native-ui-source-0.9.3-final.json`).
- Desktop runtime replaced with 0.9.3, existing five profiles remain readable, packaged assets match source, and the application was reopened with a visible window (`desktop-update-0.9.3.json`, `installed-0.9.3.json`, `package-content-0.9.3.json`).

## Historical record: 0.9.2 local development

2026-10-25: the Windows application, executable, window title and desktop entry now use `scientific calculator simulator`. All six model bodies, previews and covers omit application project marks; each retains its own model name. The old desktop entry was backed up and replaced.

- Core tests: 339 passed, 0 failed (`tests-0.9.2-final.log`).
- Actual source and packaged Electron checks: six correct model identities, unmarked covers, 2+3=5 on every model, both interface languages, narrow library layout and profile persistence after restart (`naming-source-0.9.2.json`, `naming-packaged-0.9.2.json`).
- Installed desktop executable: version/name/title verified, existing active model and five saved profiles readable; archive assets and Electron sources match the current build (`desktop-update-0.9.2.json`, `installed-0.9.2.json`, `package-content-0.9.2.json`).
- GitHub repository rename remains pending: the connected GitHub tools expose no rename action, and browser connection retries timed out. No repository mutation or source push was performed.

## Historical record: 0.9.0 local development

Date: 2026-10-24 (Asia/Shanghai). Windows 11 x64, Node.js 24.21.0, npm 11.19.0, Electron 44.8.0 and Vite 8.3.4. No push, tag, public release or remote setting change was performed.

## Final adopted checks

| Check | Passed | Failed | Not run / skipped | Evidence in .verification/ |
| --- | ---: | ---: | ---: | --- |
| Core tests | 339 | 0 | 0 | tests-final-0.9.0.log |
| Complete source Electron UI, adopted suite results | 7 + 52 + 17 + 20 + 26 + 29 + 23 + 10 + 28 | 0 | 0 | full-before-zoom-readiness, zoom-final and sheet-tools-final source logs; nine versioned source reports |
| Complete packaged Electron UI | 7 + 52 + 17 + 20 + 26 + 29 + 23 + 10 + 28 | 0 | 0 | ui-packaged-final-0.9.0.log; nine versioned packaged reports |
| Actual portable EXE extraction/start/calculation | 1 | 0 | 0 | portable-smoke-results.json, executable checked as 0.9.0 |
| Production build / Windows portable package | Success | 0 | 0 | package-0.9.0.log, exit code 0 |
| README/images/community files | Success | 0 | 0 | docs-check-0.9.0.log |
| Desktop shortcut/main window and package bytes | 0.9.0 | 0 | 0 | desktop-update-0.9.0.json; final-audit-0.9.0.json |
| Hosted GitHub CI | 0 | 0 | 2 jobs | No push; Linux/Windows hosted jobs were not executed |

Adopted executions: **764 passed, 0 failed, 0 skipped**. Repeated source/packaged workflows are not independent feature counts. Suite order is language, original operations, TI/CG50, CW/completion, 999, usability, native input/layout, model library, EX. All existing suites remain; EX availability expectations now reflect its Experimental status while invalid-model rejection remains tested. The final EX executable reports version 0.9.0 and isPackaged=true.

The source total combines successful reports for unaffected suites from the full command with final focused native-input/EX and EX/999 reruns. The full source command initially ended with a zoom-readiness assertion; that raw failed log is retained. A frame probe showed the old viewport can satisfy parent bounds before the requested zoom reaches the renderer, with all three final native captures fitting. Checks now wait for the expected content-size/zoom viewport and all buttons, without loosening acceptance bounds. This supports a timing explanation without claiming the probe captured every failing intermediate frame. A final EX spreadsheet OPTN integration received its own fill/copy check and an EX/999 rerun. The packaged full command is separately required to succeed.

The existing 314 core cases remain, with 25 additional cases for the library/menu, EX math/state/capacities, model-specific sheet memory and Base-N Ans. New UI suites contain ten library and twenty-eight EX workflows. Existing native tests also cover EX input, labels and zoom. The first UI stage passed ten checks against the five existing profiles before EX development began.

## Covered behavior

- Library model identity/status, inert configuration-based vector previews without duplicate IDs, first-launch close protection, both languages, narrow/wide layout, keyboard activation, current-model return and history isolation.
- X/EX chassis and physical key geometry; four-column menus with selected captions and overlapping-row scrolling. Main input remains borderless and separate from results. Existing model bodies and controls remain reachable at narrow sizes.
- EX's twelve applications: arithmetic/fractions, Calculate SOLVE and selected variables, complex values, physical Base-N/HEX letters and Ans continuation, stored matrices/vectors, statistics and frequency toggles, distributions, spreadsheet, table, polynomial equations, inequalities and ratios.
- EX nine-variable policy, independent memory/history/base restoration, no f/g registration, 2010 constants, 45/30 table limits, 160/80/53 statistics limits, volatile data, sheet input/memory bounds and transactional failure.
- Full reset clears session sheets/distribution parameters; QR explicitly reports unavailable. No placeholder calculation results are used. Final UI reports record no unhandled renderer exceptions or HTTP/WebSocket runtime requests.

Intermediate failures were retained. The first library run exposed test navigation assumptions about CG50; a later bounds check needed to wait for the resize to settle. X menu scrolling also revealed root-page scrolling, fixed by keeping selection scrolling inside the LCD. Initial core assertions caught a preview whitespace assumption and an overbroad definition-cleaning policy, which was narrowed to EX. A matrix workflow initially multiplied a previously inserted matrix by its determinant; the test now clears the previous operand. Visible-label checks retain all checks while skipping non-rendered legacy captions and validating their replacement captions. Frequency-result checks compare count/sum rather than assuming decimal-only display, and zoom checks wait for the actual viewport fit. Independent review found and drove fixes for physical HEX letters, hidden frequency weighting, Base-N Ans and reset session data. Final source and packaged runs above supersede these intermediate attempts.

Dependencies were reused without rerunning npm ci or changing dependency versions. License notices were regenerated. The dependency audit was not refreshed; existing notice/audit follow-ups remain in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The approximately 6 MB bundle still produces a size warning.

## Local artifacts and desktop

- Portable: release/CNX-Calculator-0.9.0-Windows-x64.exe (151576130 bytes), actually extracted, launched and used for 2+3=5.
- SHA-256: 902ad5f56b9aa630d03f7a6a21d829902dd736a290f4394b7df3c7fca8586df9; also in release/SHA256SUMS-0.9.0.txt.
- Stable runtime: release/win-unpacked/CNX Calculator.exe. Version, index-8aYIJ0FW.css, index-DYk2knDG.js and main/preload match the current build byte for byte.
- Desktop CNX 计算器 retains its name and target. Previous runtime backup: release/desktop-backup-20261024-182159.
- No daily profile was deleted. Research manufacturer photos/manuals are excluded from the package. The executable is unsigned.

## Limits and screenshots

X remains Available within its documented scope. CW, 999, TI, CG50 and now EX are Experimental. Six profiles are selectable; no model has full physical-device, pixel, key-sequence or numerical equivalence. No complete hardware comparison was performed. Native menus, fonts, error domains, QR and firmware-specific behavior remain incomplete; shared desktop forms are not presented as exact native screens. Sheet byte accounting is an estimate, and SOLVE returns one local real root.

See [interface scope](INTERFACE.md), [EX scope](FX991EX.md), [compatibility](COMPATIBILITY.md) and [development report](DEVELOPMENT_REPORT.md). [Library](model-library.png) · [X](classwiz-x.png) · [X menu](classwiz-x-menu.png) · [EX](ex-calculator.png) · [EX menu](ex-menu.png) · [EX distribution](ex-distribution.png) · [EX sheet](ex-spreadsheet.png). Current affected captures come from the final packaged application; older model screenshots retain their documented scope.
