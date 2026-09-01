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
| Save Log button | **Pass** | Full 33-shot run saved to disk by the user; UTF-8 shot names intact |
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
| Full-folder import | **Pass** | 33 shots: 42 blending warnings in 29 shots, 8 layers failed in 5 shots, batch completed |
| Partial frame gaps | **Pass** | Caught at `2/3`, `2/7`, `1/18` -- not just wholly-absent folders |
| No blocking modals left | **Pass** | `D_no_layers` and `F_no_link` both reported without an alert; run completed unattended |
| Partial shot recovered | **Pass** | `F_no_link` dropped its one bad layer and imported the other four |
| macOS | **Partial** | Imports verified; two failures found -- see the macOS section |

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

## macOS

Same branch and script version as the Windows results above, run against material of
the same kind.

| | |
|---|---|
| After Effects | 25.1x68 (2025) |
| OS | macOS, Darwin 25.6, Apple silicon |
| Filesystem | APFS, case- and normalisation-insensitive |
| `$.locale` | `en_US` → `en` |
| Script version | 7.1.1 |
| Test material | `2026_08_28_mark_kadri` -- 10 shots, 132 layers, 2873 frames |

Driven with `osascript -e 'tell application "Adobe After Effects 2025" to DoScriptFile
...'`, the macOS equivalent of `AfterFX.exe -r`. Launching the binary with `-r`
directly did **not** run the script. Results come back through
`app.settings.saveSetting()` followed by `app.preferences.saveToDisk()` and are read
out of the prefs file, because script file writing is disabled on this machine.

| Area | Status | Evidence |
|---|---|---|
| Script loads | **Pass** | `$.evalFile` in 17 ms, reports v7.1.1 |
| Localisation | **Pass** | `$.locale` `en_US` resolves to `en`, table present |
| BlendingMode constants | **Pass** | All 29 offered modes exist in 25.1x68 |
| Real multi-shot import | **Pass** | 10 shots / 132 layers / 2873 frames in 24.1 s, 0 failures |
| Warning collection | **Pass** | 10 GrainMerge warnings, grouped across 6 shots |
| Missing frames | **Pass** | Synthetic `B_missing_files`: layer skipped, reported `3/3` |
| Missing folders | **Pass** | Synthetic `A_no_folders`: skipped and listed, batch continued |
| Missing layer data | **Pass** | `D_no_layers` reported with no alert |
| Missing `link` array | **Pass** | `F_no_link` dropped the bad layer and imported the other four |
| No blocking modals | **Pass** | All seven surviving `alert()` sites are pre-flight or report dialog |
| Unicode paths, script side | **Pass** | `File.exists`, `Folder.getFiles`, `absoluteURI` concat all resolve |
| APFS normalisation | **Pass** | NFC and NFD both resolve; APFS stores the form it is given |
| Import speed | **Note** | 2873 frames in 24 s, against 528 in 261 s on Windows |
| Non-ASCII layer folders | **Won't fix** | `importFile()` throws -- rename upstream in TVPaint |
| `%` in a layer name | **Won't fix** | Present files reported missing -- rename upstream in TVPaint |
| Save Log | **Blocked** | Script file writing disabled on this machine |
| Report dialog renders | **Pass** | Headline, alert, both tables, both checkboxes, buttons all correct |
| Red labelling | **Pass** | Failed shots' folders red in the Project panel, healthy shots left alone |
| Escape closes the dialog | **Pass** | Returns cleanly, no stranded modal |
| List row heights | **Fixed** | Was 19, now 21; rows are whole again -- see below |
| Problem reporting: summary | **Pass** | Default; problems collected, nothing interrupts |
| Problem reporting: alerts | **Pass** | Alert fires mid-run, batch pauses, end report suppressed |

### Fail: non-ASCII characters anywhere in a source path

`app.project.importFile()` raises `After Effects error: could not convert Unicode
characters.` for any path containing `s`-caron, `c`-caron or `z`-caron. The shot is
lost rather than degraded: the frames are present, so the missing-file guard passes
them, and the throw then escapes `ImportSingleTVPJson`.

Nothing in the script causes this, and nothing in the script routes around it:

| Call | Result |
|---|---|
| `addFolder` / `addComp` with a caron in the name | works |
| `File(...).exists`, `Folder.getFiles()` | works |
| `absoluteURI` + raw name concatenation | resolves |
| ASCII control import | works |
| `importFile()` with a caron in the path | **throws** |

Five ways of building the `File` were tried -- a plain constructed path, the object
`Folder.getFiles()` returns, `encodeURI`, an `fsName` round trip, and sequence against
single -- and all five throw.

