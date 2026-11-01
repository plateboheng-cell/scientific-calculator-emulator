# CG50 workspace panels

The independent implementation now has working eActivity, Spreadsheet, Dynamic Graph, Table, Recursion and Conic Graphs panels. The panels use the same CG50 calculator engine and physical F1–F6 action dispatch as the host application. This document records concrete coverage, not a claim of firmware equivalence.

`createCGWorkspacePanel({host, calculator, data, graph, mode, onChange, onBack, onGraph})` is exported from `src/ui/cg-workspace-panel.js`. `data` is the complete `cgWorkspace` object. The factory returns `handleAction`, `handleKey`, `insert`, `undo`, `redo`, `focus` and `destroy`. The host should route physical actions and keyboard events before its generic formula handler. `destroy` stops Dynamic Graph playback and releases listeners.

## Implemented workflows

- **Spreadsheet:** sparse A1:Z999 selection and address jump; numeric and quoted text cells; live dependent formulas; lazy `CellIf`; text functions; native aggregate aliases; relative/absolute reference fill; rectangular copy/cut; snapshot clipboard; ascending row sorting by the first selected column; decimal display; simple numeric conditional highlight; range statistics; CSV import/export. Text references preserve strings, and arithmetic rejects invalid text. Transactions have undo/redo, drafts support undo/redo and INS overwrite, and writes enforce a 30 KB working storage estimate atomically. The grid renders a 6-column by 10-row page around the selection and remains usable at the small LCD size.
- **Dynamic Graph:** expression/parameter/range entry, fixed axes across generated frames, playback with configurable interval, previous/next frame using F keys or direction keys, numeric parameter selection followed by EXE, and PNG export. Sampling does not overwrite the calculator's saved parameter variable.
- **Table:** shared Graph expression slots, relation types and enabled flags; 1–20 active Y=, X=, polar or parametric relations (up to 40 value columns); start/end/step entry; singularities retained as error cells; column sums; graph display and CSV export. Plots support a trace cursor, arrow navigation between points/series and numeric argument selection followed by EXE. Graph keys are consumed by the panel instead of falling into the host calculator.
- **Recursion:** up to three explicit, first-order or second-order formulas; configurable initial index and initial terms; coupled simultaneous updates; table, graph, trace navigation and column sums. The flat form has `a/b/c`, `a0/a1/b0/b1/c0/c1` and `n0/start/end/step`. The engine receives `expressions:[a,b,c]` and `initial:{n:n0,a0,a1,b0,b1,c0,c1}`.
- **Conic Graphs:** circle, ellipse, hyperbola and parabola parameter entry; horizontal/vertical orientation; curve plots, centers, vertices, foci, asymptotes and directrix where applicable; PNG export.
- **eActivity:** multiple named documents with Text, Formula, Graph and Table strips; calculation results, embedded plots/tables, strip deletion, file rename/deletion and simulator JSON import/export. New documents start with blank text and formula strips; examples require an explicit action.

## Persistence fields

`activities`, `activitySelected`, `spreadsheet`, `spreadsheetStyle`, `sheetClipboard`, `clipboardText`, `dynamic`, `dynamicFrame`, `recursion`, `conic`, `conicInfo`, `table`, `tableExpressions`, `tableColumns`, `tableRelations`, `tableArgument`. Graph function edits also update the supplied `graph.expressions` and paired `graph.expressions2` arrays. All data callbacks use plain JSON values. Undo history, trace position, eActivity graph/table samples and Dynamic Graph timers are transient.

## Evidence

- `node --test tests/cg-workspace.test.js tests/cg-workspace-ui-utils.test.js`: engine and CSV/chart helper tests.
- `node scripts/cg-workspace-ui-test.mjs`: isolated component scenarios in real Electron, including A1/Z999, text cells, formula recalculation, snapshot copy, relative fill, reload persistence, native graph relation aliases, table singularities, three coupled recursions, Fibonacci output, Dynamic Graph playback, conic focal geometry, eActivity strips, UNDO/INS, and graph input routing.
- `.verification/cg-workspace-ui-results.json` explicitly labels these as component checks. Main-menu dispatch, model switching, host state sanitization and the packaged application require host-level verification as well.

## Remaining native-parity checks

Conditional formatting is currently a simple numeric comparison, rather than every native rule/menu combination. The 30 KB storage estimate measures serialized cell JSON, not the native binary cell encoding. eActivity import/export is documented simulator JSON, not a native `.g3e` decoder. Graph/Table strips currently use the visible fixed sampling range in the Add-strip help. Conic controls cover translated axis-aligned forms; a general rotated quadratic equation is not claimed. Manual page-by-page acceptance must keep these distinctions until each workflow has corresponding implementation and evidence.
