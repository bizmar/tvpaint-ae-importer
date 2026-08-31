# Testing Status

Running record of what has actually been verified, and how. Kept so the README's
testing claims can stay honest.

Last updated: 2026-08-31

## Environment

| | |
|---|---|
| After Effects | 26.0x67 (2026) |
| OS | Windows 11 Home 26200 |
| `$.locale` | `sl_SI` → falls back to `en` |
| Script version | 7.1.1 |
| Test material | `E:/Miha/In/2026_08_24_mark_kadri` — 33 shots, 489 layers |

## How the checks are run

Three levels, cheapest first:

1. **ES3 compliance** — the script is compiled by `cscript //E:JScript`. JScript is a
   genuine ES3 engine and compiles the whole file before executing, so reaching a
   *runtime* error (`'$' is undefined`, line 290) proves every line is valid ES3.
   A modern parser would wrongly accept ES5+ syntax, so this is the better check.
2. **Logic, in the real engine** — `AfterFX.exe -r harness.jsx` runs a harness that
   `#include`s the script, drives it with fixed data, and writes results to a text
   file. This exercises real ExtendScript semantics and the real `$.locale`.
   The same mechanism runs real imports by calling `ExecuteImport()` directly, so no
   UI clicking is needed.
3. **Appearance and interaction** — driven through the live After Effects UI and
   inspected from screenshots, with a read-only inspector script dumping the actual
   `blendingMode` and `label` of every imported layer to confirm what really changed.

## Feature: import warning report (`feat/warning-report`)

| Area | Status | Evidence |
|---|---|---|
| ES3 compliance | **Pass** | Compiles under JScript; no `let`/`const`/arrow/template-literal/ES5-array usage |
| Warning collector | **Pass** | 14/14 checks: empty state, totals, distinct-shot count, reset |
| Grouping by mode | **Pass** | Correct per-mode and per-shot counts |
| Shot names with spaces | **Pass** | `0950 v2` survives collection and display |
| Localisation | **Pass** | All 20 keys resolve in fr/en/ja/zh — 80 lookups, zero fallbacks |
| Placeholder substitution | **Pass** | Includes ja/zh reordering, repeats, missing arguments |
| Report dialog renders | **Pass** | Correct columns, headers, rows; no clipping |
| Dialog layout | **Pass** | Content-sized lists, pinned buttons, grouped headline |
| Red-flag checkbox | **Pass** | Lives in the report (not the import panel); ticking it set all three warned layers to `label=1`, up from 8/8/13 |
| Progress window on failure | **Fixed** | A throwing shot left the `closeButton:false` palette stranded at "14/19", which looks like a hang; now closed in a `finally` |
| Real multi-shot import | **Pass** | 3 shots / 31 layers / 528 frames → 3 warnings across 2 modes, completed in 261 s |
| Reassigning a mode | **Pass** | Selected 2 rows, applied Overlay: table, summary and real layers all agree (read back as `OVERLAY` 5226); unselected layer untouched |
| Summary ↔ table consistency | **Pass** | Both rebuilt from the records after each Apply |
| Original label restored | **Pass** | Labels read back as the pre-import values (8, 8, 13) |
| BlendingMode constants | **Pass** | All 29 offered modes exist in 26.0x67 |
| Log writer | **Untested** | `WriteWarningLog()` is split from the picker but not yet exercised |
| Save Log button | **Untested** | Opens a system save dialog; not driven |
| macOS | **Untested** | Windows only |

## Known defect: a missing image file aborts the whole batch

Reproduced on shot `1340`:

```
After Effects error: Unable to set "file". Path is not valid.
Path: "E:\Miha\In\2026_08_24_mark_kadri\1340\[009] COL_šal_spodaj\0001.png"
  at line 1631  (input.file = File(filesArray[0]))
```

`ImportOptions.file` validates the path and throws. Nothing catches it, so the
exception escapes `ImportSingleTVPJson` **and** `ExecuteImport`, and every remaining
shot in the batch is skipped. The run died after 2.5 s, leaving a partial import
behind (project items went 133 → 191). One warning had been collected but was never
shown, because the throw skipped the report entirely.

`Error::MissingFiles` ("Files are missing from project location.") is defined in all
four language tables and referenced nowhere — the original authors intended this
guard and never wired it up.

Planned fix: check the file before building `ImportOptions`, record a warning instead
of throwing, skip the affected layer, and surface it in the same end-of-run report.

### Why 1340's files are unreachable

Not a missing-file problem — the folder names on disk are corrupted:

| | |
|---|---|
| JSON asks for | `[001] LIN_šal` — `š` is U+0161 |
| Disk actually has | `[001] LIN_s╠îal` — `s` + U+2560 + U+00EE |

`U+2560 U+00EE` is the UTF-8 encoding of a combining caron (`CC 8C`) misread as
CP437. The material came from macOS (there is a `__MACOSX` entry beside the shots)
and was unzipped by a tool that did not handle UTF-8. Re-extracting with a
UTF-8-aware tool fixes the data; no path handling in the script can recover it.

## Other unfixed issues

- `Error::MissingData` (line 1358) aborts a shot mid-build and leaves a partial comp.
- Import speed: 528 frames took 261 s, so the full 33-shot folder would take ~45 min.

## Known gotchas when testing

- A modal ScriptUI dialog blocks the After Effects script engine — close it before
  running another script via `AfterFX.exe -r`.
- `TextInputHost.exe` can take foreground focus invisibly and block synthetic input.
  Clicking the After Effects window clears it.
- Writing files from a script requires **Preferences ▸ Scripting & Expressions ▸
  Allow Scripts to Write Files and Access Network**.
- Backgrounding a shell `&&` chain hides errors from the earlier steps; run the
  preparation in the foreground and launch After Effects separately.
