const MagicString = require("magic-string");
const { createParser } = require("htmljs-parser");
const {
  globalI18nMap,
  transformScript,
  transformScriptExpression,
  transformText
} = require("../core");
const { generateId } = require("../visitors");

function transformTemplate(code, options, ms) {
  let changed = false;

  const innerI18nMap = {};

  let currentTag = null;
  let currentTagInfo = null;

  const trimQuotes = str => str?.replace(/^["']|["']$/g, "");

  const parser = createParser({
    onOpenTagName(range) {
      const tag = parser.read(range);

      if (tag === "script" || tag === "style") {
        currentTag = tag;
      }

      if (tag === options.JSXElement) {
        currentTagInfo = {
          tag: options.JSXElement,
          tagPos: range.start + tag.length,
          id: null,
          msg: null,
          msgPos: -1,
          currentAttr: null
        };
      }
    },
    onOpenTagEnd() {
      if (!currentTagInfo) return;

      if (currentTagInfo.msg) {
        let id = trimQuotes(currentTagInfo.id);
        const msg = trimQuotes(currentTagInfo.msg);

        if (!options.keepDefaultMsg && currentTagInfo.msgPos > -1) {
          const start = currentTagInfo.msgPos - 1;
          const end = start + currentTagInfo.msg.length + 5; // 5 -> "msg=".length + 1
          ms?.remove(start, end);
          changed = true;
        }

        if (!id) {
          id = generateId(msg, options);
          ms?.appendRight(currentTagInfo.tagPos, ` id="${id}"`);
          changed = true;
        }

        Object.assign(globalI18nMap, {
          [id]: msg
        });
      }

      currentTagInfo = null;
    },
    onCloseTagName(range) {
      const tag = parser.read(range);

      if (tag === currentTag) {
        currentTag = null;
      }
    },
    onText(range) {
      const text = parser.read(range);

      // skip style
      if (currentTag === "style") return;

      // script content
      if (currentTag === "script") {
        const result = transformScript(text, options, false, innerI18nMap);

        if (!result.changed) return;

        changed = true;

        ms?.overwrite(range.start, range.end, result.code);

        return;
      }

      // 普通文本
      const replacement = transformText(text, options, innerI18nMap);

      if (!replacement) return;

      changed = true;

      ms?.overwrite(range.start, range.end, `\${${replacement}}`);
    },
    onAttrName(range) {
      if (!currentTagInfo) return;

      const name = parser.read(range);

      if (name === "id") {
        currentTagInfo.currentAttr = "id";
      }

      if (name === "msg") {
        currentTagInfo.currentAttr = "msg";
        currentTagInfo.msgPos = range.start;
      }
    },
    onAttrValue(range) {
      const raw = parser.read(range).trim().slice(1); // slice off “=”

      if (
        currentTagInfo &&
        (currentTagInfo.currentAttr === "id" ||
          currentTagInfo.currentAttr === "msg")
      ) {
        currentTagInfo[currentTagInfo.currentAttr] = raw;
        currentTagInfo.currentAttr = null;
        return;
      }

      const replacement = transformScriptExpression(raw, options, innerI18nMap);

      if (!replacement) return;

      changed = true;

      const start = code[range.start] === "=" ? range.start + 1 : range.start;

      ms?.overwrite(start, range.end, replacement);
    },
    onPlaceholder(range) {
      const expr = parser.read(range);
      const raw = expr.slice(2, -1);
      const exprStart = range.start + 2;
      const exprEnd = range.end - 1;

      const replacement = transformScriptExpression(raw, options, innerI18nMap);

      if (!replacement) return;

      changed = true;

      ms?.overwrite(exprStart, exprEnd, replacement);
    },
    onScriptlet(range) {
      const expr = parser.read(range);
      const raw = expr.replace(/^\$/, "");
      const start = range.start + 1;
      const end = range.end;

      const result = transformScript(
        raw,
        { ...options, autoImportI18n: false },
        false,
        innerI18nMap
      );

      if (!result.changed) return;

      changed = true;

      ms?.overwrite(start, end, result.code);
    }
  });

  parser.parse(code);

  Object.assign(globalI18nMap, innerI18nMap);

  return { changed };
}

function processFile(code, options) {
  // 将input等未自闭合标签替换成闭合标签
  code = code.replace(/<(input|img|br|hr|meta|link)\b([^>]*)>/g, "<$1$2 />");

  const ms = options.rewrite ? new MagicString(code) : null;
  const result = transformTemplate(code, options, ms);

  return {
    changed: result.changed,
    code: result.changed && !!ms ? ms.toString() : code
  };
}

module.exports = {
  processFile
};
