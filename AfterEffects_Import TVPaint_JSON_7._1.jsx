//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Title: Import TVPaint Animation Clip Structure to After Effects
//
// Author: Clément Berthaud for TVPaint Developpement
// Edits by Matthieu Tragno, Kévin Lobjois
// Version: 7.1.0 -- IMPORTANT -- Update the scriptVersion vars when changing the script's version number
// JSON object, stringify and parse methods from Douglas Crockford (Public Domain)
// Last Edited by Kévin Lobjois on 15/02/2024 10:40 GMT+1 (-- IMPORTANT -- Update the scriptLastEdit_FR and scriptLastEdit_LOC vars when editing the script):
// -Implementation of Douglas Crockford's json2.js
// -Addition of a Progress Window and Progress Bar + closing the Import Window when launching the import
// -Changes to the GUI: some strings weren't showing properly
// -Bypass of the script version check in order to update its major version number without creating compatibility issues 
// -Addition of the last save date to the script's title bar
// -Update of some localization strings with more accurate translations
// -Added TVPaint version in the script's window title bar (AE script v.6.1)
// -Corrected a loc. mistake (blending modes for the french loc.) (AE script v.6.1).
// -Implemented data processing from the new TVP12 Camera (AE script v.7.0)
// -Implemented support for TVPaint folders (AE script v.7.1)
//
// Description: Import a TVPaint clip structure as a composition inside After Effects, any version from CS5.
// 				The script imports the layers and images as well as the camera of the specified clip.
// 				It requires the data to be exported the proper way as a .JSON file from TVPaint Animation
//				under File > Export To... > Clip: Layers Structure > Structure: JSON
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Copyright TVPaint Développement, 2023
//
// English (en):
// This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
// To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/.
// Alternative link to human readable license: https://www.tvpaint.com/license-cc-by-nc-sa-4.0-deed-en
// Alternative link to full license: https://www.tvpaint.com/license-cc-by-nc-sa-4.0-full-en
//
// Français (fr):
// Cette oeuvre, création, site ou texte est sous licence Creative Commons Attribution - Pas d’Utilisation Commerciale - Partage dans les Mêmes Conditions 4.0 International. 
// Pour accéder à une copie de cette licence, merci de vous rendre à l'adresse suivante http://creativecommons.org/licenses/by-nc-sa/4.0/ 
// ou envoyez un courrier à Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
// Lien alternatif vers un résumé de la licence: https://www.tvpaint.com/license-cc-by-nc-sa-4.0-deed-fr
// Lien alternatif vers la licence complète: https://www.tvpaint.com/license-cc-by-nc-sa-4.0-full-fr
//
// 日本語 (ja):
// この作品はクリエイティブ・コモンズ・表示 - 非営利 - 継承 4.0 国際・ライセンスで提供されています。このライセンスのコピーを閲覧するには、http://creativecommons.org/licenses/by-nc-sa/4.0/を訪問して下さい。
// ライセンスの条項へにアクセスリンク(まとめ) https://www.tvpaint.com/license-cc-by-nc-sa-4.0-deed-ja
// ライセンスの条項へにアクセスリンク(完全版) https://www.tvpaint.com/license-cc-by-nc-sa-4.0-full-ja
//
// 中文 (zh):
// 本作品采用知识共享 署名-非商业性使用-相同方式共享 4.0 国际 许可协议进行许可。访问 http://creativecommons.org/licenses/by-nc-sa/4.0/ 查看该许可协议。
// 简易协议内容备选链接 https://www.tvpaint.com/license-cc-by-nc-sa-4.0-deed-zh
// 协议全文内容备选链接 https://www.tvpaint.com/license-cc-by-nc-sa-4.0-full-zh
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////
// Implementation of Douglas Crockford's JSON object and stringify and parse methods
// json2.js
// 2023-05-10
// Public Domain.
// NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

// USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
// NOT CONTROL.

// This file creates a global JSON object containing two methods: stringify
// and parse. This file provides the ES5 JSN capability to ES3 systems.
// If a project might run on IE8 or earlier, then this file should be included.
// This file does nothing on ES5 systems.
// https://github.com/douglascrockford/JSON-js/blob/master/json2.js

// Additional notes (Matthieu Tragno)
// For some reason, AE doesn't seem to create a JSON object from the get go when using some workspaces
// This may cause the JSON.parse() function to be impossible to call...
// Thus, the Douglas Corckford's JSON object and methods will be used to create those in case they are missing, even if the user's AE version is a ES5 system
// It will also be useful for ES3 systems as well

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
        // Format integers to have at least two digits.
        return (n < 10)
            ? "0" + n
            : n;
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

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

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

