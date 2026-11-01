# Contributing

Reproducible bugs, numerical counterexamples, hardware comparisons, documentation and code improvements are welcome. Read the [README](README.md), [architecture](docs/ARCHITECTURE.md) and [compatibility matrix](docs/COMPATIBILITY.md). Report security issues according to [SECURITY.md](SECURITY.md).

## Local setup

Use Node.js 24 LTS. Windows 10/11 x64 is the desktop testing and packaging target.

```sh
npm ci
npm test
npm run build
npm run test:ui
npm run release:win
```

Use `npm run dev` for renderer previews and `npm start` for Electron. Linux core tests/builds do not establish Windows UI or packaging compatibility.

Report the actual OS, Node/Electron versions, pass/fail/not-run counts and reasons for unrun checks. Preserve raw evidence in `.verification/`; review local paths and private data before sharing it.

## Mathematics, models and state

- Provide minimal inputs, angle/output settings, model, independent expected values and justified tolerances. Do not copy current output into expected results as the only reference.
- Keep algorithms in the shared engine, model policies in the registry/ModelCalculator, and physical actions in keyboard modules. Preserve existing tests and add meaningful regressions.
- Distinguish local numerical solving from polynomial root enumeration. Approximate output must not be relabeled as mathematically exact without justification.
- Research new models using official manuals and photographs. Document applicability and verified differences. Incomplete implementations remain Experimental or Planned; Planned profiles are not selectable.
- State changes need migration, corruption, model-isolation and write-failure checks, with rollback data preserved.
- Check affected flows in both interface languages. Keep language preferences separate from chassis branding and avoid exposing internal implementation names in user flows.
- Maintain both the English README and README.zh-CN.md when the documented scope changes.

## Pull requests

Explain the concrete problem, resulting behavior, model scope, references and actual validation. Provide your own screenshots for UI work. For dependency changes, review licenses, audit output, the lockfile and packaged contents.

Update compatibility documentation and the changelog. Do not invent coverage, download counts, outside contributions or hardware compatibility.

Original code contributions use this project's MIT license. Third-party content needs appropriate permission and retained notices. Do not submit proprietary firmware, unauthorized manufacturer logos/photos, secrets or personal calculator data. Maintainers do not guarantee acceptance. Follow the [code of conduct](CODE_OF_CONDUCT.md).
