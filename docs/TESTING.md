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
| Red-flag checkboxes | **Pass** | Two: layers (under the mode picker, default off) and failed shots (inside the failures panel, default on) |
| Unresolved-only rule | **Pass** | With the box ticked, reassigning one layer to Add returned it to `label=8` while the two still on Normal stayed `label=1` |
| Progress window on failure | **Fixed** | A throwing shot left the `closeButton:false` palette stranded at "14/19", which looks like a hang; now closed in a `finally` |
| Real multi-shot import | **Pass** | 3 shots / 31 layers / 528 frames → 3 warnings across 2 modes, completed in 261 s |
| Reassigning a mode | **Pass** | Selected 2 rows, applied Overlay: table, summary and real layers all agree (read back as `OVERLAY` 5226); unselected layer untouched |
| Summary ↔ table consistency | **Pass** | Both rebuilt from the records after each Apply |
| Original label restored | **Pass** | Labels read back as the pre-import values (8, 8, 13) |
| BlendingMode constants | **Pass** | All 29 offered modes exist in 26.0x67 |
| Log writer | **Pass** | Generated via `WriteWarningLog()` with both finding types; failures first, 17 lines |
| Save Log button | **Untested** | Opens a system save dialog; not driven |
| Missing-file guard | **Pass** | 1340 + 1240 batch completed; 3 layers skipped and reported instead of throwing |
| Batch survives a bad shot | **Pass** | Per-shot `try`/`catch` in `ExecuteImport` |
| Resizable report | **Pass** | `resizeable:true` + `alignment:["fill","fill"]`; dragging the window taller grew both tables |
| Missing folders | **Pass** | Synthetic `A_no_folders`: 5 layers skipped and listed, batch continued |
| Missing frames | **Pass** | Synthetic `B_missing_files`: the one stripped layer skipped, the rest imported |
| Malformed JSON | **Pass** | Synthetic `C_malformed`: parse error caught per-shot, reported as `Expected: }` |
| Batch after 3 bad shots | **Pass** | `E_good` imported normally at the end of the run |
| Failed-import severity | **Pass** | Header alert renders orange-red, failed section framed in a titled panel, Close widened to ~40% |
| Red label on failed shots | **Pass** | Shot 1420's folder and comp both set to label 1; healthy 1390 left at 2/15 |
| Deleted frames, real material | **Pass** | 1420 (6 frames) skipped and reported; batch completed in 107 s |
| Corrupt-but-present PNG | **Not detected** | 1390's `MASK_oce_brada/0080.png` has a broken header; AE imported it without error |
| macOS | **Untested** | Windows only |

## Fixed: a missing image file used to abort the whole batch

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

**Fixed.** Every referenced frame is checked before any `ImportOptions` is built. A
layer with missing frames is skipped and recorded, and the `ImportSingleTVPJson` call
is additionally wrapped in `try`/`catch` so a shot that still throws costs that shot
rather than every shot after it. The report gained a second section listing the
skipped layers, which is also written to the saved log.

Re-tested on `["1340", "1240"]` — 1340 is the shot that previously killed the run:

| | before | after |
|---|---|---|
| Outcome | `RESULT: CRASHED` after 2.5 s | `RESULT: COMPLETED` after 149 s |
| Shots imported | none completed | both |
| Skipped layers | — | 3 in shot 1340, listed with `28 / 28` frames missing and the first missing path |
| Blending warnings | never shown | 2 collected and reported |

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

## Not detected: a file that exists but is corrupt

The guard checks that every referenced frame exists, not that it is readable. Shot
1390 has a PNG with a destroyed header; it passed the guard, and After Effects
imported it without complaint. Catching this would mean reading file headers before
import, which is a different and much more expensive check.

## Other unfixed issues

- `Error::MissingData` still alerts and aborts a shot, at line 1303 (missing
  `project.clip.layers`) and line 1358 (a layer with no `link` array). Confirmed on the
  synthetic `D_no_layers` shot: the modal fired mid-batch and had to be dismissed by
  hand. The per-shot `try`/`catch` keeps the run alive, but this is the last blocking
  dialog, and it should fold into the report the same way the file failures did.
- Import speed: 528 frames took 261 s, so the full 33-shot folder would take ~45 min.

## Known gotchas when testing

- A modal ScriptUI dialog blocks the After Effects script engine — close it before
  running another script via `AfterFX.exe -r`.
- `TextInputHost.exe` can take foreground focus invisibly and block synthetic input.
  Clicking the After Effects window clears it.
- Writing files from a script requires **Preferences ▸ Scripting & Expressions ▸
  Allow Scripts to Write Files and Access Network**.
- `graphics.foregroundColor` works for colouring statictext in this build, but
  `ScriptUI.newFont(..., BOLD, ...)` appears to be ignored — do not rely on weight
  alone to carry emphasis.
- Backgrounding a shell `&&` chain hides errors from the earlier steps; run the
  preparation in the foreground and launch After Effects separately.