// Produce a string from holder[key].

        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (
            value
            && typeof value === "object"
            && typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":

// JSON numbers must be finite. Encode non-finite numbers as null.

            return (isFinite(value))
                ? String(value)
                : "null";

        case "boolean":
        case "null":

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce "null". The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is "object", we might be dealing with an object or an array or
// null.

        case "object":

// Due to a specification blunder in ECMAScript, typeof null is "object",
// so watch out for that case.

            if (!value) {
                return "null";
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === "[object Array]") {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

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

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== "function") {
        meta = {    // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = "";
            indent = "";

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === "string") {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== "function" && (
                typeof replacer !== "object"
                || typeof replacer.length !== "number"
            )) {
                throw new Error("JSON.stringify");
            }

// Make a fake root object containing our value under the key of "".
// Return the result of stringifying the value.

            return str("", {"": value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

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


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

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

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with "()" and "new"
// because they can cause invocation, and "=" because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
// replace all simple value tokens with "]" characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or "]" or
// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval("(" + text + ")");

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError("JSON.parse");
        };
    }
}());
//////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////
// Session environement
var applicationLanguage 	= ExtractAELanguage( $.locale );
var applicationVersion 		= ExtractAEVersion( app.version );

var scriptVersionMajor 		= 7;
var scriptVersionMinor 		= 1;
var scriptVersionMajorStr 	= scriptVersionMajor.toString();
var scriptVersionMinorStr 	= scriptVersionMinor.toString();
var scriptVersion_XX 		= 		scriptVersionMajorStr + '.' + scriptVersionMinorStr;
var scriptVersion_vXX 		= 'v' + scriptVersionMajorStr + '.' + scriptVersionMinorStr;

var scriptLastEdit_FR		= " -- 15/02/2024 --";
var scriptLastEdit_LOC		= " -- 2024/02/15 --";

//////////////////////////////////////////////////////////////////////////////////////////////
// Application versions
var applicationVersionCS3 		= 8
var applicationVersionCS4 		= 9
var applicationVersionCS5 		= 10
var applicationVersionCS5_5 	= 10.5
var applicationVersionCS6 		= 11
var applicationVersionCC 		= 12
var applicationVersionCC2014 	= 13.0
var applicationVersionCC2015 	= 13.5
var applicationVersionCC2015_3 	= 13.8
var applicationVersionCC2017 	= 14.0

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
// Key / Values Dictionnary-Tables for Language and Localisation
var endl = "\n";

var message_fr = [];
message_fr["Error::Interruption"] 			= "Interruption du script.";
message_fr["Error::Cancellation"] 			= "Script annulé.";
message_fr["Error::InvalidLocation"] 		= "Emplacement invalide.";
message_fr["Error::InvalidFile"] 			= "Impossible de lire le fichier: ";
message_fr["Error::MissingFiles"] 			= "Fichiers manquants à l'emplacement spécifié.";
message_fr["Error::MissingData"] 			= "Données manquantes dans le fichier: ";
message_fr["Error::MissingLayers"] 			= "Aucun calque trouvé, le projet est vide.";
// Bypass of the associated check: refer to "ReadIntFromData( dataTree, "version.major", 0) != scriptVersionMajor" for more information
// message_fr["Error::OutdatedVersion"] 		= "Méthode d'export obsolète (< "+scriptVersion_vXX+").";
message_fr["Error::BadBlendingMode"] 		= "Mode de mélange non supporté.";
message_fr["FileBrowser::Info"] 			= "Selectioner un fichier .JSON .";
message_fr["UI::Title"] 					= "Import TVPaint 12 -- v."+scriptVersion_XX+scriptLastEdit_FR;
message_fr["UI::Camera::Import"] 			= "Caméra";
message_fr["UI::Camera::Key"] 				= "Coordonnées des Clés";
message_fr["UI::Camera::Raw"] 				= "Coordonnées de la Vue Caméra";
message_fr["UI::Label::Info"] 				= "Importer un projet depuis TVPaint.";
message_fr["UI::Label::Browse"] 			= "Parcourir...";
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
// Bypass of the associated check: refer to "ReadIntFromData( dataTree, "version.major", 0) != scriptVersionMajor" for more information
// message_en["Error::OutdatedVersion"] 		= "Export data outdated (< "+scriptVersion_vXX+")";
message_en["Error::BadBlendingMode"] 		= "Blending mode conversion not supported.";
message_en["FileBrowser::Info"] 			= "Select a .JSON file.";
message_en["UI::Title"] 					= "Import TVPaint 12 -- v. "+scriptVersion_XX+scriptLastEdit_LOC;
message_en["UI::Camera::Import"] 			= "Import Camera";
message_en["UI::Camera::Key"] 				= "Key Coordinates";
message_en["UI::Camera::Raw"] 				= "Camera View Coordinates";
message_en["UI::Label::Info"] 				= "Import and Rebuild a TVPaint Project.";
message_en["UI::Label::Browse"] 			= "Browse...";
message_en["UI::Label::Settings"] 			= "Import Settings:";
message_en["UI::Label::LayerColors"] 		= "Layer Color Groups";
message_en["UI::Label::TimeRemap"] 			= "Time Remap";
message_en["UI::Label::BlendingMode"] 		= "Layer Blending Modes";
message_en["UI::Label::PrePostB"] 			= "Pre/Post Behaviours";
message_en["UI::Label::TimeRemap"] 			= "Time Remap";
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
// Bypass of the associated check: refer to "ReadIntFromData( dataTree, "version.major", 0) != scriptVersionMajor" for more information
// message_ja["Error::OutdatedVersion"] 		= "使った読み込み方法は対応しません (< "+scriptVersion_vXX+")";
message_ja["Error::BadBlendingMode"] 		= "ブレンディングモードは対応しません。";
message_ja["FileBrowser::Info"] 			= ".JSON ファイルを選択してください。";
message_ja["UI::Title"] 					= "TVPaint 12 -- v. "+scriptVersion_XX+"を読み込みする"+scriptLastEdit_LOC;
message_ja["UI::Camera::Import"] 			= "カメラ";
message_ja["UI::Camera::Key"] 				= "キーの座標";
message_ja["UI::Camera::Raw"] 				= "カメラビュー座標";
message_ja["UI::Label::Info"] 				= "TVPaint からプロジェクトを読み込む";
message_ja["UI::Label::Browse"] 			= "参照...";
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
// Bypass of the associated check: refer to "ReadIntFromData( dataTree, "version.major", 0) != scriptVersionMajor" for more information
// message_zh["Error::OutdatedVersion"] 		= "导出过期数据 (< "+scriptVersion_vXX+")";
message_zh["Error::BadBlendingMode"] 		= "不支持混合模式转换";
message_zh["FileBrowser::Info"] 			= "选择一个 .JSON 文件。";
message_zh["UI::Title"] 					= "导入 TVPaint 12 -- v. "+scriptVersion_XX+scriptLastEdit_LOC;
message_zh["UI::Camera::Import"] 			= "导入摄影机";
message_zh["UI::Camera::Key"] 				= "关键坐标";
message_zh["UI::Camera::Raw"] 				= "相机视图坐标";
message_zh["UI::Label::Info"] 				= "从 TVPaint 导入项目";
message_zh["UI::Label::Browse"] 			= "浏览...";
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

