import parser from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
import t from "@babel/types";
import { parse as parseSFC } from "@vue/compiler-sfc";
import {
  parse as parseTemplate,
  transform,
  // generate: genTemplate,
  getBaseTransformPreset,
  NodeTypes
} from "@vue/compiler-dom";
import MagicString from "magic-string";
import {
  globalI18nMap,
  transformScript,
  transformScriptExpression,
  keepRawTextOptions,
  encodeToString,
  shouldExtract
} from "../core/index.js";
import { createI18nVisitor } from "../visitors.js";
import {
  interopDefault,
  trimEmptyLine,
  padEmptyLine,
  isEmptyObject
} from "../utils.js";

const traverse = interopDefault(traverseModule);
const generate = interopDefault(generateModule);

function createInterpolationNode(content) {
  const interpolationNode = {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content
    }
  };
  return interpolationNode;
}

function createDirectiveFromProp(prop, content) {
  function getDirectiveExpression() {
    if (content) return content;
    if (prop.value) {
      return `'${prop.value.content}'`;
    }

    return "true";
  }

  return {
    type: NodeTypes.DIRECTIVE,
    name: "bind",
    rawName: `:${prop.name}`,
    exp: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: getDirectiveExpression(),
      isStatic: false
    },
    arg: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: prop.name,
      isStatic: true
    },
    modifiers: [],
    loc: prop.loc
  };
}

function extractTCallsFromInterpolation(code, options, i18nMap) {
  let ast;
  try {
    // 这是一个 JS 表达式，不是完整语句，所以使用 parseExpression
    ast = parser.parseExpression(code, {
      plugins: ["typescript"]
    });
  } catch (e) {
    console.error("❌ 插值解析失败：", e.message);
    return;
  }

  // 包装成完整的 AST
  const program = t.program([t.expressionStatement(ast)]);

  traverse(
    program,
    createI18nVisitor(
      {
        ...options,
        autoImportI18n: false,
        keepDefaultMsg: options.keepRaw ? false : options.keepDefaultMsg
      },
      i18nMap
    )
  );

  if (options.rewrite) {
    return generate(ast, { compact: true, ...keepRawTextOptions }).code;
  }

  // return ast;
}

