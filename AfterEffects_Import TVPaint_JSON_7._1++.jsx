//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Title: Import TVPaint Animation Clip Structure to After Effects
//
// Author: Clément Berthaud for TVPaint Developpement
// Edits by Matthieu Tragno, Kévin Lobjois, Antigravity & Contributors
// Version: 7.1.1 -- IMPORTANT -- Update the scriptVersion vars when changing the script's version number
// JSON object, stringify and parse methods from Douglas Crockford (Public Domain)
// Last Edited on 25/08/2026:
// -Default Sequence Import Mode set to "Native Sequence"
// -Implemented settings persistence across AE sessions via app.settings
// -Added interactive "Shot Browser" dialog with Date Modified column & multi-shot selection
// -Automatic Comp Naming: "Clip_<shotName>"
// -Wrapped imports in AE Undo Groups (app.beginUndoGroup / app.endUndoGroup)
// -Decoupled core import logic to allow headless/batch execution
//
// Description: Import a TVPaint clip structure as a composition inside After Effects, any version from CS5.
// 				The script imports the layers and images as well as the camera of the specified clip.
// 				It requires the data to be exported the proper way as a .JSON file from TVPaint Animation
//				under File > Export To... > Clip: Layers Structure > Structure: JSON
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Copyright TVPaint Développement, 2023-2026
//
// English (en):
// This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
// To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/.
// Alternative link to human readable license: https://www.tvpaint.com/license-cc-by-nc-sa-4.0-deed-en
// Alternative link to full license: https://www.tvpaint.com/license-cc-by-nc-sa-4.0-full-en
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////
// Implementation of Douglas Crockford's JSON object and stringify and parse methods
// json2.js
// 2023-05-10
// Public Domain.
// NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        return (n < 10) ? "0" + n : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {
        Date.prototype.toJSON = function () {
            return isFinite(this.valueOf())
                ? (
                    this.getUTCFullYear()
                    + "-"
                    + f(this.getUTCMonth() + 1)
                    + "-"
                    + f(this.getUTCDate())
                    + "T"
                    + f(this.getUTCHours())
                    + ":"
                    + f(this.getUTCMinutes())
                    + ":"
                    + f(this.getUTCSeconds())
                    + "Z"
                )
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;

    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }

    function str(key, holder) {
        var i;
        var k;
        var v;
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

        if (
            value
            && typeof value === "object"
            && typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":
            return (isFinite(value)) ? String(value) : "null";

        case "boolean":
        case "null":
            return String(value);

        case "object":
            if (!value) {
                return "null";
            }

            gap += indent;
            partial = [];

            if (Object.prototype.toString.apply(value) === "[object Array]") {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? (
                            "[\n"
                            + gap
                            + partial.join(",\n" + gap)
                            + "\n"
                            + mind
                            + "]"
                        )
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + ((gap) ? ": " : ":") + v);
                        }
                    }
                }
            } else {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + ((gap) ? ": " : ":") + v);
                        }
                    }
                }
            }

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

    if (typeof JSON.stringify !== "function") {
        meta = {
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {
            var i;
            gap = "";
            indent = "";

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }
            } else if (typeof space === "string") {
                indent = space;
            }

            rep = replacer;
            if (replacer && typeof replacer !== "function" && (
                typeof replacer !== "object"
                || typeof replacer.length !== "number"
            )) {
                throw new Error("JSON.stringify");
            }

            return str("", {"": value});
        };
    }

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {
            var j;

            function walk(holder, key) {
                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return (
                        "\\u"
                        + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
                    );
                });
            }

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {
                j = eval("(" + text + ")");
                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

            throw new SyntaxError("JSON.parse");
        };
    }
}());
//////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////
// Session environment
var applicationLanguage 	= ExtractAELanguage( $.locale );
var applicationVersion 		= ExtractAEVersion( app.version );

var scriptVersionMajor 		= 7;
var scriptVersionMinor 		= 1;
var scriptVersionPatch 		= 1;
var scriptVersion_XX 		= scriptVersionMajor + '.' + scriptVersionMinor + '.' + scriptVersionPatch;
var scriptVersion_vXX 		= 'v' + scriptVersion_XX;

var scriptLastEdit_FR		= " -- 25/08/2026 --";
var scriptLastEdit_LOC		= " -- 2026/08/25 --";

//////////////////////////////////////////////////////////////////////////////////////////////
// Application versions
var applicationVersionCS3 		= 8;
var applicationVersionCS4 		= 9;
var applicationVersionCS5 		= 10;
var applicationVersionCS5_5 	= 10.5;
var applicationVersionCS6 		= 11;
var applicationVersionCC 		= 12;
var applicationVersionCC2014 	= 13.0;
var applicationVersionCC2015 	= 13.5;
var applicationVersionCC2015_3 	= 13.8;
var applicationVersionCC2017 	= 14.0;