// + Fill Languages in message Table.
var message = [];
message["fr"] = message_fr;
message["en"] = message_en;
message["ja"] = message_ja;
message["zh"] = message_zh;

//////////////////////////////////////////////////////////////////////////////////////////////
// Progress Bar Localization (Matthieu)
var pbarMessage_fr = [];
pbarMessage_fr["UI::Title"] = "Import en cours...";
pbarMessage_fr["UI::Label::Stage::JSONParse"] = "Lecture du fichier JSON...";
pbarMessage_fr["UI::Label::Stage::RootCompCreation"] = "Création d'une nouvelle Comp. source...";
pbarMessage_fr["UI::Label::Stage::CompFolderCreation"] = "Création d'un dossier Comp...";
pbarMessage_fr["UI::Label::Stage::LayerCreation"] = "Import des calques...";
pbarMessage_fr["UI::Label::Stage::Camera"] = "Import de la caméra...";
pbarMessage_fr["UI::Label::Stage::Success"] = "Import terminé.";

var pbarMessage_en = [];
pbarMessage_en["UI::Title"] = "Loading...";
pbarMessage_en["UI::Label::Stage::JSONParse"] = "Reading JSON file...";
pbarMessage_en["UI::Label::Stage::RootCompCreation"] = "Creation of a new Root Comp...";
pbarMessage_en["UI::Label::Stage::CompFolderCreation"] = "Creation of a new Comp Folder...";
pbarMessage_en["UI::Label::Stage::LayerCreation"] = "Importing layers...";

pbarMessage_en["UI::Label::Stage::Success"] = "Import complete.";

var pbarMessage_ja = [];
pbarMessage_ja["UI::Title"] = "ローディング中…";
pbarMessage_ja["UI::Label::Stage::JSONParse"] = "JSONファイルの読み込み中…";
pbarMessage_ja["UI::Label::Stage::RootCompCreation"] = "ソースとする新しいコンポジションの作成中…";
pbarMessage_ja["UI::Label::Stage::CompFolderCreation"] = "コンポジションのフォルダの作成中…";
pbarMessage_ja["UI::Label::Stage::LayerCreation"] = "レイヤーの読み込み中…";
pbarMessage_ja["UI::Label::Stage::Camera"] = "カメラの読み込み中…";
pbarMessage_ja["UI::Label::Stage::Success"] = "読み込みが完了。";

var pbarMessage_zh = [];
pbarMessage_zh["UI::Title"] = "加载中...";
pbarMessage_zh["UI::Label::Stage::JSONParse"] = "正在加载 JSON 文件...";
pbarMessage_zh["UI::Label::Stage::RootCompCreation"] = "ソースとする新しいコンポジションの作成中…";
pbarMessage_zh["UI::Label::Stage::CompFolderCreation"] = "创建新的合成作为源...";
pbarMessage_zh["UI::Label::Stage::LayerCreation"] = "加载图层...";
pbarMessage_zh["UI::Label::Stage::Camera"] = "正在加载相机...";
pbarMessage_zh["UI::Label::Stage::Success"] = "加载完成。";

