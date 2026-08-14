//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Title: Import TVPaint Animation Clip Structure to After Effects
//
// Author: Clément Berthaud for TVPaint Developpement
// Edits by Matthieu Tragno, Kévin Lobjois, Antigravity & Contributors
// Version: 7.1.1 -- IMPORTANT -- Update the scriptVersion vars when changing the script's version number
// JSON object, stringify and parse methods from Douglas Crockford (Public Domain)
// Last Edited on 14/08/2026:
// -Default Sequence Import Mode set to "Native Sequence"
// -Implemented settings persistence across AE sessions via app.settings
// -Added "Browse Folder..." mode with automatic shot JSON discovery & batch processing
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

var scriptLastEdit_FR		= " -- 14/08/2026 --";
var scriptLastEdit_LOC		= " -- 2026/08/14 --";

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
message_fr["Error::NoJSONFound"] 			= "Aucun fichier .JSON correspondant trouvé dans le dossier :";
message_fr["FileBrowser::Info"] 			= "Sélectionner un fichier .JSON";
message_fr["FolderBrowser::Info"] 			= "Sélectionner un dossier de plan (Shot) ou un dossier parent";
message_fr["UI::Title"] 					= "Import TVPaint 12 -- v."+scriptVersion_XX+scriptLastEdit_FR;
message_fr["UI::Camera::Import"] 			= "Caméra";
message_fr["UI::Camera::Key"] 				= "Coordonnées des Clés";
message_fr["UI::Camera::Raw"] 				= "Coordonnées de la Vue Caméra";
message_fr["UI::Label::Info"] 				= "Importer un projet depuis TVPaint.";
message_fr["UI::Label::BrowseJSON"] 		= "Parcourir JSON...";
message_fr["UI::Label::BrowseFolder"] 		= "Parcourir Dossier...";
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

var message_en = [];
message_en["Error::Interruption"] 			= "Exit Script.";
message_en["Error::Cancellation"] 			= "Script Canceled.";
message_en["Error::InvalidLocation"] 		= "Invalid Location.";
message_en["Error::InvalidFile"] 			= "Cannot read file: ";
message_en["Error::MissingFiles"] 			= "Files are missing from project location.";
message_en["Error::MissingData"] 			= "Data missing from file:";
message_en["Error::MissingLayers"] 			= "No layers found, project is empty.";
message_en["Error::BadBlendingMode"] 		= "Blending mode conversion not supported";
message_en["Error::NoJSONFound"] 			= "No matching .JSON file found in the selected folder:";
message_en["FileBrowser::Info"] 			= "Select a .JSON file.";
message_en["FolderBrowser::Info"] 			= "Select a Shot Folder (or Parent Batch Folder)";
message_en["UI::Title"] 					= "Import TVPaint 12 -- v. "+scriptVersion_XX+scriptLastEdit_LOC;
message_en["UI::Camera::Import"] 			= "Import Camera";
message_en["UI::Camera::Key"] 				= "Key Coordinates";
message_en["UI::Camera::Raw"] 				= "Camera View Coordinates";
message_en["UI::Label::Info"] 				= "Import and Rebuild a TVPaint Project.";
message_en["UI::Label::BrowseJSON"] 		= "Browse JSON...";
message_en["UI::Label::BrowseFolder"] 		= "Browse Folder...";
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
message_ja["FolderBrowser::Info"] 			= "ショットフォルダーまたはバッチフォルダーを選択してください。";
message_ja["UI::Title"] 					= "TVPaint 12 -- v. "+scriptVersion_XX+"を読み込みする"+scriptLastEdit_LOC;
message_ja["UI::Camera::Import"] 			= "カメラ";
message_ja["UI::Camera::Key"] 				= "キーの座標";
message_ja["UI::Camera::Raw"] 				= "カメラビュー座標";
message_ja["UI::Label::Info"] 				= "TVPaint からプロジェクトを読み込む";
message_ja["UI::Label::BrowseJSON"] 		= "JSON 参照...";
message_ja["UI::Label::BrowseFolder"] 		= "フォルダー参照...";
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

