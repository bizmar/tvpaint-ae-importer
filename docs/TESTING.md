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

## How the checks are run

Three levels, cheapest first:

1. **ES3 compliance** — the script is compiled by `cscript //E:JScript`. JScript is a
   genuine ES3 engine and compiles the whole file before executing, so reaching a
   *runtime* error (`'$' is undefined`, line 290) proves every line is valid ES3.
   A modern parser would wrongly accept ES5+ syntax, so this is the better check.
2. **Logic, in the real engine** — `AfterFX.exe -r harness.jsx` runs a harness that
   `#include`s the script, drives its helpers with fixed data, and writes results to
   a text file. This exercises real ExtendScript semantics and the real `$.locale`.
3. **Appearance and interaction** — driven through the live After Effects UI and
   inspected from screenshots.

## Feature: import warning report (`feat/warning-report`)

| Area | Status | Notes |
|---|---|---|
| ES3 compliance | **Pass** | Compiles under JScript; no `let`/`const`/arrow/template-literal/ES5-array usage |
| Warning collector | **Pass** | 14/14 checks: empty state, totals, distinct-shot count, reset |
| Grouping by mode | **Pass** | Correct counts per mode and per shot across a 3-shot / 2-mode fixture |
| Shot names with spaces | **Pass** | `0950 v2` survives collection and display |
| Localisation | **Pass** | All 20 keys resolve in fr/en/ja/zh — 80 lookups, zero fallbacks hit |
| Placeholder substitution | **Pass** | Includes ja/zh reordering, repeats, and missing-argument cases |
| Report dialog renders | **Pass** | Correct columns, headers, rows; no clipping |
| Dialog layout quality | **Fixed, re-check pending** | First pass had a non-bold headline, oversized lists and stretched buttons |
| Log writer | **Pending** | Split from the file picker as `WriteWarningLog()` so it can be tested without a save dialog |
| Save Log button (end to end) | **Untested** | Blocked by `TextInputHost` holding foreground focus |
| Red layer labels | **Untested** | Needs a real import of a shot containing GrainMerge layers |
| Real import, end to end | **Untested** | No test shot with unsupported blending modes exercised yet |

## Not yet covered

- A real multi-shot import with GrainMerge / GrainExtract layers present.
- The missing-image-file crash (`app.project.importFile` at the two import branches
  has no existence check and no `try`/`catch`; one missing frame aborts the whole
  batch). Planned as a follow-up.
- `Error::MissingData` aborting a shot mid-build and leaving a partial comp.
- macOS. Everything above was run on Windows only.

## Known gotchas when testing

- A modal ScriptUI dialog blocks the After Effects script engine — close it before
  running another script via `AfterFX.exe -r`.
- `TextInputHost.exe` can take foreground focus invisibly and block synthetic input.
  Clicking the After Effects window clears it.
- Writing files from a script requires **Preferences ▸ Scripting & Expressions ▸
  Allow Scripts to Write Files and Access Network**.