var pbarMessage = [];
pbarMessage["fr"] = pbarMessage_fr;
pbarMessage["en"] = pbarMessage_en;
pbarMessage["ja"] = pbarMessage_ja;
pbarMessage["zh"] = pbarMessage_zh;
//////////////////////////////////////////////////////////////////////////////////////////////

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
TVPBlendingModes[0]   = "Color"
TVPBlendingModes[1]   = "Behind"
TVPBlendingModes[2]   = "Erase"
TVPBlendingModes[3]   = "Shade"
TVPBlendingModes[4]   = "Light"
TVPBlendingModes[5]   = "Colorize"
TVPBlendingModes[6]   = "Hue"
TVPBlendingModes[7]   = "Saturation"
TVPBlendingModes[8]   = "Value"
TVPBlendingModes[9]   = "Add"
TVPBlendingModes[10]  = "Sub"
TVPBlendingModes[11]  = "Multiply"
TVPBlendingModes[12]  = "Screen"
TVPBlendingModes[13]  = "Replace"
TVPBlendingModes[14]  = "Copy"
TVPBlendingModes[15]  = "Difference"
TVPBlendingModes[16]  = "Divide"
TVPBlendingModes[17]  = "Overlay"
TVPBlendingModes[18]  = "Overlay2"
TVPBlendingModes[19]  = "Light2"
TVPBlendingModes[20]  = "Shade2"
TVPBlendingModes[21]  = "HardLight"
TVPBlendingModes[22]  = "SoftLight"
TVPBlendingModes[23]  = "GrainExtract"
TVPBlendingModes[24]  = "GrainMerge"
TVPBlendingModes[25]  = "Sub2"
TVPBlendingModes[26]  = "Darken"
TVPBlendingModes[27]  = "Lighten"

//Modify That Matching Table if you're not happy with the current matching.
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
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
// GUI Panel
// Made it a bit bigger and used AE's default color palette (Matthieu)
var importPanel = new Window("palette", message[lang]["UI::Title"], {x:0, y:0, width:450, height:400});
var staticTextInfo 				= importPanel.add( "statictext", 	{x:25,  y:10,  width:225, height:30}, 	message[lang]["UI::Label::Info"]			);
var buttonBrowse 				= importPanel.add( "button", 		{x:25,  y:45,  width:400, height:25}, 	message[lang]["UI::Label::Browse"]			);
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

dropdownlistSeqImport.selection 	= 0;
dropdownlistSeqSorting.selection 	= 0;
radioCameraKeys.value 				= true;
checkboxLayerColors.value 			= true;
checkboxPrePostBehaviours.value 	= true;
checkboxTimeRemap.value 			= true;
checkboxBlendingModes.value 		= true;
importPanel.active 					= true;
radioCameraKeys.enabled 			= false; 
radioCameraRaw.enabled 				= false;

importPanel.center();
importPanel.show();

checkboxImportCamera.onClick = function() {
    radioCameraKeys.enabled = !radioCameraKeys.enabled;
    radioCameraRaw.enabled= radioCameraKeys.enabled;
}

checkboxTimeRemap.onClick = function() {
    checkboxPrePostBehaviours.enabled = !checkboxPrePostBehaviours.enabled;
}

buttonBrowse.onClick = function() {
    var layerColors 	= checkboxLayerColors.value;
    var prepostBehav 	= checkboxPrePostBehaviours.value;
    var sortingMode 	= dropdownlistSeqSorting.selection.index;
    var blending 		= checkboxBlendingModes.value;
    var scriptMode 		= 0;
    var timing        	= checkboxTimeRemap.value;
    var seqOn 			= dropdownlistSeqImport.selection.index;

    if( checkboxImportCamera.value )
    {
		scriptMode = 1;
		if( radioCameraKeys.value )
            scriptMode = 1;
        else
            scriptMode = 2;
	}

    Run(scriptMode, layerColors, prepostBehav, sortingMode, blending, timing, seqOn );
}

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
// Progress Bar (Matthieu)

var progressWindow = new Window("palette", pbarMessage[lang]["UI::Title"], {x:0, y:0, width:350, height:80}, {closeButton: false});
var progressBar = progressWindow.add("progressBar", {x:10, y:30, width:330, height:20});
var progressState = progressWindow.add("statictext", {x:165, y:30, width:100, height:20}, "0%");
var progressStage = progressWindow.add("statictext", {x:12, y:55, width:350, height:20}, "...");
// To count layers and show progression
var layerCounter = 0;

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
// Functions

//////////////////////////////////////////////////////////////////////////////////////////////
// FileExists(file)
// Check the existence of a File Object (not a path!)
//////////////////////////////////////////////////////////////////////////////////////////////
function FileExists(file)
{
	if(file==null) {
		return 0;
	}

	if(!file.exists) {
		alert(message[lang]["Error::InvalidFile"] + endl + message[lang]["Error::Interruption"]);
		return 0;
	}

	return 1; 
}

//////////////////////////////////////////////////////////////////////////////////////////////
// ColorDistance(R1, G1, B1, R2, G2, B2)
// Get distance beetween two points
//////////////////////////////////////////////////////////////////////////////////////////////
function ColorDistance(R1, G1, B1, R2, G2, B2)
{
	return Math.sqrt(Math.pow(R1-R2, 2)+Math.pow(G1-G2, 2)+Math.pow(B1-B2, 2));
}

