# Security policy

The current development line is maintained. No long-term support branch or response-time guarantee is offered. Distinguish current source from published binaries.

## Reporting a vulnerability

If the repository's Security page offers **Report a vulnerability**, use it for a private report. Availability depends on actual repository settings; this policy does not enable that feature.

Otherwise use a contact method actually published on the [maintainer profile](https://github.com/plateboheng-cell). No dedicated security email is specified.

Include the version, operating system, steps/input, expected and actual behavior, impact and a minimal reproduction. Do not include personal data, real credentials or information enabling attacks against others. If no private channel is available, start with a non-sensitive contact request rather than publishing exploitation details.

## Runtime boundaries

The application loads local files. Electron disables Node integration in the renderer, enables context isolation and sandboxing, rejects new windows and permission requests, and restricts external navigation. Expressions use restricted parsing.

These measures and offline operation reduce exposure; they are not proof that dependencies or input handling have no vulnerabilities. Clipboard access and local persisted calculator data remain part of the desktop workflow.

See [third-party notices and dependency review](docs/THIRD_PARTY_NOTICES.md). Audit package counts are not independent vulnerability counts, and development-tool dependencies are not automatically risk-free. Dependency updates require build, mathematical display and actual Electron validation before release.