//////////////////////////////////////////////////////////////////////////////////////////////
// Language Detection
var lang = applicationLanguage;
if( lang != "fr" && 
	lang != "en" && 
	lang != "ja" && 
	lang != "zh" )
{
	lang = "en";
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Key / Values Dictionary-Tables for Language and Localization
var endl = "\n";

var message_fr = [];
message_fr["Error::Interruption"] 			= "Interruption du script.";
message_fr["Error::Cancellation"] 			= "Script annulé.";
message_fr["Error::InvalidLocation"] 		= "Emplacement invalide.";
message_fr["Error::InvalidFile"] 			= "Impossible de lire le fichier: ";
message_fr["Error::MissingFiles"] 			= "Fichiers manquants à l'emplacement spécifié.";
message_fr["Error::MissingData"] 			= "Données manquantes dans le fichier: ";
message_fr["Error::MissingLayers"] 			= "Aucun calque trouvé, le projet est vide.";
message_fr["Error::BadBlendingMode"] 		= "Mode de mélange non supporté";
message_fr["Error::NoJSONFound"] 			= "Aucun fichier .JSON valide trouvé dans les dossiers sélectionnés.";
message_fr["FileBrowser::Info"] 			= "Sélectionner un fichier .JSON";
message_fr["FolderBrowser::Info"] 			= "Sélectionner le dossier des plans";
message_fr["UI::Title"] 					= "Import TVPaint 12 -- v."+scriptVersion_XX+scriptLastEdit_FR;
message_fr["UI::Camera::Import"] 			= "Caméra";
message_fr["UI::Camera::Key"] 				= "Coordonnées des Clés";
message_fr["UI::Camera::Raw"] 				= "Coordonnées de la Vue Caméra";
message_fr["UI::Label::Info"] 				= "Importer un projet depuis TVPaint.";
message_fr["UI::Label::Browse"] 			= "Sélectionner des Plans (Shot Browser)...";
message_fr["UI::Label::Settings"] 			= "Options d'Import :";
message_fr["UI::Label::LayerColors"] 		= "Groupes de Couleur des Calques";
message_fr["UI::Label::TimeRemap"] 			= "Remappage Temporel";
message_fr["UI::Label::BlendingMode"] 		= "Modes de Mélange des Calques";
message_fr["UI::Label::PrePostB"] 			= "Pre/Post Comportements";
message_fr["UI::Label::Sequence"] 			= "Ordre de la Séquence (Remappage Temporel)";
message_fr["UI::Label::Sequence::Index"] 	= "Index (Par Défaut)";
message_fr["UI::Label::Sequence::Name"] 	= "Nom (Industrie japonaise)";
message_fr["UI::Label::Sequence2"] 			= "Mode d'Import Séquence";
message_fr["UI::Label::Sequence2::Rebuilt"] = "Reconstruit";
message_fr["UI::Label::Sequence2::Native"] 	= "Natif";
message_fr["UI::Browser::Title"] 			= "Navigateur de Plans TVPaint (Shot Browser)";
message_fr["UI::Browser::BaseFolder"] 		= "Dossier source :";
message_fr["UI::Browser::ChangeFolder"] 	= "Changer dossier...";
message_fr["UI::Browser::Refresh"] 			= "Actualiser";
message_fr["UI::Browser::Filter"] 			= "Filtrer :";
message_fr["UI::Browser::SortName"] 		= "Tri : Nom (A-Z)";
message_fr["UI::Browser::SortDate"] 		= "Tri : Date (Récents)";
message_fr["UI::Browser::SelectAll"] 		= "Tout sélectionner";
message_fr["UI::Browser::DeselectAll"] 		= "Tout désélectionner";
message_fr["UI::Browser::DirectFile"] 		= "Fichier JSON direct...";
message_fr["UI::Browser::Cancel"] 			= "Annuler";
message_fr["UI::Browser::ImportBtn"] 		= "Importer les plans sélectionnés";
message_fr["UI::Browser::ColShot"] 			= "Dossier du Plan";
message_fr["UI::Browser::ColDate"] 			= "Date de modification";
message_fr["UI::Browser::ColStatus"] 		= "Statut JSON";
// --- Import Warning Report ---
message_fr["UI::Report::Title"] 			= "Rapport d'import";
message_fr["UI::Report::Headline"] 			= "%1 calque(s) dans %2 plan(s) utilisent des modes de fusion qu'After Effects ne peut pas reproduire.";
message_fr["UI::Report::Intro"] 			= "L'import s'est terminé. Ces calques ont été réglés sur Normal -- vérifiez-les avant validation.";
message_fr["UI::Report::Flagged"] 			= "Etiqueter en Rouge les calques non resolus et les plans echoues";
message_fr["UI::Report::FlagUndo"] 			= "Import TVPaint -- Signaler les calques concernes";
message_fr["UI::Report::FilesHeadline"] 	= "%1 calque(s) dans %2 plan(s) ont ete ignores : leurs fichiers images sont introuvables.";
message_fr["UI::Report::ColMissing"] 		= "Images manquantes";
message_fr["UI::Report::FilesTitle"] 		= "IMPORTS ECHOUES -- ces calques ne sont pas dans le projet";
message_fr["UI::Report::FilesAlert"] 		= "!  %1 calque(s) dans %2 plan(s) n'ont PAS ete importes. Ces plans devront etre reimportes.";
message_fr["UI::Report::GroupTitle"] 		= "Récapitulatif par mode de fusion :";
message_fr["UI::Report::GroupLine"] 		= "%1  ->  %2   :   %3 calque(s) dans %4 plan(s)";
message_fr["UI::Report::ColShot"] 			= "Plan";
message_fr["UI::Report::ColComp"] 			= "Composition";
message_fr["UI::Report::ColLayer"] 			= "Calque";
message_fr["UI::Report::ColMode"] 			= "Mode TVPaint";
message_fr["UI::Report::ColApplied"] 		= "Appliqué dans AE";
message_fr["UI::Report::Details"] 			= "Calques concernés :";
message_fr["UI::Report::SaveLog"] 			= "Enregistrer le rapport...";
message_fr["UI::Report::Close"] 			= "Fermer";
message_fr["UI::Report::SaveTitle"] 		= "Enregistrer le rapport d'avertissements";
message_fr["UI::Report::Saved"] 			= "Rapport enregistré :";
message_fr["UI::Report::SaveFailed"] 		= "Impossible d'écrire le fichier de rapport.";
message_fr["Blending::Normal"] 				= "Normal";
message_fr["Log::Title"] 					= "TVPaint 12 -> After Effects : rapport d'avertissements d'import";
message_fr["Log::Generated"] 				= "Généré le :";
message_fr["Log::Shot"] 					= "Plan :";
message_fr["UI::Report::FixLabel"] 			= "Regler le(s) calque(s) selectionne(s) sur :";
message_fr["UI::Report::ApplyBtn"] 			= "Appliquer a la selection";
message_fr["UI::Report::FixDone"] 			= "%1 calque(s) regle(s) sur %2.";
message_fr["UI::Report::FixNone"] 			= "Selectionnez d'abord une ou plusieurs lignes.";
message_fr["UI::Report::FixFailed"] 		= "%1 calque(s) n'ont pas pu etre modifies -- l'import a peut-etre ete annule.";
message_fr["UI::Report::UndoName"] 			= "Import TVPaint -- Modifier les modes de fusion";

var message_en = [];
message_en["Error::Interruption"] 			= "Exit Script.";
message_en["Error::Cancellation"] 			= "Script Canceled.";
message_en["Error::InvalidLocation"] 		= "Invalid Location.";
message_en["Error::InvalidFile"] 			= "Cannot read file: ";
message_en["Error::MissingFiles"] 			= "Files are missing from project location.";
message_en["Error::MissingData"] 			= "Data missing from file:";
message_en["Error::MissingLayers"] 			= "No layers found, project is empty.";
message_en["Error::BadBlendingMode"] 		= "Blending mode conversion not supported";
message_en["Error::NoJSONFound"] 			= "No valid .JSON file found in selected folder(s).";
message_en["FileBrowser::Info"] 			= "Select a .JSON file.";
message_en["FolderBrowser::Info"] 			= "Select Base Shots Folder";
message_en["UI::Title"] 					= "Import TVPaint 12 -- v. "+scriptVersion_XX+scriptLastEdit_LOC;
message_en["UI::Camera::Import"] 			= "Import Camera";
message_en["UI::Camera::Key"] 				= "Key Coordinates";
message_en["UI::Camera::Raw"] 				= "Camera View Coordinates";
message_en["UI::Label::Info"] 				= "Import and Rebuild a TVPaint Project.";
message_en["UI::Label::Browse"] 			= "Select Shots (Shot Browser)...";
message_en["UI::Label::Settings"] 			= "Import Settings:";
message_en["UI::Label::LayerColors"] 		= "Layer Color Groups";
message_en["UI::Label::TimeRemap"] 			= "Time Remap";
message_en["UI::Label::BlendingMode"] 		= "Layer Blending Modes";
message_en["UI::Label::PrePostB"] 			= "Pre/Post Behaviours";
message_en["UI::Label::Sequence"] 			= "Sequence Sorting for Time Remap:";
message_en["UI::Label::Sequence::Index"] 	= "Index (Default)";
message_en["UI::Label::Sequence::Name"] 	= "Name (Japanese Industry)";
message_en["UI::Label::Sequence2"] 			= "Sequence Import Mode";
message_en["UI::Label::Sequence2::Rebuilt"] = "Rebuilt";
message_en["UI::Label::Sequence2::Native"] 	= "Native Sequence";
message_en["UI::Browser::Title"] 			= "TVPaint Shot Browser";
message_en["UI::Browser::BaseFolder"] 		= "Base Folder:";
message_en["UI::Browser::ChangeFolder"] 	= "Change Folder...";
message_en["UI::Browser::Refresh"] 			= "Refresh";
message_en["UI::Browser::Filter"] 			= "Filter:";
message_en["UI::Browser::SortName"] 		= "Sort: Name (A-Z)";
message_en["UI::Browser::SortDate"] 		= "Sort: Date Modified (Newest)";
message_en["UI::Browser::SelectAll"] 		= "Select All";
message_en["UI::Browser::DeselectAll"] 		= "Deselect All";
message_en["UI::Browser::DirectFile"] 		= "Browse Single JSON...";
message_en["UI::Browser::Cancel"] 			= "Cancel";
message_en["UI::Browser::ImportBtn"] 		= "Import Selected Shots";
message_en["UI::Browser::ColShot"] 			= "Shot Folder";
message_en["UI::Browser::ColDate"] 			= "Date Modified";
message_en["UI::Browser::ColStatus"] 		= "JSON Status";
// --- Import Warning Report ---
message_en["UI::Report::Title"] 			= "Import Report";
message_en["UI::Report::Headline"] 			= "%1 layer(s) across %2 shot(s) use blending modes that After Effects cannot reproduce.";
message_en["UI::Report::Intro"] 			= "The import completed. These layers were set to Normal -- review them before validation.";
message_en["UI::Report::Flagged"] 			= "Label unresolved layers and failed shots Red";
message_en["UI::Report::FlagUndo"] 			= "TVPaint Import -- Flag Affected Layers";
message_en["UI::Report::FilesHeadline"] 	= "%1 layer(s) in %2 shot(s) were skipped: their image files were not found.";
message_en["UI::Report::ColMissing"] 		= "Missing frames";
message_en["UI::Report::FilesTitle"] 		= "FAILED IMPORTS -- these layers are not in the project";
message_en["UI::Report::FilesAlert"] 		= "!  %1 layer(s) in %2 shot(s) did NOT import. Those shots will need re-importing.";
message_en["UI::Report::GroupTitle"] 		= "Summary by blending mode:";
message_en["UI::Report::GroupLine"] 		= "%1  ->  %2   :   %3 layer(s) in %4 shot(s)";
message_en["UI::Report::ColShot"] 			= "Shot";
message_en["UI::Report::ColComp"] 			= "Composition";
message_en["UI::Report::ColLayer"] 			= "Layer";
message_en["UI::Report::ColMode"] 			= "TVPaint Mode";
message_en["UI::Report::ColApplied"] 		= "Applied in AE";
message_en["UI::Report::Details"] 			= "Affected layers:";
message_en["UI::Report::SaveLog"] 			= "Save Log...";
message_en["UI::Report::Close"] 			= "Close";
message_en["UI::Report::SaveTitle"] 		= "Save Warning Log";
message_en["UI::Report::Saved"] 			= "Log saved:";
message_en["UI::Report::SaveFailed"] 		= "Could not write the log file.";
message_en["Blending::Normal"] 				= "Normal";
message_en["Log::Title"] 					= "TVPaint 12 -> After Effects : Import Warning Report";
message_en["Log::Generated"] 				= "Generated:";
message_en["Log::Shot"] 					= "Shot:";
message_en["UI::Report::FixLabel"] 			= "Set selected layer(s) to:";
message_en["UI::Report::ApplyBtn"] 			= "Apply to Selected";
message_en["UI::Report::FixDone"] 			= "%1 layer(s) set to %2.";
message_en["UI::Report::FixNone"] 			= "Select one or more rows first.";
message_en["UI::Report::FixFailed"] 		= "%1 layer(s) could not be changed -- the import may have been undone.";
message_en["UI::Report::UndoName"] 			= "TVPaint Import -- Change Blending Modes";

var message_ja = [];
message_ja["Error::Interruption"] 			= "スクリプトを中止する。";
message_ja["Error::Cancellation"] 			= "スクリプトが中止されました。";
message_ja["Error::InvalidLocation"] 		= "パスが見つかりません";
message_ja["Error::InvalidFile"] 			= "ファイルの読み込みができませんでした: ";
message_ja["Error::MissingFiles"] 			= "参照されたフォルダーにいくつのファイルが見つかりませんでした。";
message_ja["Error::MissingData"] 			= "ファイルにデータが見つかりませんでした:";
message_ja["Error::MissingLayers"] 			= "レイヤーが見つかりませんでした。プロジェクトは空です。";
message_ja["Error::BadBlendingMode"] 		= "ブレンディングモードは対応しません";
message_ja["Error::NoJSONFound"] 			= "選択されたフォルダーに対応する .JSON ファイルが見つかりませんでした:";
message_ja["FileBrowser::Info"] 			= ".JSON ファイルを選択してください。";
message_ja["FolderBrowser::Info"] 			= "ショットのルートフォルダーを選択してください";
message_ja["UI::Title"] 					= "TVPaint 12 -- v. "+scriptVersion_XX+"を読み込みする"+scriptLastEdit_LOC;
message_ja["UI::Camera::Import"] 			= "カメラ";
message_ja["UI::Camera::Key"] 				= "キーの座標";
message_ja["UI::Camera::Raw"] 				= "カメラビュー座標";
message_ja["UI::Label::Info"] 				= "TVPaint からプロジェクトを読み込む";
message_ja["UI::Label::Browse"] 			= "ショットを選択 (Shot Browser)...";
message_ja["UI::Label::Settings"] 			= "読み込みオプション:";
message_ja["UI::Label::LayerColors"] 		= "レイヤーの色";
message_ja["UI::Label::TimeRemap"] 			= "タイムリーマップ";
message_ja["UI::Label::BlendingMode"] 		= "ブレンディングモード";
message_ja["UI::Label::PrePostB"] 			= "前後の振る舞い";
message_ja["UI::Label::Sequence"] 			= "シークエンス画像の順番(タイムリーマップ)";
message_ja["UI::Label::Sequence::Index"] 	= "インデックス(デフォルト設定)";
message_ja["UI::Label::Sequence::Name"] 	= "名前(日本アニメーション業界)";
message_ja["UI::Label::Sequence2"] 			= "シーケンスの読み込みモード";
message_ja["UI::Label::Sequence2::Rebuilt"] = "再建されたシーケンス";
message_ja["UI::Label::Sequence2::Native"] 	= "ネイティブのシーケンス";
message_ja["UI::Browser::Title"] 			= "TVPaint ショットブラウザ";
message_ja["UI::Browser::BaseFolder"] 		= "ルートフォルダー:";
message_ja["UI::Browser::ChangeFolder"] 	= "フォルダー変更...";
message_ja["UI::Browser::Refresh"] 			= "更新";
message_ja["UI::Browser::Filter"] 			= "フィルター:";
message_ja["UI::Browser::SortName"] 		= "並び替え: 名前 (A-Z)";
message_ja["UI::Browser::SortDate"] 		= "並び替え: 更新日時 (新しい順)";
message_ja["UI::Browser::SelectAll"] 		= "すべて選択";
message_ja["UI::Browser::DeselectAll"] 		= "選択解除";
message_ja["UI::Browser::DirectFile"] 		= "単一JSON参照...";
message_ja["UI::Browser::Cancel"] 			= "キャンセル";
message_ja["UI::Browser::ImportBtn"] 		= "選択したショットを読み込む";
message_ja["UI::Browser::ColShot"] 			= "ショットフォルダー";
message_ja["UI::Browser::ColDate"] 			= "更新日時";
message_ja["UI::Browser::ColStatus"] 		= "JSON 状態";
// --- Import Warning Report ---
message_ja["UI::Report::Title"] 			= "読み込みレポート";
message_ja["UI::Report::Headline"] 			= "%2 個のショット内の %1 個のレイヤーで、After Effects では再現できない描画モードが使用されています。";
message_ja["UI::Report::Intro"] 			= "読み込みは完了しました。これらのレイヤーは「通常」に設定されていますので、確認してください。";
message_ja["UI::Report::Flagged"] 			= "未解決のレイヤーと失敗したショットに赤のラベルを付ける";
message_ja["UI::Report::FlagUndo"] 			= "TVPaint 読み込み -- 対象レイヤーにラベルを付ける";
message_ja["UI::Report::FilesHeadline"] 	= "%2 個のショット内の %1 個のレイヤーをスキップしました: 画像ファイルが見つかりません。";
message_ja["UI::Report::ColMissing"] 		= "見つからないファイル";
message_ja["UI::Report::FilesTitle"] 		= "読み込み失敗 -- これらのレイヤーはプロジェクトにありません";
message_ja["UI::Report::FilesAlert"] 		= "!  %2 個のショット内の %1 個のレイヤーが読み込まれませんでした。これらのショットは再読み込みが必要です。";
message_ja["UI::Report::GroupTitle"] 		= "描画モード別の集計:";
message_ja["UI::Report::GroupLine"] 		= "%1  ->  %2   :   %4 ショット / %3 レイヤー";
message_ja["UI::Report::ColShot"] 			= "ショット";
message_ja["UI::Report::ColComp"] 			= "コンポジション";
message_ja["UI::Report::ColLayer"] 			= "レイヤー";
message_ja["UI::Report::ColMode"] 			= "TVPaint の描画モード";
message_ja["UI::Report::ColApplied"] 		= "AE での適用";
message_ja["UI::Report::Details"] 			= "対象レイヤー:";
message_ja["UI::Report::SaveLog"] 			= "ログを保存...";
message_ja["UI::Report::Close"] 			= "閉じる";
message_ja["UI::Report::SaveTitle"] 		= "警告ログを保存";
message_ja["UI::Report::Saved"] 			= "ログを保存しました:";
message_ja["UI::Report::SaveFailed"] 		= "ログファイルを書き込めませんでした。";
message_ja["Blending::Normal"] 				= "通常";
message_ja["Log::Title"] 					= "TVPaint 12 -> After Effects : 読み込み警告レポート";
message_ja["Log::Generated"] 				= "生成日時:";
message_ja["Log::Shot"] 					= "ショット:";
message_ja["UI::Report::FixLabel"] 			= "選択したレイヤーの描画モード:";
message_ja["UI::Report::ApplyBtn"] 			= "選択項目に適用";
message_ja["UI::Report::FixDone"] 			= "%1 個のレイヤーを「%2」に設定しました。";
message_ja["UI::Report::FixNone"] 			= "先に行を選択してください。";
message_ja["UI::Report::FixFailed"] 		= "%1 個のレイヤーを変更できませんでした。読み込みが取り消された可能性があります。";
message_ja["UI::Report::UndoName"] 			= "TVPaint 読み込み -- 描画モードの変更";

var message_zh = [];
message_zh["Error::Interruption"] 			= "退出脚本";
message_zh["Error::Cancellation"] 			= "取消脚本";
message_zh["Error::InvalidLocation"] 		= "无效位置";
message_zh["Error::InvalidFile"] 			= "无法读取文件: ";
message_zh["Error::MissingFiles"] 			= "项目位置中文件丢失";
message_zh["Error::MissingData"] 			= "文件数据丢失:";
message_zh["Error::MissingLayers"] 			= "无法发现图层，项目为空。";
message_zh["Error::BadBlendingMode"] 		= "不支持混合模式转换";
message_zh["Error::NoJSONFound"] 			= "在所选文件夹中未找到有效的 .JSON 文件。";
message_zh["FileBrowser::Info"] 			= "选择一个 .JSON 文件。";
message_zh["FolderBrowser::Info"] 			= "选择镜头根目录";
message_zh["UI::Title"] 					= "导入 TVPaint 12 -- v. "+scriptVersion_XX+scriptLastEdit_LOC;
message_zh["UI::Camera::Import"] 			= "导入摄影机";
message_zh["UI::Camera::Key"] 				= "关键坐标";
message_zh["UI::Camera::Raw"] 				= "相机视图坐标";
message_zh["UI::Label::Info"] 				= "从 TVPaint 导入项目";
message_zh["UI::Label::Browse"] 			= "选择镜头 (Shot Browser)...";
message_zh["UI::Label::Settings"] 			= "导入设置内容:";
message_zh["UI::Label::LayerColors"] 		= "图层颜色";
message_zh["UI::Label::TimeRemap"] 			= "时间重置";
message_zh["UI::Label::BlendingMode"] 		= "混合模式";
message_zh["UI::Label::PrePostB"] 			= "前/后 动作";
message_zh["UI::Label::Sequence"] 			= "顺序分类时间重置:";
message_zh["UI::Label::Sequence::Index"] 	= "索引（默认）";
message_zh["UI::Label::Sequence::Name"] 	= "名称（日本动画界）";
message_zh["UI::Label::Sequence2"] 			= "序列导入模式 ";
message_zh["UI::Label::Sequence2::Rebuilt"] = "重建序列";
message_zh["UI::Label::Sequence2::Native"] 	= "天然序列";
message_zh["UI::Browser::Title"] 			= "TVPaint 镜头浏览器";
message_zh["UI::Browser::BaseFolder"] 		= "根文件夹:";
message_zh["UI::Browser::ChangeFolder"] 	= "更改文件夹...";
message_zh["UI::Browser::Refresh"] 			= "刷新";
message_zh["UI::Browser::Filter"] 			= "过滤:";
message_zh["UI::Browser::SortName"] 		= "排序: 名称 (A-Z)";
message_zh["UI::Browser::SortDate"] 		= "排序: 修改日期 (最新优先)";
message_zh["UI::Browser::SelectAll"] 		= "全选";
message_zh["UI::Browser::DeselectAll"] 		= "取消全选";
message_zh["UI::Browser::DirectFile"] 		= "单个 JSON 文件...";
message_zh["UI::Browser::Cancel"] 			= "取消";
message_zh["UI::Browser::ImportBtn"] 		= "导入所选镜头";
message_zh["UI::Browser::ColShot"] 			= "镜头文件夹";
message_zh["UI::Browser::ColDate"] 			= "修改日期";
message_zh["UI::Browser::ColStatus"] 		= "JSON 状态";
// --- Import Warning Report ---
message_zh["UI::Report::Title"] 			= "导入报告";
message_zh["UI::Report::Headline"] 			= "%2 个镜头中的 %1 个图层使用了 After Effects 无法还原的混合模式。";
message_zh["UI::Report::Intro"] 			= "导入已完成。这些图层已设置为“正常”，请在交付前检查。";
message_zh["UI::Report::Flagged"] 			= "将未解决的图层和失败的镜头标为红色";
message_zh["UI::Report::FlagUndo"] 			= "TVPaint 导入 -- 标记受影响的图层";
message_zh["UI::Report::FilesHeadline"] 	= "已跳过 %2 个镜头中的 %1 个图层: 未找到其图像文件。";
message_zh["UI::Report::ColMissing"] 		= "缺失的帧";
message_zh["UI::Report::FilesTitle"] 		= "导入失败 -- 这些图层不在项目中";
message_zh["UI::Report::FilesAlert"] 		= "!  %2 个镜头中的 %1 个图层未能导入。这些镜头需要重新导入。";
message_zh["UI::Report::GroupTitle"] 		= "按混合模式汇总:";
message_zh["UI::Report::GroupLine"] 		= "%1  ->  %2   :   %4 个镜头 / %3 个图层";
message_zh["UI::Report::ColShot"] 			= "镜头";
message_zh["UI::Report::ColComp"] 			= "合成";
message_zh["UI::Report::ColLayer"] 			= "图层";
message_zh["UI::Report::ColMode"] 			= "TVPaint 混合模式";
message_zh["UI::Report::ColApplied"] 		= "AE 中应用";
message_zh["UI::Report::Details"] 			= "受影响的图层:";
message_zh["UI::Report::SaveLog"] 			= "保存日志...";
message_zh["UI::Report::Close"] 			= "关闭";
message_zh["UI::Report::SaveTitle"] 		= "保存警告日志";
message_zh["UI::Report::Saved"] 			= "日志已保存:";
message_zh["UI::Report::SaveFailed"] 		= "无法写入日志文件。";
message_zh["Blending::Normal"] 				= "正常";
message_zh["Log::Title"] 					= "TVPaint 12 -> After Effects : 导入警告报告";
message_zh["Log::Generated"] 				= "生成时间:";
message_zh["Log::Shot"] 					= "镜头:";
message_zh["UI::Report::FixLabel"] 			= "将所选图层设为:";
message_zh["UI::Report::ApplyBtn"] 			= "应用到所选";
message_zh["UI::Report::FixDone"] 			= "已将 %1 个图层设为 %2。";
message_zh["UI::Report::FixNone"] 			= "请先选择一行或多行。";
message_zh["UI::Report::FixFailed"] 		= "%1 个图层无法更改 -- 导入可能已被撤销。";
message_zh["UI::Report::UndoName"] 			= "TVPaint 导入 -- 更改混合模式";

// Fill Languages in message Table
var message = [];
message["fr"] = message_fr;
message["en"] = message_en;
message["ja"] = message_ja;
message["zh"] = message_zh;

//////////////////////////////////////////////////////////////////////////////////////////////
// Progress Bar Localization
var pbarMessage_fr = [];
pbarMessage_fr["UI::Title"] 						= "Import en cours...";
pbarMessage_fr["UI::Label::Stage::JSONParse"] 		= "Lecture du fichier JSON...";
pbarMessage_fr["UI::Label::Stage::RootCompCreation"] = "Création d'une nouvelle Comp. source...";
pbarMessage_fr["UI::Label::Stage::CompFolderCreation"] = "Création d'un dossier Comp...";
pbarMessage_fr["UI::Label::Stage::LayerCreation"] 	= "Import des calques...";
pbarMessage_fr["UI::Label::Stage::Camera"] 			= "Import de la caméra...";
pbarMessage_fr["UI::Label::Stage::Success"] 		= "Import terminé avec succès.";

var pbarMessage_en = [];
pbarMessage_en["UI::Title"] 						= "TVPaint Import Progress...";
pbarMessage_en["UI::Label::Stage::JSONParse"] 		= "Reading JSON file...";
pbarMessage_en["UI::Label::Stage::RootCompCreation"] = "Creation of a new Root Comp...";
pbarMessage_en["UI::Label::Stage::CompFolderCreation"] = "Creation of a new Comp Folder...";
pbarMessage_en["UI::Label::Stage::LayerCreation"] 	= "Importing layers...";
pbarMessage_en["UI::Label::Stage::Camera"] 			= "Importing camera...";
pbarMessage_en["UI::Label::Stage::Success"] 		= "Import complete.";

var pbarMessage_ja = [];
pbarMessage_ja["UI::Title"] 						= "ローディング中…";
pbarMessage_ja["UI::Label::Stage::JSONParse"] 		= "JSONファイルの読み込み中…";
pbarMessage_ja["UI::Label::Stage::RootCompCreation"] = "ソースとする新しいコンポジションの作成中…";
pbarMessage_ja["UI::Label::Stage::CompFolderCreation"] = "コンポジションのフォルダの作成中…";
pbarMessage_ja["UI::Label::Stage::LayerCreation"] 	= "レイヤーの読み込み中…";
pbarMessage_ja["UI::Label::Stage::Camera"] 			= "カメラの読み込み中…";
pbarMessage_ja["UI::Label::Stage::Success"] 		= "読み込みが完了。";

var pbarMessage_zh = [];
pbarMessage_zh["UI::Title"] 						= "加载中...";
pbarMessage_zh["UI::Label::Stage::JSONParse"] 		= "正在加载 JSON 文件...";
pbarMessage_zh["UI::Label::Stage::RootCompCreation"] = "创建源合成...";
pbarMessage_zh["UI::Label::Stage::CompFolderCreation"] = "创建合成文件夹...";
pbarMessage_zh["UI::Label::Stage::LayerCreation"] 	= "加载图层...";
pbarMessage_zh["UI::Label::Stage::Camera"] 			= "正在加载相机...";
pbarMessage_zh["UI::Label::Stage::Success"] 		= "加载完成。";

var pbarMessage = [];
pbarMessage["fr"] = pbarMessage_fr;
pbarMessage["en"] = pbarMessage_en;
pbarMessage["ja"] = pbarMessage_ja;
pbarMessage["zh"] = pbarMessage_zh;

//////////////////////////////////////////////////////////////////////////////////////////////
// After Effects layer color labels Table
var colorLabels = [];
colorLabels[0]  = [000, 000, 000 ];	// 0. None
colorLabels[1]  = [121, 058, 058 ];	// 1. Red
colorLabels[2]  = [144, 138, 068 ];	// 2. Yellow
colorLabels[3]  = [115, 132, 130 ];	// 3. Aqua
colorLabels[4]  = [145, 124, 131 ];	// 4. Pink
colorLabels[5]  = [115, 115, 131 ];	// 5. Lavender
colorLabels[6]  = [146, 127, 109 ];	// 6. Peach
colorLabels[7]  = [120, 130, 120 ];	// 7. Sea Foam
colorLabels[8]  = [082, 093, 142 ];	// 8. Blue
colorLabels[9]  = [067, 112, 068 ];	// 9. Green
colorLabels[10] = [101, 052, 107 ];	// 10. Purple
colorLabels[11] = [146, 103, 037 ];	// 11. Orange
colorLabels[12] = [094, 065, 051 ];	// 12. Brown
colorLabels[13] = [152, 085, 137 ];	// 13. Fuchsia
colorLabels[14] = [061, 111, 113 ];	// 14. Cyan
colorLabels[15] = [114, 105, 090 ];	// 15. Sandstone
colorLabels[16] = [045, 062, 045 ];	// 16. DarkGreen

//////////////////////////////////////////////////////////////////////////////////////////////
// After Effects Blending Modes tables
var AEBlendingModes = [];
AEBlendingModes[0]  = BlendingMode.ADD;
AEBlendingModes[1]  = BlendingMode.ALPHA_ADD;
AEBlendingModes[2]  = BlendingMode.CLASSIC_COLOR_BURN;
AEBlendingModes[3]  = BlendingMode.CLASSIC_COLOR_DODGE;
AEBlendingModes[4]  = BlendingMode.CLASSIC_DIFFERENCE;
AEBlendingModes[5]  = BlendingMode.COLOR;
AEBlendingModes[6]  = BlendingMode.COLOR_BURN;
AEBlendingModes[7]  = BlendingMode.COLOR_DODGE;
AEBlendingModes[8]  = BlendingMode.DANCING_DISSOLVE;
AEBlendingModes[9]  = BlendingMode.DARKEN;
AEBlendingModes[10] = BlendingMode.DARKER_COLOR;
AEBlendingModes[11] = BlendingMode.DIFFERENCE;
AEBlendingModes[12] = BlendingMode.DISSOLVE;
AEBlendingModes[13] = BlendingMode.EXCLUSION;
AEBlendingModes[14] = BlendingMode.HARD_LIGHT;
AEBlendingModes[15] = BlendingMode.HARD_MIX;
AEBlendingModes[16] = BlendingMode.HUE;
AEBlendingModes[17] = BlendingMode.LIGHTEN;
AEBlendingModes[18] = BlendingMode.LIGHTER_COLOR;
AEBlendingModes[19] = BlendingMode.LINEAR_BURN;
AEBlendingModes[20] = BlendingMode.LINEAR_DODGE;
AEBlendingModes[21] = BlendingMode.LINEAR_LIGHT;
AEBlendingModes[22] = BlendingMode.LUMINESCENT_PREMUL;
AEBlendingModes[23] = BlendingMode.LUMINOSITY;
AEBlendingModes[24] = BlendingMode.MULTIPLY;
AEBlendingModes[25] = BlendingMode.NORMAL;
AEBlendingModes[26] = BlendingMode.OVERLAY;
AEBlendingModes[27] = BlendingMode.PIN_LIGHT;
AEBlendingModes[28] = BlendingMode.SATURATION;
AEBlendingModes[29] = BlendingMode.SCREEN;
AEBlendingModes[30] = BlendingMode.SILHOUETE_ALPHA;
AEBlendingModes[31] = BlendingMode.SILHOUETTE_LUMA;
AEBlendingModes[32] = BlendingMode.SOFT_LIGHT;
AEBlendingModes[33] = BlendingMode.STENCIL_ALPHA;
AEBlendingModes[34] = BlendingMode.STENCIL_LUMA;
AEBlendingModes[35] = BlendingMode.VIVID_LIGHT;

var TVPBlendingModes = [];
TVPBlendingModes[0]   = "Color";
TVPBlendingModes[1]   = "Behind";
TVPBlendingModes[2]   = "Erase";
TVPBlendingModes[3]   = "Shade";
TVPBlendingModes[4]   = "Light";
TVPBlendingModes[5]   = "Colorize";
TVPBlendingModes[6]   = "Hue";
TVPBlendingModes[7]   = "Saturation";
TVPBlendingModes[8]   = "Value";
TVPBlendingModes[9]   = "Add";
TVPBlendingModes[10]  = "Sub";
TVPBlendingModes[11]  = "Multiply";
TVPBlendingModes[12]  = "Screen";
TVPBlendingModes[13]  = "Replace";
TVPBlendingModes[14]  = "Copy";
TVPBlendingModes[15]  = "Difference";
TVPBlendingModes[16]  = "Divide";
TVPBlendingModes[17]  = "Overlay";
TVPBlendingModes[18]  = "Overlay2";
TVPBlendingModes[19]  = "Light2";
TVPBlendingModes[20]  = "Shade2";
TVPBlendingModes[21]  = "HardLight";
TVPBlendingModes[22]  = "SoftLight";
TVPBlendingModes[23]  = "GrainExtract";
TVPBlendingModes[24]  = "GrainMerge";
TVPBlendingModes[25]  = "Sub2";
TVPBlendingModes[26]  = "Darken";
TVPBlendingModes[27]  = "Lighten";

// Matching Table
var BlendingMatch = [];
BlendingMatch["Color"] 			= BlendingMode.NORMAL;
//BlendingMatch["Behind"] 		= Unsupported
BlendingMatch["Erase"] 			= BlendingMode.SILHOUETE_ALPHA;
//BlendingMatch["Shade"] 		= Unsupported
//BlendingMatch["Light"] 		= Unsupported
BlendingMatch["Colorize"] 		= BlendingMode.COLOR;
BlendingMatch["Hue"] 			= BlendingMode.HUE;
BlendingMatch["Saturation"] 	= BlendingMode.SATURATION;
BlendingMatch["Value"] 			= BlendingMode.LUMINOSITY;
BlendingMatch["Add"] 			= BlendingMode.ADD;
//BlendingMatch["Sub"] 			= Unsupported
BlendingMatch["Multiply"] 		= BlendingMode.MULTIPLY;
BlendingMatch["Screen"] 		= BlendingMode.SCREEN;
//BlendingMatch["Replace"] 		= Unsupported
//BlendingMatch["Copy"] 		= Unsupported
BlendingMatch["Difference"] 	= BlendingMode.DIFFERENCE;
BlendingMatch["Divide"] 		= BlendingMode.DIVIDE;
BlendingMatch["Overlay"] 		= BlendingMode.OVERLAY;
BlendingMatch["Overlay2"]		= BlendingMode.OVERLAY;
BlendingMatch["Light2"] 		= BlendingMode.COLOR_DODGE;
BlendingMatch["Shade2"] 		= BlendingMode.COLOR_BURN;
BlendingMatch["HardLight"] 		= BlendingMode.VIVID_LIGHT;
BlendingMatch["SoftLight"] 		= BlendingMode.SOFT_LIGHT;
//BlendingMatch["GrainExtract"] = Unsupported
//BlendingMatch["GrainMerge"] 	= Unsupported
BlendingMatch["Sub2"] 			= BlendingMode.DIFFERENCE;
BlendingMatch["Darken"] 		= BlendingMode.DARKEN;
BlendingMatch["Lighten"] 		= BlendingMode.LIGHTEN;

//////////////////////////////////////////////////////////////////////////////////////////////
// Preference Persistence Helpers via app.settings
var SETTINGS_SECTION = "TVPaint_Import";

function LoadSetting(key, defaultValue) {
    try {
        if (app.settings.haveSetting(SETTINGS_SECTION, key)) {
            return app.settings.getSetting(SETTINGS_SECTION, key);
        }
    } catch(e) {}
    return defaultValue;
}

function SaveSetting(key, value) {
    try {
        app.settings.saveSetting(SETTINGS_SECTION, key, String(value));
    } catch(e) {}
}

function LoadBoolSetting(key, defaultValue) {
    var val = LoadSetting(key, defaultValue ? "true" : "false");
    return val === "true" || val === "1";
}

function LoadIntSetting(key, defaultValue) {
    var val = LoadSetting(key, String(defaultValue));
    var num = parseInt(val, 10);
    return isNaN(num) ? defaultValue : num;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Date Formatter Helper
function FormatDate(dateObj) {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return "--";
    }
    var y = dateObj.getFullYear();
    var m = dateObj.getMonth() + 1;
    var d = dateObj.getDate();
    var hr = dateObj.getHours();
    var min = dateObj.getMinutes();
    var sec = dateObj.getSeconds();
    
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return y + "-" + pad(m) + "-" + pad(d) + " " + pad(hr) + ":" + pad(min) + ":" + pad(sec);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Import Warning Collection
//
// An unsupported blending mode used to raise one modal alert per layer, which made a
// multi-shot batch impossible to leave unattended. Warnings are collected here instead
// and presented once, after the whole run, by ShowWarningReport().

var importWarnings = [];

function ResetImportWarnings() {
    importWarnings = [];
    importFileFailures = [];
}

// Layers skipped because their frames could not be found on disk. Kept separate from
// the blending warnings: nothing was converted, the layer simply is not there.
var importFileFailures = [];

function AddFileFailure( iShot, iComp, iLayer, iMissingCount, iTotalCount, iFirstMissing,
                         iCompRef, iFolderRef ) {
    importFileFailures.push({
        shot:    iShot,
        comp:    iComp,
        layer:   iLayer,
        missing: iMissingCount,
        total:   iTotalCount,
        first:   iFirstMissing,
        // The layer itself was never created, so the report marks the containers
        // instead: the shot's composition and its project folder.
        compRef:        iCompRef,
        folderRef:      iFolderRef,
        compLabel:      ( iCompRef   ? iCompRef.label   : undefined ),
        folderLabel:    ( iFolderRef ? iFolderRef.label : undefined )
    });
}

function AddImportWarning( iShot, iComp, iLayer, iRequestedMode, iAppliedMode, iLayerRef, iOriginalLabel ) {
    importWarnings.push({
        shot:      iShot,
        comp:      iComp,
        layer:     iLayer,
        requested: iRequestedMode,
        applied:   iAppliedMode,
        // Kept so the report can reassign the mode on the real layer afterwards.
        layerRef:      iLayerRef,
        originalLabel: iOriginalLabel
    });
}

// The blending modes offered in the report, built at run time so a constant missing
// from a given After Effects version is skipped rather than throwing at load.
function BuildBlendingModeChoices() {
    var wanted = [
        ["Normal", "NORMAL"], ["Dissolve", "DISSOLVE"], ["Darken", "DARKEN"],
        ["Multiply", "MULTIPLY"], ["Color Burn", "COLOR_BURN"], ["Linear Burn", "LINEAR_BURN"],
        ["Darker Color", "DARKER_COLOR"], ["Add", "ADD"], ["Lighten", "LIGHTEN"],
        ["Screen", "SCREEN"], ["Color Dodge", "COLOR_DODGE"], ["Linear Dodge", "LINEAR_DODGE"],
        ["Lighter Color", "LIGHTER_COLOR"], ["Overlay", "OVERLAY"], ["Soft Light", "SOFT_LIGHT"],
        ["Hard Light", "HARD_LIGHT"], ["Linear Light", "LINEAR_LIGHT"], ["Vivid Light", "VIVID_LIGHT"],
        ["Pin Light", "PIN_LIGHT"], ["Hard Mix", "HARD_MIX"], ["Difference", "DIFFERENCE"],
        ["Exclusion", "EXCLUSION"], ["Subtract", "SUBTRACT"], ["Divide", "DIVIDE"],
        ["Hue", "HUE"], ["Saturation", "SATURATION"], ["Color", "COLOR"],
        ["Luminosity", "LUMINOSITY"], ["Alpha Add", "ALPHA_ADD"]
    ];
    var choices = [];
    for( var i = 0; i < wanted.length; i++ ) {
        try {
            var mode = BlendingMode[ wanted[i][1] ];
            if( mode !== undefined && mode !== null ) {
                choices.push({ label: wanted[i][0], mode: mode });
            }
        } catch(e) {}
    }
    return choices;
}

// Localized lookup with an English fallback, matching the idiom used by the Shot Browser.
function Msg( iKey, iFallback ) {
    var value = message[lang][iKey];
    if( value === undefined || value === null || value === "" ) {
        return iFallback;
    }
    return value;
}

// Substitutes %1, %2, ... in a localized string. Word order differs between languages
// (Japanese and Chinese put the shot count first), so every message carrying numbers
// uses numbered placeholders instead of concatenation.
function FormatMessage( iString, iArgs ) {
    var out = String( iString );
    for( var i = 0; i < iArgs.length; i++ ) {
        out = out.split( "%" + (i + 1) ).join( String( iArgs[i] ) );
    }
    return out;
}

// Distinct shot count across the collected warnings.
function CountWarnedShots( iWarnings ) {
    var shots = [];
    for( var i = 0; i < iWarnings.length; i++ ) {
        var seen = false;
        for( var s = 0; s < shots.length; s++ ) {
            if( shots[s] === iWarnings[i].shot ) {
                seen = true;
                break;
            }
        }
        if( !seen ) {
            shots.push( iWarnings[i].shot );
        }
    }
    return shots.length;
}

// Groups warnings by "requested mode -> applied mode" so the report can lead with a
// short summary instead of only a long per-layer table.
function GroupWarningsByMode( iWarnings ) {
    var groups = [];
    for( var i = 0; i < iWarnings.length; i++ ) {
        var w = iWarnings[i];
        var group = null;
        for( var g = 0; g < groups.length; g++ ) {
            if( groups[g].requested === w.requested && groups[g].applied === w.applied ) {
                group = groups[g];
                break;
            }
        }
        if( group === null ) {
            group = { requested: w.requested, applied: w.applied, count: 0, shots: [] };
            groups.push( group );
        }
        group.count++;
        var seenShot = false;
        for( var k = 0; k < group.shots.length; k++ ) {
            if( group.shots[k] === w.shot ) {
                seenShot = true;
                break;
            }
        }
        if( !seenShot ) {
            group.shots.push( w.shot );
        }
    }
    return groups;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Interactive Shot Browser Dialog (ScriptUI Multi-column Table)
function OpenShotBrowserDialog(initialBaseFolder, settings) {
    var currentBaseFolder = initialBaseFolder;
    if (!currentBaseFolder || !currentBaseFolder.exists) {
        currentBaseFolder = Folder.selectDialog(message[lang]["FolderBrowser::Info"] || "Select Base Shots Folder");
        if (!currentBaseFolder) return;
        SaveSetting("LastFolder", currentBaseFolder.fsName);
    }

    var win = new Window("dialog", (message[lang]["UI::Browser::Title"] || "TVPaint Shot Browser") + " -- v." + scriptVersion_XX);
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 12;

    // --- Top Folder Bar ---
    var folderGroup = win.add("group");
    folderGroup.orientation = "row";
    folderGroup.alignChildren = ["left", "center"];
    folderGroup.spacing = 6;
    
    folderGroup.add("statictext", undefined, message[lang]["UI::Browser::BaseFolder"] || "Base Folder:");
    var txtFolderPath = folderGroup.add("edittext", undefined, currentBaseFolder.fsName);
    txtFolderPath.characters = 38;
    txtFolderPath.readonly = true;
    
    var btnChangeFolder = folderGroup.add("button", undefined, message[lang]["UI::Browser::ChangeFolder"] || "Change Folder...");
    var btnRefresh = folderGroup.add("button", undefined, message[lang]["UI::Browser::Refresh"] || "Refresh");

    // --- Filter & Sort Bar ---
    var filterSortGroup = win.add("group");
    filterSortGroup.orientation = "row";
    filterSortGroup.alignChildren = ["left", "center"];
    filterSortGroup.spacing = 6;
    
    filterSortGroup.add("statictext", undefined, message[lang]["UI::Browser::Filter"] || "Filter:");
    var editFilter = filterSortGroup.add("edittext", undefined, "");
    editFilter.characters = 12;
    
    var btnSortName = filterSortGroup.add("button", undefined, message[lang]["UI::Browser::SortName"] || "Sort: Name (A-Z)");
    var btnSortDate = filterSortGroup.add("button", undefined, message[lang]["UI::Browser::SortDate"] || "Sort: Date Modified (Newest)");
    var btnSelectAll = filterSortGroup.add("button", undefined, message[lang]["UI::Browser::SelectAll"] || "Select All");
    var btnSelectNone = filterSortGroup.add("button", undefined, message[lang]["UI::Browser::DeselectAll"] || "Deselect All");

    // --- Table Listbox ---
    var shotListBox = win.add("listbox", undefined, [], {
        numberOfColumns: 3,
        showHeaders: true,
        columnTitles: [
            message[lang]["UI::Browser::ColShot"] || "Shot Folder",
            message[lang]["UI::Browser::ColDate"] || "Date Modified",
            message[lang]["UI::Browser::ColStatus"] || "JSON Status"
        ],
        columnWidths: [160, 200, 180],
        multiselect: true
    });
    shotListBox.preferredSize = [570, 340];

    // --- Bottom Status & Actions ---
    var bottomGroup = win.add("group");
    bottomGroup.orientation = "row";
    bottomGroup.alignChildren = ["fill", "center"];
    bottomGroup.spacing = 8;
    
    var txtStatus = bottomGroup.add("statictext", undefined, "Total shots: 0 | Selected: 0");
    txtStatus.characters = 28;
    
    var actionGroup = bottomGroup.add("group");
    actionGroup.alignment = ["right", "center"];
    actionGroup.spacing = 8;
    
    var btnDirectFile = actionGroup.add("button", undefined, message[lang]["UI::Browser::DirectFile"] || "Browse Single JSON...");
    var btnCancel = actionGroup.add("button", undefined, message[lang]["UI::Browser::Cancel"] || "Cancel");
    var btnImport = actionGroup.add("button", undefined, (message[lang]["UI::Browser::ImportBtn"] || "Import Selected") + " (0)");
    btnImport.preferredSize = [180, 28];
    btnImport.enabled = false;

    // --- State & Loading Logic ---
    var currentSort = "name";
    var allShots = [];

    function ScanFolder() {
        allShots = [];
        if (!currentBaseFolder || !currentBaseFolder.exists) return;
        
        var subFolders = currentBaseFolder.getFiles(function(f) { return (f instanceof Folder); });
        if (!subFolders) return;
        
        for (var i = 0; i < subFolders.length; i++) {
            var sub = subFolders[i];
            // Folder.name is URI-encoded (spaces become %20); decode for display and path building.
            var subName = File.decode(sub.name);
            var jsonFile = File(sub.fsName + "/" + subName + ".json");
            if (!jsonFile.exists) {
                var jsonMatches = sub.getFiles("*.json");
                if (jsonMatches && jsonMatches.length > 0 && (jsonMatches[0] instanceof File)) {
                    jsonFile = jsonMatches[0];
                } else {
                    jsonFile = null;
                }
            }
            
            allShots.push({
                folder: sub,
                name: subName,
                date: sub.modified,
                dateStr: FormatDate(sub.modified),
                json: jsonFile
            });
        }
    }

    function RefreshList() {
        shotListBox.removeAll();
        var query = editFilter.text ? editFilter.text.toLowerCase() : "";
        
        var filtered = [];
        for (var i = 0; i < allShots.length; i++) {
            var item = allShots[i];
            if (query === "" || item.name.toLowerCase().indexOf(query) !== -1) {
                filtered.push(item);
            }
        }
        
        if (currentSort === "name") {
            filtered.sort(function(a, b) {
                var aNum = parseInt(a.name.replace(/\D/g, ""), 10);
                var bNum = parseInt(b.name.replace(/\D/g, ""), 10);
                if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) {
                    return aNum - bNum;
                }
                return a.name.localeCompare ? a.name.localeCompare(b.name) : (a.name < b.name ? -1 : 1);
            });
        } else {
            filtered.sort(function(a, b) {
                var aTime = a.date ? a.date.getTime() : 0;
                var bTime = b.date ? b.date.getTime() : 0;
                return bTime - aTime;
            });
        }
        
        for (var j = 0; j < filtered.length; j++) {
            var d = filtered[j];
            var row = shotListBox.add("item", d.name);
            row.subItems[0].text = d.dateStr;
            row.subItems[1].text = d.json ? ("✓ " + File.decode(d.json.name)) : "✗ Missing JSON";
            row.shotData = d;
        }
        
        UpdateStatus();
    }

    function UpdateStatus() {
        var sel = shotListBox.selection;
        var count = 0;
        if (sel) {
            count = (sel instanceof Array) ? sel.length : 1;
        }
        txtStatus.text = "Total: " + shotListBox.items.length + " | Selected: " + count;
        btnImport.text = (message[lang]["UI::Browser::ImportBtn"] || "Import Selected") + " (" + count + ")";
        btnImport.enabled = (count > 0);
    }

    // --- Event Handlers ---
    btnChangeFolder.onClick = function() {
        var newFolder = Folder.selectDialog(message[lang]["FolderBrowser::Info"] || "Select base shots folder", currentBaseFolder);
        if (newFolder) {
            currentBaseFolder = newFolder;
            txtFolderPath.text = currentBaseFolder.fsName;
            SaveSetting("LastFolder", currentBaseFolder.fsName);
            ScanFolder();
            RefreshList();
        }
    };

    btnRefresh.onClick = function() {
        ScanFolder();
        RefreshList();
    };

    editFilter.onChanging = function() {
        RefreshList();
    };

    btnSortName.onClick = function() {
        currentSort = "name";
        RefreshList();
    };

    btnSortDate.onClick = function() {
        currentSort = "date";
        RefreshList();
    };

    btnSelectAll.onClick = function() {
        var allRows = [];
        for (var i = 0; i < shotListBox.items.length; i++) {
            allRows.push(shotListBox.items[i]);
        }
        shotListBox.selection = allRows;
        UpdateStatus();
    };

    btnSelectNone.onClick = function() {
        shotListBox.selection = null;
        UpdateStatus();
    };

    shotListBox.onChange = function() {
        UpdateStatus();
    };

    btnCancel.onClick = function() {
        win.close();
    };

    btnDirectFile.onClick = function() {
        var dataFile = File.openDialog( message[lang]["FileBrowser::Info"], "JSON Files:*.json", false );
        if (!dataFile) return;
        if (!FileExists(dataFile)) return;
        
        SaveSetting("LastFolder", dataFile.parent.fsName);
        win.close();
        importPanel.close();
        $.sleep(50);
        ExecuteImport([dataFile], settings);
    };

    btnImport.onClick = function() {
        var sel = shotListBox.selection;
        if (!sel) return;
        if (!(sel instanceof Array)) sel = [sel];
        
        var jsonList = [];
        for (var k = 0; k < sel.length; k++) {
            if (sel[k].shotData && sel[k].shotData.json) {
                jsonList.push(sel[k].shotData.json);
            }
        }
        
        if (jsonList.length === 0) {
            alert(message[lang]["Error::NoJSONFound"] + endl + "Selected folder(s)");
            return;
        }
        
        SaveSetting("LastFolder", currentBaseFolder.fsName);
        win.close();
        importPanel.close();
        $.sleep(50);
        ExecuteImport(jsonList, settings);
    };

    // Initial Load & Show
    ScanFolder();
    RefreshList();
    win.center();
    win.show();
}

//////////////////////////////////////////////////////////////////////////////////////////////
// GUI Panel
var importPanel = new Window("palette", message[lang]["UI::Title"], {x:0, y:0, width:450, height:400});
var staticTextInfo 				= importPanel.add( "statictext", 	{x:25,  y:10,  width:400, height:25}, 	message[lang]["UI::Label::Info"]			);
var buttonBrowse 				= importPanel.add( "button", 		{x:25,  y:45,  width:400, height:26}, 	message[lang]["UI::Label::Browse"]			);
var staticTextSettingsTitle 	= importPanel.add( "statictext", 	{x:25,  y:80,  width:200, height:20}, 	message[lang]["UI::Label::Settings"]		);
var checkboxImportCamera 		= importPanel.add( "checkbox", 		{x:25,  y:115, width:200, height:20}, 	message[lang]["UI::Camera::Import"] 		);
var radioCameraKeys 			= importPanel.add( "radiobutton", 	{x:250, y:115, width:200, height:20}, 	message[lang]["UI::Camera::Key"] 			);
var radioCameraRaw 				= importPanel.add( "radiobutton", 	{x:250, y:135, width:200, height:20}, 	message[lang]["UI::Camera::Raw"] 			);
var checkboxLayerColors 		= importPanel.add( "checkbox", 		{x:25,  y:175, width:200, height:20},	message[lang]["UI::Label::LayerColors"] 	);
var checkboxTimeRemap		 	= importPanel.add( "checkbox", 		{x:250, y:175, width:200, height:20}, 	message[lang]["UI::Label::TimeRemap"] 		);
var checkboxBlendingModes 		= importPanel.add( "checkbox", 		{x:25,  y:210, width:200, height:20}, 	message[lang]["UI::Label::BlendingMode"]	);
var checkboxPrePostBehaviours 	= importPanel.add( "checkbox", 		{x:250, y:210, width:200, height:20}, 	message[lang]["UI::Label::PrePostB"] 		);
var staticTextSeqImport 		= importPanel.add( "statictext", 	{x:25,  y:250, width:200, height:20}, 	message[lang]["UI::Label::Sequence2"] 		);
var ddListArraySeqImport 		= new Array( 	message[lang]["UI::Label::Sequence2::Rebuilt"], 
												message[lang]["UI::Label::Sequence2::Native"] );
var dropdownlistSeqImport 		= importPanel.add( "dropdownlist", 	{x:25, y:280, width:300, height:20}, 	ddListArraySeqImport );
var staticTextSeqSorting 		= importPanel.add( "statictext", 	{x:25, y:315, width:350, height:20}, 	message[lang]["UI::Label::Sequence"] 		);
var ddListArraySeqSorting 		= new Array( 	message[lang]["UI::Label::Sequence::Index"], 
												message[lang]["UI::Label::Sequence::Name"] );
var dropdownlistSeqSorting 		= importPanel.add( "dropdownlist", 	{x:25, y:345, width:300, height:20}, 	ddListArraySeqSorting );

// Restore persisted settings with Native Sequence (1) as default
var savedSeqImportMode 			= LoadIntSetting("SeqImportMode", 1);
dropdownlistSeqImport.selection = (savedSeqImportMode >= 0 && savedSeqImportMode < ddListArraySeqImport.length) ? savedSeqImportMode : 1;

var savedSeqSortingMode 		= LoadIntSetting("SeqSortingMode", 0);
dropdownlistSeqSorting.selection= (savedSeqSortingMode >= 0 && savedSeqSortingMode < ddListArraySeqSorting.length) ? savedSeqSortingMode : 0;

checkboxImportCamera.value 		= LoadBoolSetting("ImportCamera", false);
var savedCamMode 				= LoadIntSetting("CameraMode", 1);
if (savedCamMode === 2) {
    radioCameraRaw.value 		= true;
    radioCameraKeys.value 		= false;
} else {
    radioCameraKeys.value 		= true;
    radioCameraRaw.value 		= false;
}

checkboxLayerColors.value 		= LoadBoolSetting("LayerColors", true);
checkboxPrePostBehaviours.value = LoadBoolSetting("PrePostBehaviours", true);
checkboxTimeRemap.value 		= LoadBoolSetting("TimeRemap", true);
checkboxBlendingModes.value 	= LoadBoolSetting("BlendingModes", true);

radioCameraKeys.enabled 		= checkboxImportCamera.value; 
radioCameraRaw.enabled 			= checkboxImportCamera.value;
checkboxPrePostBehaviours.enabled = checkboxTimeRemap.value;
importPanel.active 				= true;

importPanel.center();
importPanel.show();

function SaveAllSettings() {
    SaveSetting("SeqImportMode", dropdownlistSeqImport.selection ? dropdownlistSeqImport.selection.index : 1);
    SaveSetting("SeqSortingMode", dropdownlistSeqSorting.selection ? dropdownlistSeqSorting.selection.index : 0);
    SaveSetting("ImportCamera", checkboxImportCamera.value);
    SaveSetting("CameraMode", radioCameraRaw.value ? 2 : 1);
    SaveSetting("LayerColors", checkboxLayerColors.value);
    SaveSetting("PrePostBehaviours", checkboxPrePostBehaviours.value);
    SaveSetting("TimeRemap", checkboxTimeRemap.value);
    SaveSetting("BlendingModes", checkboxBlendingModes.value);
}

function GetCurrentSettings() {
    var scriptMode = 0;
    if (checkboxImportCamera.value) {
        scriptMode = radioCameraRaw.value ? 2 : 1;
    }
    return {
        mode: scriptMode,
        layerColors: checkboxLayerColors.value,
        prepostBehav: checkboxPrePostBehaviours.value,
        sortingMode: dropdownlistSeqSorting.selection ? dropdownlistSeqSorting.selection.index : 0,
        blending: checkboxBlendingModes.value,
        timing: checkboxTimeRemap.value,
        seqOn: dropdownlistSeqImport.selection ? dropdownlistSeqImport.selection.index : 1
    };
}

checkboxImportCamera.onClick = function() {
    radioCameraKeys.enabled = checkboxImportCamera.value;
    radioCameraRaw.enabled = checkboxImportCamera.value;
    SaveAllSettings();
};

radioCameraKeys.onClick = function() {
    SaveAllSettings();
};

radioCameraRaw.onClick = function() {
    SaveAllSettings();
};

checkboxTimeRemap.onClick = function() {
    checkboxPrePostBehaviours.enabled = checkboxTimeRemap.value;
    SaveAllSettings();
};

checkboxLayerColors.onClick = function() { SaveAllSettings(); };
checkboxBlendingModes.onClick = function() { SaveAllSettings(); };
checkboxPrePostBehaviours.onClick = function() { SaveAllSettings(); };
dropdownlistSeqImport.onChange = function() { SaveAllSettings(); };
dropdownlistSeqSorting.onChange = function() { SaveAllSettings(); };

buttonBrowse.onClick = function() {
    SaveAllSettings();
    var lastFolderStr = LoadSetting("LastFolder", "");
    var initialFolder = (lastFolderStr !== "" && Folder(lastFolderStr).exists) ? Folder(lastFolderStr) : null;
    var settings = GetCurrentSettings();
    
    OpenShotBrowserDialog(initialFolder, settings);
};

//////////////////////////////////////////////////////////////////////////////////////////////
// Progress Bar
var progressWindow = new Window("palette", pbarMessage[lang]["UI::Title"], {x:0, y:0, width:380, height:80}, {closeButton: false});
var progressBar    = progressWindow.add("progressBar", {x:10, y:30, width:360, height:20});
var progressState  = progressWindow.add("statictext",  {x:180, y:30, width:100, height:20}, "0%");
var progressStage  = progressWindow.add("statictext",  {x:12, y:55, width:360, height:20}, "...");
var layerCounter   = 0;

//////////////////////////////////////////////////////////////////////////////////////////////
// Helper Functions

function FileExists(file) {
	if(file == null) {
		return 0;
	}
	if(!file.exists) {
		alert(message[lang]["Error::InvalidFile"] + endl + message[lang]["Error::Interruption"]);
		return 0;
	}
	return 1; 
}

function ColorDistance(R1, G1, B1, R2, G2, B2) {
	return Math.sqrt(Math.pow(R1-R2, 2)+Math.pow(G1-G2, 2)+Math.pow(B1-B2, 2));
}

function SortLinkName( iLink ) {
	var nLinkEntries = iLink.length;
    var names = [];
    	
    for( var i = 0; i < nLinkEntries; i++ ) {
		names.push( iLink[i]["instance-name"] );
		iLink[i].naturalIndex = i;
	}

	names.sort(function (a, b) {
	    if (a === b) {
	        return 0;
	    }
	    if (typeof a === typeof b) {
			if( ( typeof( a ) == "string" && a.match(/^-?\d+$/) ) && 
			    ( typeof( b ) == "string" && b.match(/^-?\d+$/) ) ) {
				return parseFloat(a) < parseFloat(b) ? -1 : 1;
			}
	        return a < b ? -1 : 1;
	    }
	    return typeof a < typeof b ? -1 : 1;
	});

	for( var i = 0; i < nLinkEntries; i++ ) {
		for( var j = 0; j < nLinkEntries; j++ ) {
			if( names[i] == iLink[j]["instance-name"] ) {
				iLink[j].sortedIndex = i;
			}
		}
	}
}

function SortLinkIndex( iLink ) {
	var nLinkEntries = iLink.length;
    for( var i = 0; i < nLinkEntries; i++ ) {
		iLink[i].naturalIndex = i;
		iLink[i].sortedIndex = i;
    }
}

function ExtractAEVersion( iV ) {
	var sub = iV.substring( 0, 2 );
	return parseInt( sub );
}

function ExtractAELanguage( iL ) {
	var sub = iL.substring( 0, 2 );
	return sub;
}

function ReadFromData( iJsonObject, iPath, iDefaultValue ) {
	var splitPath = iPath.split( "." );
	if( splitPath == "" ) {
		return iJsonObject;
	} else {
		if( iJsonObject && iJsonObject.hasOwnProperty( splitPath[0] ) ) {
			var subJsonObject = iJsonObject[splitPath[0]];
			splitPath.shift();
			var recursePath = splitPath.join( "." );
			return ReadFromData( subJsonObject, recursePath, iDefaultValue );
		} else {
			return iDefaultValue;
		}
	}
}

function ReadIntFromData( iJsonObject, iPath, iDefaultValue ) {
	return parseInt( ReadFromData( iJsonObject, iPath, iDefaultValue ) );
}

function ReadFloatFromData( iJsonObject, iPath, iDefaultValue ) {
	return parseFloat( ReadFromData( iJsonObject, iPath, iDefaultValue ) );
}

function ReadStringFromData( iJsonObject, iPath, iDefaultValue ) {
	return ReadFromData( iJsonObject, iPath, iDefaultValue );
}

function ReadArrayFromData( iJsonObject, iPath ) {
	return ReadFromData( iJsonObject, iPath, null );
}

function IsInvalid( iObject, iError ) {
	var isNull = (iObject == null);
	if( isNull ) {
		alert( iError );
	}
	return isNull;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Core Single Shot Import Function
function ImportSingleTVPJson(dataFile, settings, shotIndex, totalShots) {
	var mode 		= settings.mode;
	var colorOn 	= settings.layerColors;
	var prepostOn 	= settings.prepostBehav;
	var sortMode 	= settings.sortingMode;
	var blendingOn 	= settings.blending;
	var timeRemapOn = settings.timing;
	var sequenceOn 	= settings.seqOn;

	var prefix = (totalShots > 1) ? ("[" + (shotIndex + 1) + "/" + totalShots + "] ") : "";

	// Retrieve source directory
	var srcDirPath 	= dataFile.absoluteURI.split( "/" );
	srcDirPath.pop();
	srcDirPath = srcDirPath.join( "/" );

	// Read source file
	dataFile.encoding = "UTF-8";
	dataFile.open( "r" );
	var dataString 	= dataFile.read();
	dataFile.close();
	var dataFileNameWithExtension = File.decode( dataFile.name );
	var dataFileName = dataFileNameWithExtension.split(".")[0];

	progressBar.value = 15;
	progressState.text = "15%";
	progressStage.text = prefix + pbarMessage[lang]["UI::Label::Stage::JSONParse"];
	progressWindow.update();

	// Parse JSON Data
	var dataTree = JSON.parse(dataString);

	// Automatic Comp Naming: Clip_<shotName> (e.g. Clip_0650)
	var compName   		= "Clip_" + dataFileName;
	var compWidth  		= ReadIntFromData( dataTree, "project.clip.width", 800 );
	var compHeight 		= ReadIntFromData( dataTree, "project.clip.height", 600 );
	var compPixelAspect = ReadFloatFromData( dataTree, "project.clip.pixelaspectratio", 1.0 );
	var compFramerate   = ReadFloatFromData( dataTree, "project.clip.framerate", 24.0 );
	var compImageCount  = ReadIntFromData( dataTree, "project.clip.image-count", 1 );
	var compBGR    		= ReadIntFromData( dataTree, "project.clip.bg.red", 255 );
	var compBGG    		= ReadIntFromData( dataTree, "project.clip.bg.green", 255 );
	var compBGB    		= ReadIntFromData( dataTree, "project.clip.bg.blue", 255 );
	var compBGColor  	= [ compBGR , compBGG , compBGB ];
	var compFrameTime 	= parseFloat(1)/compFramerate;
	var compDuration 	= parseFloat(compImageCount) / parseFloat( compFramerate );

	compBGColor[0] 		= compBGColor[0]/255;
	compBGColor[1] 		= compBGColor[1]/255;
	compBGColor[2] 		= compBGColor[2]/255;

	progressBar.value = 25;
	progressState.text = "25%";
	progressStage.text = prefix + pbarMessage[lang]["UI::Label::Stage::RootCompCreation"];
	progressWindow.update();

	app.beginUndoGroup("Import TVPaint JSON - " + dataFileName);

	// Wrapped in try/finally so endUndoGroup() always runs exactly once,
	// even if something below throws (missing camera data, malformed
	// link data, etc.) -- otherwise the undo group is left open forever
	// and corrupts the project's undo stack for the rest of the session.
	try {

	// BUILD root_composition
	var rootFolder 			= app.project.items.addFolder( dataFileName );
	var root_composition 	= app.project.items.addComp(compName,
														compWidth,
														compHeight,
														compPixelAspect,
														compDuration,
														compFramerate);
    root_composition.bgColor 		= compBGColor;
	root_composition.parentFolder 	= rootFolder;

	if( applicationVersion > applicationVersionCS5 )	
		root_composition.openInViewer();
    	
	///////////////
	// BUILD LAYERS
	var layersFolder 			= app.project.items.addFolder("Layers_Compositions");
	layersFolder.parentFolder 	= rootFolder;
	var layersData   			= ReadArrayFromData( dataTree, "project.clip.layers" );
	if( IsInvalid( layersData, message[lang]["Error::MissingData"] ) ) {
		return;
	}

	var nbLayers = layersData.length;
	layerCounter = 0;

	progressBar.value = 35;
	progressState.text = "35%";
	progressStage.text = prefix + pbarMessage[lang]["UI::Label::Stage::CompFolderCreation"];
	progressWindow.update();

	// Loop through layers descending order
	for(var i=nbLayers-1; i>=0; i--) 
	{	
		layerCounter++;
		var progressPct = 35 + Math.round((layerCounter / nbLayers) * 45);
		progressBar.value = progressPct;
		progressState.text = progressPct + "%";
		progressStage.text = prefix + pbarMessage[lang]["UI::Label::Stage::LayerCreation"] + " " + layerCounter + "/" + nbLayers;
		progressWindow.update();

		var currentLayerData  				= layersData[i];
		var layerStart 						= ReadIntFromData( currentLayerData, "start", 0 );
		var layerEnd   						= ReadIntFromData( currentLayerData, "end", 0 ) + 1;

		// Ignore element if it's a folder
		if( layerStart < 0 || layerEnd < 0 )
			continue;
		var layerDuration 					= parseFloat(layerEnd - layerStart) / parseFloat(compFramerate);
		
		var currentLayerFolder 				= app.project.items.addFolder("Sequence_Data_" + ReadStringFromData( currentLayerData, "name", "Undefined") );
		currentLayerFolder.parentFolder 	= layersFolder;

		var layer_sequence = app.project.items.addComp(	"Sequence_Comp_" + ReadStringFromData( currentLayerData, "name", "Undefined"),
														compWidth,
														compHeight,
														compPixelAspect,
														compDuration,
														compFramerate);
		layer_sequence.bgColor 				= compBGColor;
		layer_sequence.parentFolder 		= currentLayerFolder;

		var layer_composition = app.project.items.addComp( 	ReadStringFromData( currentLayerData, "name", "Undefined"),
															compWidth,
															compHeight,
															compPixelAspect,
															compDuration,
															compFramerate);
		layer_composition.bgColor 		= compBGColor;
		layer_composition.parentFolder 	= layersFolder;
		
		////////////
		// LINK DATA
		var link 		= ReadArrayFromData( currentLayerData, "link" );
		if( IsInvalid( link, message[lang]["Error::MissingData"] ) ) {
			return;
		}
		var nbEntries 	= link.length;

		// Sorting the files
		if( sortMode == 0 ) {
			SortLinkIndex( link );
		} else {
			SortLinkName( link );
		}

		var filesArray = [];
		for(var j=0; j<nbEntries; j++) {
			for( k = 0; k < nbEntries; k++ ) {
				if( link[k].sortedIndex == j ) {			            
					var entry = srcDirPath+"/"+ReadStringFromData( link[k], "file", "" );
					filesArray.push(entry);
				}
			}
		}
        
		//////////////
		// MISSING FILE GUARD
		// ImportOptions.file throws on a path that does not resolve, and nothing above
		// catches it, so one absent frame used to abort the whole batch. Check first and
		// skip just this layer, recording it for the end-of-run report.
		var missingCount = 0;
		var firstMissing = "";
		for( var m = 0; m < filesArray.length; m++ ) {
			if( !(new File( filesArray[m] )).exists ) {
				missingCount++;
				if( firstMissing === "" ) {
					firstMissing = filesArray[m];
				}
			}
		}
		if( missingCount > 0 ) {
			AddFileFailure( dataFileName,
							compName,
							ReadStringFromData( currentLayerData, "name", "Undefined" ),
							missingCount,
							filesArray.length,
							firstMissing,
							root_composition,
							rootFolder );
			continue;
		}

		//////////////
		// FILE IMPORT
		if( sequenceOn )
		{
			var input 					= new ImportOptions();
			input.type 					= ImportAsType.FOOTAGE;
			input.file 					= File(filesArray[0]);
			input.sequence 				= true;
			input.forceAlphabetical 	= true;
			var importSeq 				= app.project.importFile(input);
			importSeq.parentFolder 		= currentLayerFolder;
            
			var ext = filesArray[0].split('.').pop();
			if( ext == "tif" || ext == "tiff" ) {
				importSeq.mainSource.alphaMode = AlphaMode.PREMULTIPLIED;
			}
            
			var seqStart 				= 0;
			var seqEnd 					= nbEntries * compFrameTime;
			var seqDuration 			= seqEnd - seqStart;
			importSeq 					= layer_sequence.layers.add( importSeq, seqDuration );
			importSeq.inPoint 			= seqStart;
		}
		else
		{
			for(var j=filesArray.length-1; j>=0; j--)
			{
				var input 					= new ImportOptions();
				input.type 					= ImportAsType.FOOTAGE;
				input.file 					= File(filesArray[j]);
				input.sequence 				= false;
				input.forceAlphabetical 	= false;
				var importImage 			= app.project.importFile(input);
				importImage.parentFolder 	= currentLayerFolder;

				var ext = filesArray[j].split('.').pop();
				if( ext == "tif" || ext == "tiff" ) {
					importImage.mainSource.alphaMode = AlphaMode.PREMULTIPLIED;
				}
                
				var imageStart 				= j * compFrameTime;
				var imageEnd 				= imageStart + compFrameTime;
				var imageDuration 			= imageEnd - imageStart;
				importImage 				= layer_sequence.layers.add(importImage, imageDuration);
				importImage.inPoint 		= imageStart;
			}
		}
		
		///////////////////////////////////
		// BUILD CURRENT LAYER IN MAIN COMP
		var seq 		= layer_composition.layers.add( layer_sequence );
		seq.enabled 	= true;
		seq.inPoint 	= 0;
		seq.outPoint 	= nbEntries * compFrameTime;

		var layer 		= root_composition.layers.add(layer_composition);
		layer.enabled 	= ReadStringFromData( currentLayerData, "visible", "true" );
		layer.inPoint 	= layerStart * compFrameTime;
		layer.outPoint 	= layerEnd * compFrameTime;

		//////////////
		// LABEL COLOR
		if( colorOn )
		{
			var layLR = ReadIntFromData( currentLayerData, "group.red", 0 );
			var layLG = ReadIntFromData( currentLayerData, "group.green", 0 );
			var layLB = ReadIntFromData( currentLayerData, "group.blue", 0 );
			var smallestDistance = 1000;
			var matchingLabel = 0;
			for(var k=0; k<=16; k++)
			{
				var currentDistance = ColorDistance( colorLabels[k][0], colorLabels[k][1], colorLabels[k][2], layLR, layLG, layLB );
				if(currentDistance < smallestDistance)
				{
					smallestDistance = currentDistance;
					matchingLabel = k;
				}
			}
			layer.label = matchingLabel;
		}

		//////////////
		// OPACITY
		layer.opacity.setValue( ReadFloatFromData( currentLayerData, "opacity", 255 ) / 255 * 100 );

		//////////////////////////////
		// CONVERT LAYER BLENDING MODE
        if( blendingOn )
		{
			var currentBlendingMode = ReadStringFromData( currentLayerData, "blending-mode", "" );
			var blendingModeSupported = true;
			var result = BlendingMatch[ currentBlendingMode ];
			if( typeof result === 'undefined' ) {
				blendingModeSupported = false;
			}

			if( blendingModeSupported ) {
				layer.blendingMode = BlendingMatch[ currentBlendingMode ];
			} else {
				layer.blendingMode = BlendingMode.NORMAL;

				// A layer with no "blending-mode" entry at all is not an anomaly -- Normal
				// is the correct result -- so only a named, unconvertible mode is reported.
				if( currentBlendingMode !== "" ) {
					// The label is recorded, not changed: flagging is offered in the
					// report at the end of the run, where the user can see what it affects.
					AddImportWarning( 	dataFileName,
										compName,
										ReadStringFromData( currentLayerData, "name", "Undefined" ),
										currentBlendingMode,
										Msg( "Blending::Normal", "Normal" ),
										layer,
										layer.label );
				}
			}
		}
		
		////////////////////////////
		// BUILD TIMELINE TIME REMAP		
		if( timeRemapOn )
		{
			layer.timeRemapEnabled = true;

			for(var j=0; j<nbEntries; j++)
			{
				var nOccurences = link[j].images.length;

				for(var k=0; k<nOccurences; k++)
				{
					var oc = link[j].images[k];
					var index = layer.timeRemap.addKey( oc * compFrameTime );
					var value = link[j].sortedIndex;

					layer.timeRemap.setValueAtKey( index, value*compFrameTime );
					layer.timeRemap.setInterpolationTypeAtKey(index,KeyframeInterpolationType.HOLD);
				}
			}
    
			if(layer.inPoint 	!= 0) layer.timeRemap.removeKey(1);
			if(layer.outPoint	!= compDuration) layer.timeRemap.removeKey(layer.timeRemap.numKeys);
			
			////////////////////////
			// PRE / POST BEHAVIOURS
			if( prepostOn )
			{
				var currentPreBehavior 	= ReadIntFromData( currentLayerData, "pre-behavior", 0 );
				var currentPostBehavior = ReadIntFromData( currentLayerData, "post-behavior", 0 );

				//HOLD
				if( currentPreBehavior == 3 )
					layer.inPoint = 0;

				if(currentPostBehavior == 3 )
					layer.outPoint = compDuration;
			
				//NONE
				if( currentPreBehavior == 0 )
					layer.inPoint = layerStart * compFrameTime;
				
				if( currentPostBehavior == 0 )
					layer.outPoint = layerEnd * compFrameTime;
			
				//LOOP
				if( currentPreBehavior == 1 && currentPostBehavior == 1 )
				{
					var lastkeyduration = layerEnd - layer.timeRemap.keyTime( layer.timeRemap.numKeys ) / compFrameTime;
					layer.inPoint 				= 0;
					layer.outPoint 				= compDuration;
					layer.timeRemap.expression = [
						'lastkeyduration = '+ lastkeyduration.toString() +';',
						'epsilon = 0.001;',
						'',
						'tval = time;',
						'tstart = key(1).time;',
						'tend_pre = key(numKeys).time + lastkeyduration * thisComp.frameDuration + epsilon;',
						'tend_post = key(numKeys).time + lastkeyduration * thisComp.frameDuration - epsilon;',
						'',
						'if (tval < tstart )',
						'{',
						'	tspan = tend_pre - tstart;',
						'',
						'	while( tval < tstart )',
						'		tval += tspan;',
						'',
						'}',
						'else if( tval > tend_post )',
						'{',
						'	tspan = tend_post - tstart',
						'',
						'	while( tval > tend )',
						'		tval -= tspan;',
						'',
						'}',
						'',
						'valueAtTime( tval )',
						'',
					].join('\n');
				}
				else if( currentPreBehavior == 1 )
				{
					layer.inPoint = 0;
					layer.outPoint = layerEnd * compFrameTime;
					layer.timeRemap.expression = [
						'epsilon = 0.001;',
						'',
						'tval = time;',
						'tstart = key(1).time;',
						'',
						'if( tval < tstart )',
						'{',
						'	tend = thisLayer.outPoint + epsilon;',
						'	tspan = tend - tstart;',
						'',
						'	while( tval < tstart )',
						'		tval += tspan;',
						'',
						'}',
						'',
						'valueAtTime( tval )',
						'',
					].join('\n');
				}
				else if( currentPostBehavior == 1 )
				{
					var lastkeyduration = layerEnd - layer.timeRemap.keyTime( layer.timeRemap.numKeys ) / compFrameTime;
					layer.inPoint 				= layerStart * compFrameTime;
					layer.outPoint 				= compDuration;
					layer.timeRemap.expression = [
						'lastkeyduration = '+ lastkeyduration.toString() +';',
						'epsilon = 0.001;',
						'',
						'tval = time;',
						'tend = key(numKeys).time + lastkeyduration * thisComp.frameDuration - epsilon;',
						'',
						'if(tval > tend )',
						'{',
						'	tstart= key(1).time;',
						'	tspan = tend - tstart',
						'',
						'	while( tval > tend )',
						'		tval -= tspan;',
						'',
						'}',
						'',
						'	valueAtTime( tval )',
						'',
					].join('\n');
				}
			
				//PING-PONG
				if( currentPreBehavior == 2 && currentPostBehavior == 2 )
				{
					layer.inPoint 				= 0;
					layer.outPoint 				= compDuration;
					layer.timeRemap.expression 	= 'if (time > key(1).time) { loopOut("pingpong",0) } else { loopIn("pingpong",0) }';
				}
				else if( currentPreBehavior == 2 )
				{
					layer.inPoint 				= 0;
					layer.outPoint 				= layerEnd * compFrameTime;
					layer.timeRemap.expression 	= 'loopIn("pingpong",0)';
				}
				else if( currentPostBehavior == 2 )
				{
					layer.inPoint 				= layerStart * compFrameTime;
					layer.outPoint 				= compDuration;
					layer.timeRemap.expression 	= 'loopOut("pingpong",0)';
				}
			}
		}
	} // END OF BUILD LAYERS

	///////////////
	// BUILD CAMERA
	if(	mode == 1 || mode == 2 )
	{
		progressBar.value = 85;
		progressState.text = "85%";
		progressStage.text = prefix + pbarMessage[lang]["UI::Label::Stage::Camera"];
		progressWindow.update();

		var camWidth  				= ReadIntFromData( dataTree, "project.camera.width", 800 );
		var camHeight 				= ReadIntFromData( dataTree, "project.camera.height", 600 );
		var camPixelAspect 			= ReadFloatFromData( dataTree, "project.camera.pixelaspectratio", 1.0 );
		var camFramerate   			= ReadFloatFromData( dataTree, "project.camera.framerate", 24.0 );
		var camFrameTime 			= parseFloat(1)/camFramerate;
		var camDuration 			= parseFloat(compImageCount) / parseFloat(camFramerate);
		var cameraComp = app.project.items.addComp("Camera_Composition",
												camWidth,
												camHeight,
												camPixelAspect,
												camDuration,
												camFramerate);
		cameraComp.bgColor 			= compBGColor;
		cameraComp.parentFolder 	= rootFolder;

		var rootCompLayer 			= cameraComp.layers.add(root_composition);
		rootCompLayer.threeDLayer 	= true;
		rootCompLayer.property("Position").setValue([root_composition.width/2, root_composition.height/2, 0]);
		var cameraLayer  			= cameraComp.layers.addCamera("Camera", [camWidth, camHeight]);
		cameraLayer.inPoint 		= 0;
        cameraLayer.outPoint       	= camDuration;

		cameraLayer.property("Position").setValue([camWidth/2,camHeight/2,-1000]);
		cameraLayer.property("Point of Interest").setValue([camWidth/2,camHeight/2,0]);
		cameraLayer.property("Zoom").setValue(1000);

		if( applicationVersion > applicationVersionCS5 )
			cameraComp.openInViewer();

		// CAM KEY VALUES (mode 1)
		if(mode == 1)
		{
			var cameraData = ReadArrayFromData( dataTree, "project.clip.camera", null );
			var keys = ReadArrayFromData( cameraData, "points", null );

			for(var i=0; i<keys.length; i++)
			{
				var step;
				if(keys.length<=1) {
					step = 0;
				} else {
					step = (i)/(keys.length-1);
				}

				var t = parseFloat( step * ( cameraComp.duration - camFrameTime ) );
				var key = keys[i];
				
				cameraLayer.property("Position").setValueAtTime(t,[key.x,key.y,-1000*key.scale]);
				cameraLayer.property("Point of Interest").setValueAtTime(t,[key.x,key.y,0]);
				cameraLayer.property("Rotation").setValueAtTime(t,-key.angle);
			}
		}

		// CAM RAW VALUE (mode 2)
		if(mode == 2)
		{
			var cameraData = ReadArrayFromData( dataTree, "project.clip.camera", null );
			var positions = ReadArrayFromData( cameraData, "positions", null );

			for(var i=0; i<positions.length; i++)
			{
				var step;
				if(positions.length<=1) {
					step = 0;
				} else {
					step = (i)/(positions.length-1);
				}
				
				var t = parseFloat( step * ( cameraComp.duration - ( camFrameTime * 2 ) ) );
				var point = positions[i];

				cameraLayer.property("Position").setValueAtTime(t,[point.x,point.y,-1000*point.scale]);
				cameraLayer.property("Point of Interest").setValueAtTime(t,[point.x,point.y,0]);
				cameraLayer.property("Rotation").setValueAtTime(t,-point.angle);
			}
			var lastInstant = cameraComp.duration - camFrameTime;
			var keys = ReadArrayFromData( cameraData, "points", null );
			var lastKey = keys[ keys.length-1 ];
			cameraLayer.property("Position").setValueAtTime(lastInstant,[lastKey.x,lastKey.y,-1000*lastKey.scale]);
			cameraLayer.property("Point of Interest").setValueAtTime(lastInstant,[lastKey.x,lastKey.y,0]);
			cameraLayer.property("Rotation").setValueAtTime(lastInstant,-lastKey.angle);
		}

		// SET INTERPOLATION TYPE AT KEY (LINEAR / BEZIER)
		for(var k=1; k<cameraLayer.property("Position").numKeys; k++)
		{
			if(cameraData.mode==0) {
				cameraLayer.property("Position").setInterpolationTypeAtKey(k,KeyframeInterpolationType.LINEAR);
				cameraLayer.property("Point of Interest").setInterpolationTypeAtKey(k,KeyframeInterpolationType.LINEAR);
				cameraLayer.property("Rotation").setInterpolationTypeAtKey(k,KeyframeInterpolationType.LINEAR);
			} else {
				cameraLayer.property("Position").setInterpolationTypeAtKey(k,KeyframeInterpolationType.BEZIER);
				cameraLayer.property("Point of Interest").setInterpolationTypeAtKey(k,KeyframeInterpolationType.BEZIER);
				cameraLayer.property("Rotation").setInterpolationTypeAtKey(k,KeyframeInterpolationType.BEZIER);
			}
		}
		
	} // END OF BUILD CAMERA

	} finally {
		app.endUndoGroup();
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Import Warning Report
//
// Shown once, after every shot in the batch has been processed, so that an unattended
// multi-shot import is never held up waiting for a click.

// Height for a listbox holding iRows rows, clamped between a minimum and a maximum
// so the dialog neither opens mostly empty nor grows past the screen.
function RowsToPixels( iRows, iMin, iMax, iHasHeader ) {
    var rows = iRows;
    if( rows < iMin ) rows = iMin;
    if( rows > iMax ) rows = iMax;
    return rows * 19 + ( iHasHeader ? 26 : 8 );
}

function ShowWarningReport( iSettings ) {
    if( importWarnings.length === 0 && importFileFailures.length === 0 ) return;

    var groups    = GroupWarningsByMode( importWarnings );
    var shotCount = CountWarnedShots( importWarnings );

    // Distinct shots that lost layers entirely. Needed by the header as well as by
    // the section further down, so it is worked out once here.
    var failShots = [];
    for( var fs = 0; fs < importFileFailures.length; fs++ ) {
        var seenF = false;
        for( var q = 0; q < failShots.length; q++ ) {
            if( failShots[q] === importFileFailures[fs].shot ) {
                seenF = true;
                break;
            }
        }
        if( !seenF ) {
            failShots.push( importFileFailures[fs].shot );
        }
    }

    // Marks ONLY the layers still sitting on the fallback mode. A layer whose mode has
    // been reassigned is no longer a problem, so it gets the label it came in with
    // back -- as does every layer when the option is switched off.
    function ApplyRedFlags( iOn ) {
        app.beginUndoGroup( Msg("UI::Report::FlagUndo", "TVPaint Import -- Flag Affected Layers") );
        try {
            for( var i = 0; i < importWarnings.length; i++ ) {
                var wRec = importWarnings[i];
                if( !wRec.layerRef ) continue;
                try {
                    if( iOn && !wRec.resolved ) {
                        wRec.layerRef.label = 1;	// 1 = Red, per the colorLabels table.
                    } else if( wRec.originalLabel !== undefined ) {
                        wRec.layerRef.label = wRec.originalLabel;
                    }
                } catch(eLabel) {}
            }

            // A failed shot has no layer to mark, so its composition and project
            // folder are marked instead -- those are what has to be re-imported.
            for( var fi = 0; fi < importFileFailures.length; fi++ ) {
                var fRec2 = importFileFailures[fi];
                try {
                    if( fRec2.compRef ) {
                        fRec2.compRef.label = iOn ? 1
                                            : ( fRec2.compLabel !== undefined ? fRec2.compLabel : 0 );
                    }
                    if( fRec2.folderRef ) {
                        fRec2.folderRef.label = iOn ? 1
                                              : ( fRec2.folderLabel !== undefined ? fRec2.folderLabel : 0 );
                    }
                } catch(eItem) {}
            }
        } finally {
            app.endUndoGroup();
        }
    }

    // Resizeable: a 100-shot import can produce hundreds of rows, and a fixed height
    // would make the table a letterbox. The detail list absorbs any extra height.
    var win = new Window("dialog", Msg("UI::Report::Title", "Import Report") + " -- v." + scriptVersion_XX,
                         undefined, {resizeable: true});
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 12;

    // --- Headline & explanation ---
    // Grouped in a panel so the visual hierarchy does not depend on the bold font
    // being honoured, which varies between After Effects builds.
    var headPanel = win.add("panel");
    headPanel.orientation = "column";
    headPanel.alignChildren = ["fill", "top"];
    headPanel.margins = 10;
    headPanel.spacing = 6;

    var txtHeadline = headPanel.add("statictext", undefined,
        FormatMessage( Msg("UI::Report::Headline",
                           "%1 layer(s) across %2 shot(s) use blending modes that After Effects cannot reproduce."),
                       [ importWarnings.length, shotCount ] ),
        {multiline: true});
    txtHeadline.preferredSize = [640, 30];
    try {
        var headGfx = txtHeadline.graphics;
        headGfx.font = ScriptUI.newFont( headGfx.font.name, ScriptUI.FontStyle.BOLD, headGfx.font.size + 1 );
    } catch(e) {}

    var txtIntro = headPanel.add("statictext", undefined,
        Msg("UI::Report::Intro", "The import completed. These layers were set to Normal -- review them before validation."),
        {multiline: true});
    txtIntro.preferredSize = [640, 16];

    // A failed import is a different order of problem from a substituted blending
    // mode -- the artwork is simply not in the project -- so it is called out in the
    // header rather than only in the section below.
    if( importFileFailures.length > 0 ) {
        var txtAlert = headPanel.add("statictext", undefined,
            FormatMessage( Msg("UI::Report::FilesAlert",
                               "!  %1 layer(s) in %2 shot(s) did NOT import. Those shots will need re-importing."),
                           [ importFileFailures.length, failShots.length ] ),
            {multiline: true});
        txtAlert.preferredSize = [640, 18];
        try {
            var gfx = txtAlert.graphics;
            gfx.foregroundColor = gfx.newPen( gfx.PenType.SOLID_COLOR, [0.95, 0.45, 0.25, 1], 1 );
            gfx.font = ScriptUI.newFont( gfx.font.name, ScriptUI.FontStyle.BOLD, gfx.font.size );
        } catch(eAlert) {}
    }


    // --- Summary grouped by blending mode ---
    win.add("statictext", undefined, Msg("UI::Report::GroupTitle", "Summary by blending mode:"));
    var summaryList = win.add("listbox", undefined, []);
    summaryList.preferredSize = [660, RowsToPixels( groups.length, 1, 6, false )];
    summaryList.alignment = ["fill", "top"];

    // Regrouped from the live warning records, so reassigning a mode is reflected here
    // instead of leaving the summary contradicting the table below it.
    function RefreshSummary() {
        groups = GroupWarningsByMode( importWarnings );
        summaryList.removeAll();
        for( var g = 0; g < groups.length; g++ ) {
            summaryList.add("item",
                FormatMessage( Msg("UI::Report::GroupLine", "%1  ->  %2   :   %3 layer(s) in %4 shot(s)"),
                               [ groups[g].requested, groups[g].applied,
                                 groups[g].count, groups[g].shots.length ] ));
        }
    }
    RefreshSummary();

    // --- Per-layer detail ---
    win.add("statictext", undefined, Msg("UI::Report::Details", "Affected layers:"));
    var detailList = win.add("listbox", undefined, [], {
        multiselect: true,
        numberOfColumns: 5,
        showHeaders: true,
        columnTitles: [ Msg("UI::Report::ColShot",    "Shot"),
                        Msg("UI::Report::ColComp",    "Composition"),
                        Msg("UI::Report::ColLayer",   "Layer"),
                        Msg("UI::Report::ColMode",    "TVPaint Mode"),
                        Msg("UI::Report::ColApplied", "Applied in AE") ],
        columnWidths: [ 90, 150, 160, 140, 110 ]
    });
    detailList.preferredSize = [660, RowsToPixels( importWarnings.length, 5, 12, true )];
    detailList.minimumSize = [400, RowsToPixels( 4, 4, 4, true )];
    detailList.maximumSize = [4000, 3000];	// or ScriptUI caps growth at the preferred height
    detailList.alignment = ["fill", "fill"];

    // Rebuilt from the warning records rather than by poking individual cells, so the
    // table cannot drift out of step with the data after a mode is reassigned.
    function RefreshDetail() {
        detailList.removeAll();
        for( var i = 0; i < importWarnings.length; i++ ) {
            var w = importWarnings[i];
            var row = detailList.add("item", w.shot);
            row.subItems[0].text = w.comp;
            row.subItems[1].text = w.layer;
            row.subItems[2].text = w.requested;
            row.subItems[3].text = w.applied;
        }
    }
    RefreshDetail();

    // --- Reassign the mode on the real layers ---
    var choices = BuildBlendingModeChoices();
    var fixGroup = win.add("group");
    fixGroup.orientation = "row";
    fixGroup.alignChildren = ["left", "center"];
    fixGroup.add("statictext", undefined, Msg("UI::Report::FixLabel", "Set selected layer(s) to:"));

    var modeLabels = [];
    for( var c = 0; c < choices.length; c++ ) {
        modeLabels.push( choices[c].label );
    }
    var ddMode = fixGroup.add("dropdownlist", undefined, modeLabels);
    ddMode.preferredSize = [180, 24];
    if( ddMode.items.length > 0 ) {
        ddMode.selection = 0;
    }
    var btnApply = fixGroup.add("button", undefined, Msg("UI::Report::ApplyBtn", "Apply to Selected"));
    btnApply.preferredSize = [160, 24];

    // Clicking a summary row selects every detail row using that blending mode, so a
    // whole mode can be reassigned in one step.
    summaryList.onChange = function() {
        if( summaryList.selection === null ) return;
        var g = groups[ summaryList.selection.index ];
        var picked = [];
        for( var r = 0; r < detailList.items.length; r++ ) {
            if( importWarnings[r].requested === g.requested ) {
                picked.push( detailList.items[r] );
            }
        }
        detailList.selection = picked;
    };

    btnApply.onClick = function() {
        var sel = detailList.selection;
        if( sel === null || (sel instanceof Array && sel.length === 0) ) {
            alert( Msg("UI::Report::FixNone", "Select one or more rows first.") );
            return;
        }
        if( !(sel instanceof Array) ) {
            sel = [sel];
        }
        if( ddMode.selection === null ) return;
        var choice = choices[ ddMode.selection.index ];

        // Resolve the row indices up front: the lists are rebuilt below, which
        // invalidates the ListItem objects held in "sel".
        var targets = [];
        for( var t = 0; t < sel.length; t++ ) {
            targets.push( sel[t].index );
        }

        var changed = 0;
        var failed  = 0;
        app.beginUndoGroup( Msg("UI::Report::UndoName", "TVPaint Import -- Change Blending Modes") );
        try {
            for( var i = 0; i < targets.length; i++ ) {
                var warning = importWarnings[ targets[i] ];
                if( !warning || !warning.layerRef ) {
                    failed++;
                    continue;
                }
                var applied = false;
                try {
                    warning.layerRef.blendingMode = choice.mode;
                    // Read the value back: assigning a mode this build does not accept
                    // can silently do nothing, and reporting that as success would be a lie.
                    applied = ( warning.layerRef.blendingMode === choice.mode );
                } catch(eLayer) {
                    applied = false;
                }
                if( applied ) {
                    warning.applied  = choice.label;
                    warning.resolved = true;
                    changed++;
                } else {
                    failed++;
                }
            }
        } finally {
            app.endUndoGroup();
        }

        // A resolved layer is no longer flagged, so refresh the labels either way.
        ApplyRedFlags( chkFlag.value );
        RefreshDetail();
        RefreshSummary();

        if( changed > 0 ) {
            alert( FormatMessage( Msg("UI::Report::FixDone", "%1 layer(s) set to %2."),
                                  [ changed, choice.label ] ) );
        }
        if( failed > 0 ) {
            alert( FormatMessage( Msg("UI::Report::FixFailed",
                                      "%1 layer(s) could not be changed -- the import may have been undone."),
                                  [ failed ] ) );
        }
    };

    // --- Failed imports: separate, and framed, because these layers are simply absent ---
    if( importFileFailures.length > 0 ) {
        var failPanel = win.add("panel", undefined,
            Msg("UI::Report::FilesTitle", "FAILED IMPORTS -- these layers are not in the project"));
        failPanel.orientation = "column";
        failPanel.alignChildren = ["fill", "top"];
        failPanel.margins = 10;
        failPanel.spacing = 6;
        failPanel.alignment = ["fill", "fill"];
        failPanel.maximumSize = [4000, 3000];

        var txtFiles = failPanel.add("statictext", undefined,
            FormatMessage( Msg("UI::Report::FilesHeadline",
                               "%1 layer(s) in %2 shot(s) were skipped: their image files were not found."),
                           [ importFileFailures.length, failShots.length ] ),
            {multiline: true});
        txtFiles.preferredSize = [630, 16];

        var failList = failPanel.add("listbox", undefined, [], {
            numberOfColumns: 4,
            showHeaders: true,
            columnTitles: [ Msg("UI::Report::ColShot",    "Shot"),
                            Msg("UI::Report::ColComp",    "Composition"),
                            Msg("UI::Report::ColLayer",   "Layer"),
                            Msg("UI::Report::ColMissing", "Missing frames") ],
            columnWidths: [ 90, 150, 190, 200 ]
        });
        failList.preferredSize = [630, RowsToPixels( importFileFailures.length, 6, 16, true )];
        failList.minimumSize = [400, RowsToPixels( 4, 4, 4, true )];
        failList.maximumSize = [4000, 3000];
        failList.alignment = ["fill", "fill"];
        for( var ff = 0; ff < importFileFailures.length; ff++ ) {
            var fRec = importFileFailures[ff];
            var fRow = failList.add("item", fRec.shot);
            fRow.subItems[0].text = fRec.comp;
            fRow.subItems[1].text = fRec.layer;
            fRow.subItems[2].text = ( fRec.total > 0 )
                                  ? ( fRec.missing + " / " + fRec.total + "   " + fRec.first )
                                  : fRec.first;
        }
    }

    // Last control before the buttons, because it acts on everything above it:
    // unresolved layers get a red label, and a failed shot's composition and folder
    // are marked too. Off by default -- the label it overwrites carries the TVPaint
    // group colour.
    var flagGroup = win.add("group");
    flagGroup.orientation = "row";
    flagGroup.alignChildren = ["left", "center"];
    var chkFlag = flagGroup.add("checkbox", undefined,
        Msg("UI::Report::Flagged", "Label unresolved layers Red (still set to Normal)"));
    chkFlag.value = LoadBoolSetting("FlagWarnings", false);
    chkFlag.onClick = function() {
        SaveSetting("FlagWarnings", chkFlag.value);
        ApplyRedFlags( chkFlag.value );
    };

    // --- Actions ---
    var actionGroup = win.add("group");
    actionGroup.orientation = "row";
    actionGroup.alignChildren = ["left", "center"];
    var btnSaveLog = actionGroup.add("button", undefined, Msg("UI::Report::SaveLog", "Save Log..."));
    btnSaveLog.preferredSize = [160, 26];
    btnSaveLog.alignment = ["left", "center"];
    var spacer = actionGroup.add("group");
    spacer.alignment = ["fill", "fill"];
    var btnClose = actionGroup.add("button", undefined, Msg("UI::Report::Close", "Close"), {name:"ok"});
    btnClose.preferredSize = [264, 30];	// ~40% of the 660px content width
    btnClose.alignment = ["right", "center"];

    btnSaveLog.onClick = function() { SaveWarningLog( iSettings ); };
    btnClose.onClick   = function() { win.close(); };

    // Re-run the layout on every drag so the tables follow the window.
    win.onResizing = win.onResize = function() {
        try { this.layout.resize(); } catch(eResize) {}
    };
    win.minimumSize = [560, 420];

    if( chkFlag.value ) {
        ApplyRedFlags( true );
    }

    win.center();
    win.show();
}

// Writes the collected warnings to a plain text file so the summary stays actionable
// after the dialog is dismissed.
function SaveWarningLog( iSettings ) {
    if( importWarnings.length === 0 ) return;

    var now = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var stamp = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate())
              + "_" + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

    var suggested = new File( Folder.desktop.fsName + "/TVPaint_Import_Warnings_" + stamp + ".txt" );
    var target = suggested.saveDlg( Msg("UI::Report::SaveTitle", "Save Warning Log") );
    if( target === null ) return;

    if( WriteWarningLog( target, iSettings ) ) {
        alert( Msg("UI::Report::Saved", "Log saved:") + endl + target.fsName );
    } else {
        alert( Msg("UI::Report::SaveFailed", "Could not write the log file.") );
    }
}

// Writes the collected warnings to iFile. Separate from the file picker above so the
// output can be produced without a dialog. Returns true on success.
function WriteWarningLog( iFile, iSettings ) {
    var now       = new Date();
    var target    = iFile;
    var groups    = GroupWarningsByMode( importWarnings );
    var shotCount = CountWarnedShots( importWarnings );
    var rule      = "--------------------------------------------------------------------------";

    target.encoding = "UTF-8";
    if( !target.open("w") ) {
        return false;
    }

    target.writeln( Msg("Log::Title", "TVPaint 12 -> After Effects : Import Warning Report") );
    target.writeln( rule );
    target.writeln( Msg("Log::Generated", "Generated:") + " " + FormatDate( now ) );
    target.writeln( "v." + scriptVersion_XX );
    target.writeln( "" );
    target.writeln( FormatMessage( Msg("UI::Report::Headline",
                                       "%1 layer(s) across %2 shot(s) use blending modes that After Effects cannot reproduce."),
                                   [ importWarnings.length, shotCount ] ) );
    target.writeln( Msg("UI::Report::Intro",
                        "The import completed. These layers were set to Normal -- review them before validation.") );
    if( iSettings && iSettings.flagWarnings === true ) {
        target.writeln( Msg("UI::Report::Flagged", "These layers have been given a Red label in their compositions.") );
    }
    target.writeln( "" );
    target.writeln( Msg("UI::Report::GroupTitle", "Summary by blending mode:") );
    target.writeln( rule );
    for( var g = 0; g < groups.length; g++ ) {
        target.writeln( "  " + FormatMessage( Msg("UI::Report::GroupLine", "%1  ->  %2   :   %3 layer(s) in %4 shot(s)"),
                                              [ groups[g].requested, groups[g].applied,
                                                groups[g].count, groups[g].shots.length ] ) );
    }
    target.writeln( "" );
    target.writeln( Msg("UI::Report::Details", "Affected layers:") );
    target.writeln( rule );

    // Grouped by shot, so the log reads the way the project panel is organised.
    var lastShot = null;
    for( var i = 0; i < importWarnings.length; i++ ) {
        var w = importWarnings[i];
        if( w.shot !== lastShot ) {
            if( lastShot !== null ) target.writeln( "" );
            target.writeln( Msg("Log::Shot", "Shot:") + " " + w.shot + "   [" + w.comp + "]" );
            lastShot = w.shot;
        }
        target.writeln( "    " + w.layer + "   " + w.requested + "  ->  " + w.applied );
    }

    if( importFileFailures.length > 0 ) {
        target.writeln( "" );
        target.writeln( Msg("UI::Report::FilesHeadline",
                            "Layers skipped: their image files were not found.") );
        target.writeln( rule );
        for( var ff = 0; ff < importFileFailures.length; ff++ ) {
            var fRec = importFileFailures[ff];
            target.writeln( "  " + fRec.shot + " | " + fRec.comp + " | " + fRec.layer );
            target.writeln( "      " + ( fRec.total > 0
                            ? ( fRec.missing + " of " + fRec.total + " frames missing, first: " + fRec.first )
                            : fRec.first ) );
        }
    }

    target.close();
    return true;
}


//////////////////////////////////////////////////////////////////////////////////////////////
// Batch / Multi-file Execution Controller
function ExecuteImport(jsonFiles, settings) {
    if (!jsonFiles || jsonFiles.length === 0) return;

    ResetImportWarnings();

    var totalShots = jsonFiles.length;

    progressWindow.center();
    progressWindow.show();
    progressWindow.update();

    // try/finally so a shot that throws cannot leave the progress palette on screen.
    // It is created with closeButton:false, so a stranded one cannot be dismissed by
    // hand and looks like After Effects has hung.
    try {
        for (var s = 0; s < totalShots; s++) {
            var dataFile = jsonFiles[s];
            if (!dataFile.exists) continue;

            // One bad shot should cost that shot, not every shot after it.
            try {
                ImportSingleTVPJson(dataFile, settings, s, totalShots);
            } catch (eShot) {
                AddFileFailure( dataFile.name.replace(/\.json$/i, ""),
                                "--",
                                "--",
                                0,
                                0,
                                eShot.message );
            }
        }

        progressBar.value = 100;
        progressState.text = "100%";
        progressStage.text = pbarMessage[lang]["UI::Label::Stage::Success"];
        progressWindow.update();
        $.sleep(500);
    } finally {
        progressWindow.close();
    }

    if( importWarnings.length > 0 || importFileFailures.length > 0 ) {
        ShowWarningReport( settings );
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Legacy Run function (Backwards Compatibility)
function Run(mode, colorOn, prepostOn, sortMode, blendingOn, timeRemapOn, sequenceOn) {
    var settings = {
        mode: mode,
        layerColors: colorOn,
        prepostBehav: prepostOn,
        sortingMode: sortMode,
        blending: blendingOn,
        timing: timeRemapOn,
        seqOn: sequenceOn
    };
    var dataFile = File.openDialog( message[lang]["FileBrowser::Info"], "JSON Files:*.json", false );
    if (!dataFile || !FileExists(dataFile)) return;
    importPanel.close();
    ExecuteImport([dataFile], settings);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Expose Headless API Globally for Automation / External Batch Scripts
$.global.ImportTVPaintJSON = function(fileOrPath, customSettings) {
    var f = (typeof fileOrPath === "string") ? File(fileOrPath) : fileOrPath;
    if (!f || !f.exists) return false;
    
    var defaultSettings = {
        mode: 0,
        layerColors: true,
        prepostBehav: true,
        sortingMode: 0,
        blending: true,
        timing: true,
        seqOn: 1
    };
    
    var finalSettings = customSettings || defaultSettings;

    // Automation must never be interrupted by a dialog, so no report is shown here.
    // The collected warnings are published for the caller to inspect instead.
    ResetImportWarnings();
    ImportSingleTVPJson(f, finalSettings, 0, 1);
    $.global.ImportTVPaintJSONWarnings = importWarnings;
    return true;
};