//////////////////////////////////////////////////////////////////////////////////////////////
// SortLinkName( iLink )
// Sort the link object by name
//////////////////////////////////////////////////////////////////////////////////////////////
function SortLinkName( iLink )
{
    
	var nLinkEntries = iLink.length;
    var names = [];
    	
    for( var i = 0; i < nLinkEntries; i++ )
	{
		names.push( iLink[i]["instance-name"] );
		iLink[i].naturalIndex = i;
	}

	names.sort(function (a, b) {
	    if (a === b) {
	        return 0;
	    }
	    if (typeof a === typeof b) {
			
			if( ( typeof( a ) == "string" && a.match(/^-?\d+$/) ) && 
			    ( typeof( b ) == "string" && b.match(/^-?\d+$/) ) )
			{
				return parseFloat(a) < parseFloat(b) ? -1 : 1;
			}
			
	        return a < b ? -1 : 1;
	    }
	    return typeof a < typeof b ? -1 : 1;
	});

	for( var i = 0; i < nLinkEntries; i++ )
	{
		for( var j = 0; j < nLinkEntries; j++ )
		{
			if( names[i] == iLink[j]["instance-name"] )
			{
				iLink[j].sortedIndex = i;
			}
		}
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////
// SortLinkIndex( iLink )
// Sort the link object by index ( default )
//////////////////////////////////////////////////////////////////////////////////////////////
function SortLinkIndex( iLink )
{
	var nLinkEntries = iLink.length;
    
    for( var i = 0; i < nLinkEntries; i++ )
	{
		iLink[i].naturalIndex = i;
		iLink[i].sortedIndex = i;
    }
}
//////////////////////////////////////////////////////////////////////////////////////////////
// ExtractAEVersion( iV )
// Retrieves after effect version number.
//////////////////////////////////////////////////////////////////////////////////////////////
function ExtractAEVersion( iV )
{
	var sub = iV.substring( 0, 2 );
	return parseInt( sub );
}
//////////////////////////////////////////////////////////////////////////////////////////////
// ExtractAELanguage( iL )
// Retrieves after effect language string.
//////////////////////////////////////////////////////////////////////////////////////////////
function ExtractAELanguage( iL )
{
	var sub = iL.substring( 0, 2 );
	return sub;
}
//////////////////////////////////////////////////////////////////////////////////////////////
// ReadFromData( iJsonObject, iPath, iDefaultValue )
// Retrieves Data from Json Object
//////////////////////////////////////////////////////////////////////////////////////////////
function ReadFromData( iJsonObject, iPath, iDefaultValue )
{
	var splitPath = iPath.split( "." );

	if( splitPath == "" )
	{
		return iJsonObject;
	}
	else
	{
		if( iJsonObject.hasOwnProperty( splitPath[0] ) )
		{
			var subJsonObject = iJsonObject[splitPath[0]];
			splitPath.shift();
			var recursePath = splitPath.join( "." );

			return ReadFromData( subJsonObject, recursePath, iDefaultValue );
		}
		else
		{
			return iDefaultValue;
		}
	}
}
//////////////////////////////////////////////////////////////////////////////////////////////
// ReadIntFromData( iJsonObject, iPath, iDefaultValue )
// Retrieves Data from Json Object
//////////////////////////////////////////////////////////////////////////////////////////////
function ReadIntFromData( iJsonObject, iPath, iDefaultValue )
{
	return parseInt( ReadFromData( iJsonObject, iPath, iDefaultValue ) );
}
//////////////////////////////////////////////////////////////////////////////////////////////
// ReadIntFromData( iJsonObject, iPath, iDefaultValue )
// Retrieves Data from Json Object
//////////////////////////////////////////////////////////////////////////////////////////////
function ReadFloatFromData( iJsonObject, iPath, iDefaultValue )
{
	return parseFloat( ReadFromData( iJsonObject, iPath, iDefaultValue ) );
}
//////////////////////////////////////////////////////////////////////////////////////////////
// ReadStringFromData( iJsonObject, iPath, iDefaultValue )
// Retrieves Data from Json Object
//////////////////////////////////////////////////////////////////////////////////////////////
function ReadStringFromData( iJsonObject, iPath, iDefaultValue )
{
	return ReadFromData( iJsonObject, iPath, iDefaultValue );
}
//////////////////////////////////////////////////////////////////////////////////////////////
// ReadArrayFromData( iJsonObject, iPath, iDefaultValue )
// Retrieves Data from Json Object
//////////////////////////////////////////////////////////////////////////////////////////////
function ReadArrayFromData( iJsonObject, iPath )
{
	return ReadFromData( iJsonObject, iPath, null );
}
//////////////////////////////////////////////////////////////////////////////////////////////
// IsNull( iObject )
// Check Object
//////////////////////////////////////////////////////////////////////////////////////////////
function IsInvalid( iObject, iError )
{
	var isNull = iObject == null;

	if( isNull )
	{
		alert( iError );
	}

	return isNull;
}
//////////////////////////////////////////////////////////////////////////////////////////////
function Run(mode, colorOn, prepostOn, sortMode, blendingOn, timeRemapOn, sequenceOn )
{
	//Open file Dialog
	var dataFile = File.openDialog( message[lang]["FileBrowser::Info"], "JSON Files:*.json", false );
	if( !FileExists( dataFile ) )
		return; // Abort script, stop execution
	
	//Retrieve source directory
	var srcDirPath 	= dataFile.absoluteURI.split( "/" );
	srcDirPath.pop();
	srcDirPath = srcDirPath.join( "/" );
	//Read source file
	dataFile.encoding = "UTF-8";
	dataFile.open( "r" );
	var dataString 	= dataFile.read();
	dataFile.close();
	var dataFileNameWithExtension = File.decode( dataFile.name );
	var dataFileName = dataFileNameWithExtension.split(".")[0];

	
	// Close the Import Panel before parsing the JSON file (Matthieu)
	importPanel.close();
	$.sleep(100);

	// Show the Progress Window (Matthieu)
	progressBar.value = 10;
	progressState.text = "10%";
	progressStage.text = pbarMessage[lang]["UI::Label::Stage::JSONParse"];
	progressWindow.center();
	progressWindow.show();
	progressWindow.update();
	$.sleep(500);
    
	//Parse JSON Data
	var dataTree   	= JSON.parse(dataString);
    // Bypass of the script version check from now on (version 6.0.0). This is done because:
    // -It makes updating the script's major version number complicated:
    // TVPaint must issue the same version number in its JSON files otherwise the script won't load the uploaded JSON 
    // This can possibily create compatibility issues with older JSON files when updating the script's major version number
    // -It also does not seem to have any meaningful purpose

    /*
	if( ReadIntFromData( dataTree, "version.major", 0) != scriptVersionMajor )
	{
		alert(message[lang]["Error::OutdatedVersion"] + endl + message[lang]["Error::Interruption"]); 
		return;
	}
    */
	
	// SORT PROJECT DATA, CHECK AND POSSIBLE CONVERSION
	var compName   		= ReadStringFromData( dataTree, "project.clip.name", "name" );
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

	// Update the Progress Window (Matthieu)
	progressBar.value = 20;
	progressState.text = "20%";
	progressWindow.update();
	$.sleep(500);
	
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

	// Update the Progress Window (Matthieu)
	progressBar.value = 30;
	progressState.text = "30%";
	progressStage.text = pbarMessage[lang]["UI::Label::Stage::RootCompCreation"];
	progressWindow.update();
	$.sleep(500);

	// This Function causes problem in CS5...
	if( applicationVersion > applicationVersionCS5 )	
		root_composition.openInViewer();
    	
	///////////////
	// BUILD LAYERS
	//Here we create a layer comp folder for Layers
	var layersFolder 			= app.project.items.addFolder("Layers_Compositions");
	layersFolder.parentFolder 	= rootFolder;
	var layersData   			= ReadArrayFromData( dataTree, "project.clip.layers" );
	if( IsInvalid( layersData, message[lang]["Error::MissingData"] ) )
		return;

	var nbLayers 				= layersData.length;

	// Progress Window update (Matthieu)
	progressBar.value = 40;
	progressState.text = "40%";
	progressStage.text = pbarMessage[lang]["UI::Label::Stage::CompFolderCreation"];
	progressWindow.update();
	$.sleep(500);

	//Start reading layers and building them
	for(var i=nbLayers-1; i>=0;i--) // Loop through layers descending order.
	{	
		// Progress Window update (Matthieu)
		progressBar.value = 50;
		progressState.text = "50%";
		// Incrementing the layerCounter
		layerCounter++;
		progressStage.text = pbarMessage[lang]["UI::Label::Stage::LayerCreation"] + " " + layerCounter + "/" + nbLayers;
		progressWindow.update();
		$.sleep(500);
		/////////////////////
		// BUILD LAYER COMP
		// Now we create a comp for the layer, doing a fake sequence from files in layer directory.
		var currentLayerData  				= layersData[i];
		var layerStart 						= ReadIntFromData( currentLayerData, "start", 0 );
		var layerEnd   						= ReadIntFromData( currentLayerData, "end", 0 ) + 1;

		// Kévin: we ignore the element if it's a folder
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
		// Frames data
		var link 		= ReadArrayFromData( currentLayerData, "link" );
		if( IsInvalid( link, message[lang]["Error::MissingData"] ) )
			return;
		var nbEntries 	= link.length;

		// Sorting the files...
		if( sortMode == 0 )
		{
			SortLinkIndex( link );
		}	
		else
		{
			SortLinkName( link );
		}

		var filesArray = [];
		for(var j=0; j<nbEntries; j++)
		{
			for( k = 0; k < nbEntries; k++ )
			{
				if( link[k].sortedIndex == j )
				{			            
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
			if( ext == "tif" || ext == "tiff" )
			{
				importSeq.mainSource.alphaMode = AlphaMode.PREMULTIPLIED
			}
            
			var seqStart 				= 0;
			var seqEnd 					= nbEntries * compFrameTime;
			var seqDuration 			= seqEnd - seqStart;
			importSeq 					= layer_sequence.layers.add( importSeq, seqDuration );
			importSeq.inPoint 			= seqStart;
            
              var ext = filesArray[0].split('.').pop();
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
				if( ext == "tif" || ext == "tiff" )
				{
					importImage.mainSource.alphaMode = AlphaMode.PREMULTIPLIED
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
		seq 			= layer_composition.layers.add( layer_sequence )
		seq.enabled 	= true;
		seq.inPoint 	= 0;
		seq.outPoint 	= nbEntries * compFrameTime

		layer 			= root_composition.layers.add(layer_composition);
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
			layer.label = matchingLabel; // layer color;
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
				var result =  BlendingMatch[ currentBlendingMode ];
				if( typeof result === 'undefined' )
				{
					blendingModeSupported = false;
				}

			if( blendingModeSupported )
			{
				layer.blendingMode = BlendingMatch[ currentBlendingMode ];
			}
			else
			{
				alert(message[lang]["Error::BadBlendingMode"] + ": " + currentBlendingMode );
				layer.blendingMode = BlendingMode.NORMAL; // DEFAULT
			}
		}

		
		////////////////////////////
		// BUILD TIMELINE TIME REMAP		
		if( timeRemapOn )
		{
			layer.timeRemapEnabled=true;

			for(var j=0; j<nbEntries; j++)
			{
				var nOccurences = link[j].images.length;

				for(var k=0; k<nOccurences; k++)
				{
					var oc = link[j].images[k];

					var index = layer.timeRemap.addKey( oc * compFrameTime );
					//var value = JP_Industry_extractInstanceNumberFromFileName( link[j].file ) -1 ;
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
			
			
				//LOOP these must be handled separately, in case both pre and post are set as loop it requires a special expression
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
					layer.inPoint=0;
					layer.outPoint = layerEnd * compFrameTime;
					//layer.timeRemap.expression = 'loopIn("cycle",0)';
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
					//layer.timeRemap.setValueAtTime( layerEnd * compFrameTime, link[0].sortedIndex * compFrameTime );
					layer.inPoint 				= layerStart * compFrameTime;
					layer.outPoint 				= compDuration;
					//layer.timeRemap.expression 	= 'loopOut("cycle",0)';
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
			
			
				//PING-PONG these must be handled separately, in case both pre and post are set as pingpong it requires a special expression
				if( currentPreBehavior == 2 && currentPostBehavior == 2 )
				{
					layer.inPoint 				= 0;
					layer.outPoint 				= compDuration;
					layer.timeRemap.expression 	= 'if (time > key(1).time) { loopOut("pingpong",0) } else { loopIn("pingpong",0) }';
				}
				else
				if( currentPreBehavior == 2 )
				{
					layer.inPoint 				= 0;
					layer.outPoint 				= layerEnd * compFrameTime;
					layer.timeRemap.expression 	= 'loopIn("pingpong",0)';
				}
				else
				if( currentPostBehavior == 2 )
				{

					layer.inPoint 				= layerStart * compFrameTime;
					layer.outPoint 				= compDuration;
					layer.timeRemap.expression 	= 'loopOut("pingpong",0)';
				}
			// + HANDLE SPECIAL CASE WITH BOTH PING-PONG AND LOOP ... 
			}
		}
	} // END OF BUILD LAYERS

	///////////////
	// BUILD CAMERA
	// Mode 0 is import without cam
	// Progress Window update (Matthieu)
	progressBar.value = 80;
	progressState.text = "80%";
	progressStage.text = pbarMessage[lang]["UI::Label::Stage::Camera"];
	progressWindow.update();
	$.sleep(500);

	if(	mode == 1 || mode == 2 )
	{
		// SORT PROJECT DATA, CHECK AND POSSIBLE CONVERSION
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

		// READ DATA
		cameraLayer.property("Position").setValue([camWidth/2,camHeight/2,-1000]);
		cameraLayer.property("Point of Interest").setValue([camWidth/2,camHeight/2,0]);
		cameraLayer.property("Zoom").setValue(1000);

		// This Function causes problem in CS5...
		if( applicationVersion > applicationVersionCS5 )
			cameraComp.openInViewer();


		// CAM KEY VALUES (mode 1)
		if(mode == 1)
		{
			//READ CAM DATA
			var cameraData = ReadArrayFromData( dataTree, "project.clip.camera", null );
			var keys = ReadArrayFromData( cameraData, "points", null );

			//var camKeyValues = readValues(projectSettingsFile,"CamKeyValues"," ");
			for(var i=0;i<keys.length;i++)
			{
				var step;
				if(keys.length<=1)
				{
					step = 0;
				}
				else
				{
					step = (i)/(keys.length-1)
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
			//READ CAM DATA
			var cameraData = ReadArrayFromData( dataTree, "project.clip.camera", null );
			var positions = ReadArrayFromData( cameraData, "positions", null );

			for(var i=0;i<positions.length;i++)
			{
				var step;
				if(positions.length<=1)
				{
					step = 0;
				}
				else
				{
					step = (i)/(positions.length-1)
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
			alert( lastKey );
			alert( lastKey.angle );
			cameraLayer.property("Position").setValueAtTime(lastInstant,[lastKey.x,lastKey.y,-1000*lastKey.scale]);
			cameraLayer.property("Point of Interest").setValueAtTime(lastInstant,[lastKey.x,lastKey.y,0]);
			cameraLayer.property("Rotation").setValueAtTime(lastInstant,-lastKey.angle);
		}

		// SET INTERPOLATION TYPE AT KEY (LINEAR / BEZIER)
		// Works for both modes (1 & 2)
		for(var k=1;k<cameraLayer.property("Position").numKeys;k++)
		{
			if(cameraData.mode==0)
			{
				cameraLayer.property("Position").setInterpolationTypeAtKey(k,KeyframeInterpolationType.LINEAR);
				cameraLayer.property("Point of Interest").setInterpolationTypeAtKey(k,KeyframeInterpolationType.LINEAR);
				cameraLayer.property("Rotation").setInterpolationTypeAtKey(k,KeyframeInterpolationType.LINEAR);
			}
			else
			{
				cameraLayer.property("Position").setInterpolationTypeAtKey(k,KeyframeInterpolationType.BEZIER);
				cameraLayer.property("Point of Interest").setInterpolationTypeAtKey(k,KeyframeInterpolationType.BEZIER);
				cameraLayer.property("Rotation").setInterpolationTypeAtKey(k,KeyframeInterpolationType.BEZIER);
			}
		}
		
	} // END OF BUILD CAMERA

	// Progress Window update (Matthieu)
	progressBar.value = 100;
	progressState.text = "100%";
	progressStage.text = pbarMessage[lang]["UI::Label::Stage::Success"];
	progressWindow.update();
	$.sleep(2000);
	// Closing the Progress Window (Matthieu)
	progressWindow.close();

	return; // End of main run function
}

// (FORMER) EMBEDDED JSON PARSER
// Additional notes (Matthieu Tragno)
// For some reason, AE doesn't seem to create a JSON object from the get go when using some workspaces
// This may cause the JSON.parse() function to be impossible to call...
// Thus, the Douglas Corckford's JSON object and methods will be used to create those in case they are missing, even if the user's AE version is a ES5 system
// The author of the AE TVPaint import script conditioned the above's usage to specific versions of After Effects -this will not be the case anymore
// (In that regard, they also had removed all of the other conditions from the Crockford's implementation they had put in the script) 
// I have commented the author's code to use Douglas Crockford's most recent version of their work, and make it so it runs when no JSON object / parse method is to be found
/*
if( applicationVersion < applicationVersionCC )
{
	"object"!=typeof JSON&&(JSON={}),function(){"use strict";function f(t){return t<10?"0"+t:t}function this_value(){return this.valueOf()}function quote(t){return rx_escapable.lastIndex=0,rx_escapable.test(t)?'"'+t.replace(rx_escapable,function(t){var e=meta[t];return"string"==typeof e?e:"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+t+'"'}function str(t,e){var r,n,o,u,f,a=gap,i=e[t];switch(i&&"object"==typeof i&&"function"==typeof i.toJSON&&(i=i.toJSON(t)),"function"==typeof rep&&(i=rep.call(e,t,i)),typeof i){case"string":return quote(i);case"number":return isFinite(i)?String(i):"null";case"boolean":case"null":return String(i);case"object":if(!i)return"null";if(gap+=indent,f=[],"[object Array]"===Object.prototype.toString.apply(i)){for(u=i.length,r=0;r<u;r+=1)f[r]=str(r,i)||"null";return o=0===f.length?"[]":gap?"[\n"+gap+f.join(",\n"+gap)+"\n"+a+"]":"["+f.join(",")+"]",gap=a,o}if(rep&&"object"==typeof rep)for(u=rep.length,r=0;r<u;r+=1)"string"==typeof rep[r]&&(o=str(n=rep[r],i))&&f.push(quote(n)+(gap?": ":":")+o);else for(n in i)Object.prototype.hasOwnProperty.call(i,n)&&(o=str(n,i))&&f.push(quote(n)+(gap?": ":":")+o);return o=0===f.length?"{}":gap?"{\n"+gap+f.join(",\n"+gap)+"\n"+a+"}":"{"+f.join(",")+"}",gap=a,o}}var rx_one=/^[\],:{}\s]*$/,rx_two=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,rx_three=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,rx_four=/(?:^|:|,)(?:\s*\[)+/g,rx_escapable=/[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,rx_dangerous=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;"function"!=typeof Date.prototype.toJSON&&(Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null},Boolean.prototype.toJSON=this_value,Number.prototype.toJSON=this_value,String.prototype.toJSON=this_value);var gap,indent,meta,rep;"function"!=typeof JSON.stringify&&(meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},JSON.stringify=function(t,e,r){var n;if(gap="",indent="","number"==typeof r)for(n=0;n<r;n+=1)indent+=" ";else"string"==typeof r&&(indent=r);if(rep=e,e&&"function"!=typeof e&&("object"!=typeof e||"number"!=typeof e.length))throw new Error("JSON.stringify");return str("",{"":t})}),"function"!=typeof JSON.parse&&(JSON.parse=function(text,reviver){function walk(t,e){var r,n,o=t[e];if(o&&"object"==typeof o)for(r in o)Object.prototype.hasOwnProperty.call(o,r)&&(void 0!==(n=walk(o,r))?o[r]=n:delete o[r]);return reviver.call(t,e,o)}var j;if(text=String(text),rx_dangerous.lastIndex=0,rx_dangerous.test(text)&&(text=text.replace(rx_dangerous,function(t){return"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})),rx_one.test(text.replace(rx_two,"@").replace(rx_three,"]").replace(rx_four,"")))return j=eval("("+text+")"),"function"==typeof reviver?walk({"":j},""):j;throw new SyntaxError("JSON.parse")})}();
}
*/
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
