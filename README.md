# TVPaint JSON Importer for Adobe After Effects

An enhanced ExtendScript importer for loading TVPaint Animation projects exported as JSON into Adobe After Effects.

Compatible with **TVPaint 11 / TVPaint 12** and **Adobe After Effects (CS5 through CC 2026+)**.

> [!NOTE]
> **Disclaimer**: This was 100% vibecoded with Antigravity and is untested.

---

## Features & Improvements

- **Native Sequence Mode by Default**: Defaults to native image sequences for faster imports and native AE caching.
- **Smart Preferences Persistence**: Automatically saves and restores your last-used UI settings between After Effects sessions via `app.settings`.
- **Browse Shot Folder Mode**: Select a shot folder (e.g., `shot_010`) and the importer automatically detects and loads the corresponding `shot_010.json` file.
- **Batch Folder Support**: Supports selecting a parent directory containing multiple shot subfolders to import them sequentially.
- **Headless / Automation Ready**: Decoupled core import logic that can be invoked by batch scripts without blocking UI dialogs.

---

## Installation

1. Copy `AfterEffects_Import TVPaint_JSON_7._1++.jsx` into your After Effects Scripts folder:
   - **Windows:** `C:\Users\<User>\AppData\Roaming\Adobe\After Effects\<Version>\Scripts\` (or `C:\Program Files\Adobe\Adobe After Effects <Version>\Support Files\Scripts\`)
   - **macOS:** `/Applications/Adobe After Effects <Version>/Scripts/`
2. Restart After Effects or run the script via **File > Scripts > Run Script File...**

---

## Usage

### 1. Direct JSON Selection
- Click **"Browse JSON..."** to pick a specific `.json` export file.

### 2. Shot Folder Selection (Auto-Detect)
- Click **"Browse Folder..."** and select a shot folder (e.g., `.../shots/shot_010/`). The script will automatically locate `shot_010.json` and import it.
- If a parent directory containing multiple shot subfolders is selected, all shots will be imported in sequence.

---

## License

Original TVPaint ExtendScript is licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)](http://creativecommons.org/licenses/by-nc-sa/4.0/).
Copyright TVPaint Développement.
