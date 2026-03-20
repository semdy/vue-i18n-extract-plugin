import MagicString from "magic-string";
import { createRequire } from "module";
import {
  globalI18nMap,
  generateId,
  shouldExtract,
  transformScript
} from "../core/index.js";

const require = createRequire(import.meta.url);

function transformTemplate(code, options, ms, baseOffset = 0) {
  const { preprocess } = require("@glimmer/syntax");
  const ast = preprocess(code);

  let changed = false;
  const innerI18nMap = {};
  const lineStarts = [0];

  for (let i = 0; i < code.length; i += 1) {
    if (code[i] === "\n") {
      lineStarts.push(i + 1);
    }
  }

  function toOffset(position) {
    if (!position) return null;

    if (typeof position.offset === "number") {
      return position.offset;
    }

    if (
      typeof position.line !== "number" ||
      typeof position.column !== "number" ||
      position.line < 1
    ) {
      return null;
    }

    const lineStart = lineStarts[position.line - 1];
    if (typeof lineStart !== "number") {
      return null;
    }

    return lineStart + position.column;
  }

  function getRange(node) {
    const start = toOffset(node?.loc?.start);
    const end = toOffset(node?.loc?.end);

    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      start < 0 ||
      end < start
    ) {
      return null;
    }

    return { start, end };
  }

  function overwrite(node, replacement) {
    if (!ms) return;

    const range = getRange(node);
    if (!range) return;

    changed = true;
    ms.overwrite(baseOffset + range.start, baseOffset + range.end, replacement);
  }

  function normalizeText(text) {
    return text?.replace(/\n+/g, " ").trim();
  }

  function quote(text) {
    return JSON.stringify(text);
  }

  function isTranslateHelper(node) {
    return (
      node &&
      node.type === "MustacheStatement" &&
      node.path?.original === options.translateKey
    );
  }

  function createTranslation(text) {
    const normalized = normalizeText(text);

    if (!normalized || !shouldExtract(normalized, options)) {
      return null;
    }

    if (options.keepRaw) {
      return {
        key: normalized,
        defaultMsg: normalized
      };
    }

    const id = generateId(normalized, options);
    innerI18nMap[id] = normalized;

    return {
      key: id,
      defaultMsg: normalized
    };
  }

  function buildHelperArgs(text) {
    const translation = createTranslation(text);
    if (!translation) return null;

    const args = [quote(translation.key)];

    if (!options.keepRaw && options.keepDefaultMsg) {
      args.splice(options.defaultMsgPos, 0, quote(translation.defaultMsg));
    }

    return args.join(" ");
  }

  function buildMustacheCall(text) {
    const args = buildHelperArgs(text);
    if (!args) return null;

    return `${options.translateKey} ${args}`;
  }

  function buildSubExpression(text) {
    const call = buildMustacheCall(text);
    if (!call) return null;

    return `(${call})`;
  }

  function transformAttribute(attr) {
    if (!attr.value) return;

    /**
     * 1. 静态属性
     * <div title="文本">
     */
    if (attr.value.type === "TextNode") {
      const replacement = buildMustacheCall(attr.value.chars);

      if (replacement) {
        overwrite(attr, `${attr.name}={{${replacement}}}`);
      }
      return;
    }

    /**
     * 2. 动态属性
     * <div title={{xxx}}>
     */
    if (attr.value.type === "MustacheStatement") {
      transformExpression(attr.value);
    }

    /**
     * 3. concat
     * <div title={{concat "a" b}}>
     */
    if (attr.value.type === "ConcatStatement") {
      attr.value.parts.forEach(part => {
        if (part.type === "TextNode") {
          const replacement = buildMustacheCall(part.chars);
          if (replacement) {
            overwrite(part, `{{${replacement}}}`);
          }
        } else {
          transformExpression(part);
        }
      });
    }
  }

  function transformExpression(node) {
    if (!node) return;

    switch (node.type) {
      /**
       * {{ "文本" }}
       */
      case "StringLiteral": {
        const replacement = buildSubExpression(node.value);
        if (replacement) {
          overwrite(node, replacement);
        }
        break;
      }

      /**
       * {{t "文本"}}
       */
      case "MustacheStatement": {
        if (isTranslateHelper(node)) {
          const first = node.params[0];

          if (first?.type === "StringLiteral") {
            const replacement = buildHelperArgs(first.value);

            if (replacement) {
              overwrite(first, replacement);
            }
          }
          return;
        }

        node.params?.forEach(transformExpression);
        node.hash?.pairs?.forEach(p => transformExpression(p.value));
        break;
      }

      /**
       * concat helper
       * {{concat "a" b}}
       */
      case "SubExpression": {
        node.params?.forEach(transformExpression);
        node.hash?.pairs?.forEach(p => transformExpression(p.value));
        break;
      }

      default:
        break;
    }
  }

  function walk(node) {
    if (!node) return;

    switch (node.type) {
      // Template（.gjs / .gts）
      case "Template": {
        node.body?.forEach(walk);
        break;
      }

      // .hbs root
      case "Program": {
        node.body?.forEach(walk);
        break;
      }

      /**
       * 纯文本
       * <div>文本</div>
       */
      case "TextNode": {
        const replacement = buildMustacheCall(node.chars);
        if (replacement) {
          overwrite(node, `{{${replacement}}}`);
        }
        break;
      }

      // Mustache {{xxx}}
      case "MustacheStatement": {
        transformExpression(node);
        break;
      }

      // 元素节点
      case "ElementNode": {
        // 处理属性
        node.attributes?.forEach(transformAttribute);

        // 子节点
        node.children?.forEach(walk);
        break;
      }

      // Block {{#if}}{{/if}}
      case "BlockStatement": {
        transformExpression(node.path);
        node.params?.forEach(transformExpression);
        node.hash?.pairs?.forEach(p => transformExpression(p.value));

        node.program?.body?.forEach(walk);
        node.inverse?.body?.forEach(walk);
        break;
      }

      default:
        break;
    }
  }

  walk(ast);

  Object.assign(globalI18nMap, innerI18nMap);

  return {
    changed,
    code: changed && ms ? ms.toString() : code
  };
}

function processFile(code, options) {
  const templateRE = /<template\b[^>]*>[\s\S]*?<\/template>/g;
  const matches = [...code.matchAll(templateRE)];

  if (matches.length === 0) {
    const ms = options.rewrite ? new MagicString(code) : null;
    const result = transformTemplate(code, options, ms);

    return {
      changed: result.changed,
      code: result.changed && !!ms ? ms.toString() : code
    };
  }

  const transformedTemplates = new Map();
  let strippedCode = code;
  let templateChanged = false;

  matches.forEach((match, index) => {
    const templateCode = match[0];
    const placeholder = `__EXTRACT_I18N_TEMPLATE_${index}__;`;
    const templateMs = options.rewrite ? new MagicString(templateCode) : null;
    const result = transformTemplate(templateCode, options, templateMs);

    if (result.changed) {
      templateChanged = true;
    }

    transformedTemplates.set(
      placeholder,
      result.changed ? result.code : templateCode
    );
    strippedCode = strippedCode.replace(templateCode, placeholder);
  });

  const scriptResult = transformScript(strippedCode, options);
  let outputCode = scriptResult.code;

  transformedTemplates.forEach((templateCode, placeholder) => {
    outputCode = outputCode.replace(placeholder, templateCode);
  });

  return {
    changed: templateChanged || scriptResult.changed,
    code: templateChanged || scriptResult.changed ? outputCode : code
  };
}

export { processFile };