**An ASCII symlink to the same folder imports fine**, in both single and sequence mode,
so a macOS shim is possible: link the non-ASCII directory to an ASCII name, import
through the link, and keep the link, because removing it takes the footage offline.

The current material is entirely ASCII, so this does not bite today. Slovenian layer
names of the kind in the Windows material would.

**Decided not to fix.** The shim is more machinery than the problem is worth: the
failure is loud, the shot visibly does not import, and the fix upstream is to rename
the layer in TVPaint and re-export. Recorded here so the behaviour is known rather
than rediscovered.

### Fail: a `%` in a layer name is read as an escape

`srcDirPath` is taken from `dataFile.absoluteURI`, which is percent-encoded, and the
filename from the JSON is appended to it raw (lines 1515-1517 and 1679). `File()` then
decodes the whole string, so a `%` in a layer name is treated as the start of an escape.

| Layer | Result |
|---|---|
| `[001] COL 50% grey` | not resolved, reported as `3/3` missing |
| `[001] COL_%41_grade` | not resolved, reported as `3/3` missing |

Both sets of files are present on disk. They are dropped and then listed in the report
as missing, which is the one failure mode the report exists to make legible.

This is not macOS-specific: the same concatenation runs on Windows and simply has not
been hit, because no layer name in the test material contains a `%`. The shot browser
already handles this correctly with `File.decode(sub.name)` and `fsName`; the importer
does not match it.

**Decided not to fix**, on the same grounds as the case above: rename upstream. Note
the difference in how the two fail, though. The non-ASCII case throws, so the shot
visibly does not import. This one does not throw -- the layer is reported as having
every frame missing when the frames are present, so the report is actively misleading
rather than merely incomplete.

### Fail: list rows are sized with a Windows row height

`RowsToPixels()` returns `rows * 19 + 26`. On macOS a ScriptUI listbox row is about 21
points, so every list is short by roughly a tenth of its height, and the last row is
sliced through the middle rather than either shown or hidden.

Seen with 6 failures and 12 warnings loaded:

| List | Rows | Shown |
|---|---|---|
| Failed imports | 6 | 4 whole, the 5th cut in half |
| Affected layers | 12 | 10 whole, the 11th cut in half |

Both lists put up a scrollbar, so nothing is unreachable -- it reads as a rendering
fault rather than a scroll affordance. For six rows the shortfall is 12 points, which
is almost exactly the half row that shows.

**Fixed.** The constant is now 21. Re-run with the same 6 failures and 12 warnings:
every row renders whole, and where a list still cannot show everything it scrolls
rather than slicing. Worth a look on Windows, where the results above were taken with
19 and showed no clipping -- the change costs two points a row there.

### Report dialog restyled to Adobe conventions

Reviewed against how After Effects' own dialogs are put together, and changed where it
diverged:

| | Was | Now |
|---|---|---|
| Dialog title | `Import Report -- v.7.1.1` | `Import Report (v7.1.1)` |
| Failures panel title | `FAILED IMPORTS -- these layers are not in the project` | `Failed imports` |
| Failure alert | `!  ... did NOT import.` | `... did not import.` |
| Intro | `set to Normal -- review them` | `set to Normal; review them` |
| Close button | 264 x 30 | 90 x 24 |
| Save Log button | 160 x 26 | 120 x 24 |
| Undo names | `TVPaint Import -- Change Blending Modes` | `TVPaint Import: Change Blending Modes` |

Adobe titles panels with a short noun phrase rather than a sentence in capitals, and
the sentence that was in the title is already the statictext directly beneath it. The
alert keeps its colour, which is what carries the severity -- the exclamation mark and
the capitalised NOT were doing the same job twice. Undo names appear in Edit > Undo,
where Adobe separates scope from action with a colon.

All strings changed in French, English, Japanese and Chinese.

### Problem reporting mode

The panel gained a two-radio group, appended below the sorting dropdown so nothing
above it moved:

    Problem Reporting:
    (o) Summary when the import finishes
    ( ) Alert on each problem (pauses the batch)

Radios rather than a checkbox, so both modes are named instead of one being an
unlabelled default, and the cost of the legacy mode is in the label itself. Summary is
the default and the choice persists as `AlertOnEachProblem`.

Only the moment of telling is configurable. `AnnounceProblem()` adds the alert and
nothing else, so every recovery behaviour -- the skipped layer, the removed empty
containers, the shot that keeps building -- runs in both modes. Choosing alerts cannot
bring back the half-built comp the original produced. The headless API is pinned to
`alertEach: false` whatever the panel says, so automation still cannot be interrupted.

