# App Src Hygiene Batch

Date: 2026-02-12

Scope:
- Move non-runtime forensic/scratch files out of `apps/web/src/app`.
- Keep app logic and behavior unchanged.

Moved groups:
- `security/`: audit notes that are not runtime code
- `ui-dumps/`: XML/UI dump captures
- `examples/`: standalone HTML examples not used by runtime

Note:
- Raw `dump_analysis` data was moved to local `artifacts/app-src-hygiene-2026-02-12/`
  and is intentionally not tracked in git.
