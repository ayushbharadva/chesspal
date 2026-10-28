# Research with REA

REA is a development tool for inspecting shipped JavaScript artifacts. It is kept outside the
mobile app's dependencies. Source repositories are usually easier to understand with direct source
reads; use REA when a question depends on a deployed bundle or other supported artifact.

Use Node 22.19+, 24.11+, or 26+. Install the locked tool dependencies once:

```sh
npm ci --prefix tools/rea --ignore-scripts
```

Place a selected public JavaScript artifact in `.research/targets/<app>/`, record its original URL
and SHA-256, then run from the repository root:

```sh
npm run research:analyze -- .research/targets/<app> .research/<app>-evidence.json
```

The runner uses the local REA 6.7.0 CLI. It creates a workspace temporary directory for Windows
worker transfers, streams complete JSON to a new file, and refuses to overwrite existing evidence.
It performs static inspection without executing the target JavaScript. No MCP registration,
native decompiler, account connection, or agent restart is needed for this command.

For each investigation, record:

1. The question, app/version, source commit or artifact URL, capture date and digest.
2. Source locations or REA Evidence IDs supporting the answer.
3. Which findings are observed syntax, inferred behavior, documented product features or hypotheses.
4. Coverage limits, unresolved questions and license/provenance facts.
5. An independently written ChessPal change and an observable acceptance check.

Keep raw artifacts/evidence in ignored `.research/`; commit concise reports and original code.
Do not put tool dependencies, copied app bundles or competitor lesson material in the mobile bundle.
An Android/Flutter target needs its own artifact-specific plan; JADX inspection does not recover a
Flutter app's original Dart learning logic.

First investigation: [chess learning references and product direction](2026-10-21-chess-learning.md).
Second investigation: [Every Day Chess and Lichess mechanics and feature plan](2026-10-28-everydaychess-lichess.md).
Tool documentation: [REA](https://github.com/morluto/rea) and its
[investigation workflow](https://github.com/morluto/rea/blob/f801b2fbfd28f4e3713adefddc7bd73db44c284c/.agents/skills/reverse-engineer-anything/SKILL.md).