Wired at all four sites. The missing-frames guard now raises `Error::MissingFiles`,
the string the original authors defined in four languages and never connected.

Verified on macOS with shot 0200 through `ExecuteImport`:

| | |
|---|---|
| Alert text | `Blending mode conversion not supported: GrainMerge` |
| Batch state while it was up | progress window frozen at `Importing layers... 2/9`, 45% |
| After dismissal | run completed, 1 warning collected |
| End-of-run report | not shown, as intended in this mode |

## Other unfixed issues

- **Fixed.** `Error::MissingData` no longer alerts. Both sites record into the report
  instead: a missing `project.clip.layers` skips the shot, and a layer with no `link`
  array is dropped on its own with its empty containers removed, so the rest of the
  shot still builds. `IsInvalid()` was removed with them -- raising those alerts was
  its only purpose. No `alert()` remains anywhere in the import path; the survivors are
  the two pre-flight checks and the report's own dialogs.
- Import speed: 528 frames took 261 s, so the full 33-shot folder would take ~45 min.
  On macOS the same work is roughly ten times faster, so this figure is Windows-specific.
- The headless API drops the file failures. `$.global.ImportTVPaintJSON` publishes
  `importWarnings` as `$.global.ImportTVPaintJSONWarnings` but never publishes
  `importFileFailures`, so an external batch script sees the blending warnings and
  silently loses the skipped layers -- the half this branch added. Verified on macOS:
  one failure collected, nothing published.
- A failed Save Log leaves an empty file behind. `WriteWarningLog` opens the target
  before it can fail, so a machine with script file writing disabled gets a 0-byte
  file at the chosen path and an alert saying nothing was written.

## Windows regression pass on the macOS changes

Run 2026-09-01 on After Effects 26.0x67, after applying the four macOS commits.

| Check | Result |
|---|---|
| Row height 19 -> 21 | **Pass** — slightly more generous, no clipping, no odd gaps |
| Panel at 465px with the Problem Reporting section | **Pass** — both radios render with margin to spare |
| Failure alert wording | **Reads quieter.** See below |
| Alert mode | **Pass** — importing 1240 raised "Blending mode conversion not supported: Light" mid-run and paused; no report followed |

### The failure alert

`UI::Report::FilesAlert` now reads `3 layer(s) in 1 shot(s) did not import. Those
shots will need re-importing.` without the leading `!` or the capitalised `NOT`.

On this build `ScriptUI.newFont(..., BOLD, ...)` is ignored while
`graphics.foregroundColor` works, so colour alone carries the severity. It is the only
coloured text in the dialog and does register, but it sits as the third line of a
three-line paragraph at the same size and weight as its neighbours, so the eye does not
jump to it. The "Failed imports" section immediately below carries the message
structurally, which offsets this.

Judged acceptable but marginal. Restoring just the leading marker, without the
capitalised NOT, would give the eye an anchor without shouting.

## Known gotchas when testing

- A modal ScriptUI dialog blocks the After Effects script engine — close it before
  running another script via `AfterFX.exe -r`.
- System Events cannot see ScriptUI windows on macOS: `window 1 of process "After
  Effects"` is an invalid index and `click at` fails with -25208. Sending `key code 53`
  (Escape) to the fronted application does close the report dialog, which is enough to
  drive it from a script.
- On macOS the same modal locks the whole application if the driving connection drops:
  `DoScriptFile` returns `Connection is invalid. (-609)`, the dialog is left with no
  owner, and After Effects stops accepting clicks until it is force-quit. Worth
  weighing against making the report a palette rather than a dialog.
- macOS ignores `-r` when the binary is launched directly. Use
  `osascript -e 'tell application "Adobe After Effects 2025" to DoScriptFile "..."'`,
  and wrap it in `with timeout of N seconds` for runs longer than a minute.
- Returning results through `app.settings.saveSetting()` plus
  `app.preferences.saveToDisk()` works when file writing is disabled, and the values
  can be read straight out of the prefs file. Long strings are wrapped across lines
  there, so rejoin them before parsing.
- `TextInputHost.exe` can take foreground focus invisibly and block synthetic input.
  Clicking the After Effects window clears it.
- Writing files from a script requires **Preferences ▸ Scripting & Expressions ▸
  Allow Scripts to Write Files and Access Network**.
- `graphics.foregroundColor` works for colouring statictext in this build, but
  `ScriptUI.newFont(..., BOLD, ...)` appears to be ignored — do not rely on weight
  alone to carry emphasis.
- Backgrounding a shell `&&` chain hides errors from the earlier steps; run the
  preparation in the foreground and launch After Effects separately.