var message_zh = [];
message_zh["Error::Interruption"] 			= "退出脚本";
message_zh["Error::Cancellation"] 			= "取消脚本";
message_zh["Error::InvalidLocation"] 		= "无效位置";
message_zh["Error::InvalidFile"] 			= "无法读取文件: ";
message_zh["Error::MissingFiles"] 			= "项目位置中文件丢失";
message_zh["Error::MissingData"] 			= "文件数据丢失:";
message_zh["Error::MissingLayers"] 			= "无法发现图层，项目为空。";
message_zh["Error::BadBlendingMode"] 		= "不支持混合模式转换";
message_zh["Error::NoJSONFound"] 			= "在所选文件夹中未找到匹配的 .JSON 文件:";
message_zh["FileBrowser::Info"] 			= "选择一个 .JSON 文件。";
message_zh["FolderBrowser::Info"] 			= "选择镜头文件夹（或父批处理文件夹）";
message_zh["UI::Title"] 					= "导入 TVPaint 12 -- v. "+scriptVersion_XX+scriptLastEdit_LOC;
message_zh["UI::Camera::Import"] 			= "导入摄影机";
message_zh["UI::Camera::Key"] 				= "关键坐标";
message_zh["UI::Camera::Raw"] 				= "相机视图坐标";
message_zh["UI::Label::Info"] 				= "从 TVPaint 导入项目";
message_zh["UI::Label::BrowseJSON"] 		= "浏览 JSON...";
message_zh["UI::Label::BrowseFolder"] 		= "浏览文件夹...";
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
// Natural String Sorting Helper
function NaturalSortCompare(a, b) {
    var aName = (a instanceof File || a instanceof Folder) ? a.name : String(a);
    var bName = (b instanceof File || b instanceof Folder) ? b.name : String(b);
    if (aName === bName) return 0;
    var aMatch = aName.match(/^(\d+)/);
    var bMatch = bName.match(/^(\d+)/);
    if (aMatch && bMatch) {
        var aNum = parseInt(aMatch[1], 10);
        var bNum = parseInt(bMatch[1], 10);
        if (aNum !== bNum) return aNum - bNum;
    }
    return aName < bName ? -1 : 1;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Smart Folder JSON Finder
function FindJSONFilesFromFolder(folder) {
    var results = [];
    if (!folder || !folder.exists) return results;

    // 1. Direct match: [folderName].json inside folder (e.g. 0301/0301.json)
    var directFile = File(folder.fsName + "/" + folder.name + ".json");
    if (directFile.exists) {
        results.push(directFile);
        return results;
    }

    // 2. Any .json files directly in root of folder
    var rootJsons = folder.getFiles("*.json");
    if (rootJsons && rootJsons.length > 0) {
        for (var i = 0; i < rootJsons.length; i++) {
            if (rootJsons[i] instanceof File) {
                results.push(rootJsons[i]);
            }
        }
        results.sort(NaturalSortCompare);
        return results;
    }

    // 3. Subfolders (e.g. parent batch directory containing shot subfolders 0301/, 0302/...)
    var subFolders = folder.getFiles(function(f) { return f instanceof Folder; });
    if (subFolders && subFolders.length > 0) {
        subFolders.sort(NaturalSortCompare);
        for (var s = 0; s < subFolders.length; s++) {
            var subDir = subFolders[s];
            var subDirect = File(subDir.fsName + "/" + subDir.name + ".json");
            if (subDirect.exists) {
                results.push(subDirect);
            } else {
                var subJsons = subDir.getFiles("*.json");
                if (subJsons && subJsons.length > 0) {
                    for (var j = 0; j < subJsons.length; j++) {
                        if (subJsons[j] instanceof File) {
                            results.push(subJsons[j]);
                        }
                    }
                }
            }
        }
    }

    return results;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// GUI Panel
var importPanel = new Window("palette", message[lang]["UI::Title"], {x:0, y:0, width:450, height:400});
var staticTextInfo 				= importPanel.add( "statictext", 	{x:25,  y:10,  width:400, height:25}, 	message[lang]["UI::Label::Info"]			);
var buttonBrowseJSON 			= importPanel.add( "button", 		{x:25,  y:45,  width:195, height:26}, 	message[lang]["UI::Label::BrowseJSON"]		);
var buttonBrowseFolder 			= importPanel.add( "button", 		{x:230, y:45,  width:195, height:26}, 	message[lang]["UI::Label::BrowseFolder"]	);
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

buttonBrowseJSON.onClick = function() {
    SaveAllSettings();
    var lastFolderStr = LoadSetting("LastFolder", "");
    var initialFolder = (lastFolderStr !== "" && Folder(lastFolderStr).exists) ? Folder(lastFolderStr) : Folder.current;
    
    var dataFile = File.openDialog( message[lang]["FileBrowser::Info"], "JSON Files:*.json", false );
    if (!dataFile) return;
    if (!FileExists(dataFile)) return;
    
    SaveSetting("LastFolder", dataFile.parent.fsName);
    var settings = GetCurrentSettings();
    
    importPanel.close();
    $.sleep(50);
    
    ExecuteImport([dataFile], settings);
};

buttonBrowseFolder.onClick = function() {
    SaveAllSettings();
    var lastFolderStr = LoadSetting("LastFolder", "");
    var initialFolder = (lastFolderStr !== "" && Folder(lastFolderStr).exists) ? Folder(lastFolderStr) : Folder.current;
    
    var selectedFolder = Folder.selectDialog( message[lang]["FolderBrowser::Info"], initialFolder );
    if (!selectedFolder) return;
    
    SaveSetting("LastFolder", selectedFolder.fsName);
    
    var foundJsons = FindJSONFilesFromFolder(selectedFolder);
    if (!foundJsons || foundJsons.length === 0) {
        alert(message[lang]["Error::NoJSONFound"] + endl + selectedFolder.fsName);
        return;
    }
    
    var settings = GetCurrentSettings();
    
    importPanel.close();
    $.sleep(50);
    
    ExecuteImport(foundJsons, settings);
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

	// SORT PROJECT DATA, CHECK AND POSSIBLE CONVERSION
	var compName   		= ReadStringFromData( dataTree, "project.clip.name", dataFileName );
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
		app.endUndoGroup();
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
			app.endUndoGroup();
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
				alert(message[lang]["Error::BadBlendingMode"] + ": " + currentBlendingMode );
				layer.blendingMode = BlendingMode.NORMAL;
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

	app.endUndoGroup();
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Batch / Multi-file Execution Controller
function ExecuteImport(jsonFiles, settings) {
    if (!jsonFiles || jsonFiles.length === 0) return;

    var totalShots = jsonFiles.length;

    progressWindow.center();
    progressWindow.show();
    progressWindow.update();

    for (var s = 0; s < totalShots; s++) {
        var dataFile = jsonFiles[s];
        if (!dataFile.exists) continue;

        ImportSingleTVPJson(dataFile, settings, s, totalShots);
    }

    progressBar.value = 100;
    progressState.text = "100%";
    progressStage.text = pbarMessage[lang]["UI::Label::Stage::Success"];
    progressWindow.update();
    $.sleep(500);
    progressWindow.close();
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
    ImportSingleTVPJson(f, finalSettings, 0, 1);
    return true;
};