function transformTemplate(templateContent, options) {
  const innerI18nMap = {};
  let magicString;

  if (options.rewrite) {
    magicString = new MagicString(templateContent);
  }

  const ast = parseTemplate(templateContent, {
    comments: true, // 保留注释
    whitespace: "preserve" // 保留空白
  });

  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(true);

  transform(ast, {
    nodeTransforms: [
      ...nodeTransforms,
      node => {
        if (node.type === NodeTypes.INTERPOLATION) {
          const { content } = node;
          if (!content) return;
          const text = content.content.replace(/\n+/g, " ").trim();
          if (!text) return;
          try {
            let newContent = "";
            // {{ '中文' }} 不包含 $t
            if (text.indexOf(options.translateKey) === -1) {
              newContent = transformScriptExpression(
                text,
                options,
                innerI18nMap
              );
            } else {
              newContent = extractTCallsFromInterpolation(
                text,
                options,
                innerI18nMap
              );
            }
            if (newContent) {
              content.content = newContent;
              magicString?.overwrite(
                node.loc.start.offset,
                node.loc.end.offset,
                `{{ ${newContent} }}`
              );
            }
          } catch (e) {
            console.error(`❌ 模板表达式解析失败: text: ${text}, err: ${e}`);
          }
        }
        if (node.type === NodeTypes.TEXT) {
          let { content: text } = node;
          try {
            text = text.replace(/\n+/g, " ").trim();
            if (!text || !shouldExtract(text, options)) return;
            const newContent = transformScriptExpression(
              encodeToString(text),
              options,
              innerI18nMap
            );
            if (newContent) {
              // node.content = newContent;

              // 创建一个新的 INTERPOLATION 节点
              const interpolationNode = createInterpolationNode(newContent);

              // 替换原来的 TEXT 节点为 INTERPOLATION 节点
              Object.assign(node, interpolationNode);

              magicString?.overwrite(
                node.loc.start.offset,
                node.loc.end.offset,
                `{{ ${newContent} }}`
              );
            }
          } catch (e) {
            console.error(`❌ 文本解析失败: text: ${text}, err: ${e}`);
          }
        }
        if (node.type === NodeTypes.ELEMENT) {
          node.props.forEach((prop, index) => {
            let text = "";
            if (prop.type === NodeTypes.ATTRIBUTE) {
              text = prop.value?.content;
              if (
                text &&
                typeof text === "string" &&
                shouldExtract(text, options)
              ) {
                try {
                  const newValue = transformScriptExpression(
                    encodeToString(text.trim()),
                    options,
                    innerI18nMap
                  );
                  if (newValue) {
                    // prop.value.content = newValue;
                    const directive = createDirectiveFromProp(prop, newValue);
                    // 将原属性替换为指令
                    node.props[index] = directive;

                    magicString?.overwrite(
                      prop.loc.start.offset,
                      prop.loc.end.offset,
                      `:${prop.name}="${newValue.replace(/"/g, "'")}"`
                    );
                  }
                } catch (e) {
                  console.error(
                    `❌ 静态属性解析失败: text: ${text}, err: ${e}`
                  );
                }
              }
            }
            if (prop.type === NodeTypes.DIRECTIVE && prop.name === "bind") {
              const arg = prop.arg;
              if (
                arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
                arg.content === "key"
              ) {
                return; // 忽略 key
              }
              text = prop.exp?.content;
              if (
                text &&
                typeof text === "string" &&
                shouldExtract(text, options)
              ) {
                try {
                  const newValue = extractTCallsFromInterpolation(
                    text.trim(),
                    options,
                    innerI18nMap
                  );
                  if (newValue) {
                    prop.exp.content = newValue;

                    magicString?.overwrite(
                      prop.loc.start.offset,
                      prop.loc.end.offset,
                      `${prop.rawName}="${newValue.replace(/"/g, "'")}"`
                    );
                  }
                } catch (e) {
                  console.error(
                    `❌ 动态指令解析失败: text: ${text}, err: ${e}`
                  );
                }
              }
            }
          });
        }
      }
    ],
    directiveTransforms
  });

  const isEmpty = isEmptyObject(innerI18nMap);

  if (!isEmpty) {
    Object.assign(globalI18nMap, innerI18nMap);
  }

  if (options.rewrite) {
    if (isEmpty) {
      return {
        changed: false,
        code: templateContent
      };
    }

    // if (options.sourcemap) {
    //   const map = magicString.generateMap({
    //     source: filePath,
    //     hires: true
    //   });

    //   return {
    //     changed: true,
    //     code: trimEmptyLine(magicString.toString()),
    //     map
    //   };
    // }

    return {
      changed: true,
      code: trimEmptyLine(magicString.toString())
    };

    // return {
    //   changed: true,
    //   code: genTemplate(ast).code
    // };
  }

  return {
    changed: false,
    code: templateContent
  };
}

function processFile(code, options) {
  const sfc = parseSFC(code);

  let transformedScript = "";
  let transformedTemplate = "";
  let scriptChanged = false;
  let templateChanged = false;

  const scriptContent =
    sfc.descriptor.script?.content || sfc.descriptor.scriptSetup?.content || "";
  const templateContent = sfc.descriptor.template?.content || "";

  if (scriptContent) {
    const scriptResult = transformScript(scriptContent, options);
    scriptChanged = scriptResult.changed;
    transformedScript = scriptResult.code;
  }

  if (templateContent) {
    const templateResult = transformTemplate(templateContent, options);
    templateChanged = templateResult.changed;
    transformedTemplate = templateResult.code;
  }

  if (options.rewrite && (scriptChanged || templateChanged)) {
    return {
      changed: true,
      code: code
        .replace(
          scriptContent,
          padEmptyLine(transformedScript.replaceAll("$", "┇┇┇"))
        )
        .replaceAll("┇┇┇", "$")
        .replace(templateContent, padEmptyLine(transformedTemplate))
    };
  }

  return { changed: false, code };
}

export { processFile };
