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
  transformText,
  transformScriptExpression,
  keepRawTextOptions,
  isObjectRealEmpty
} from "../core/index.js";
import { createI18nVisitor } from "../visitors.js";
import {
  interopDefault,
  trimEmptyLine,
  padEmptyLine,
  normalizeText
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
    console.error("❌ Failed to parse interpolation expression:", e.message);
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
  let ms = options.rewrite ? new MagicString(templateContent) : null;

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
          const text = normalizeText(content.content);
          if (text) {
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
                ms?.overwrite(
                  node.loc.start.offset,
                  node.loc.end.offset,
                  `{{ ${newContent} }}`
                );
              }
            } catch (e) {
              console.error(
                `❌ Failed to parse template expression: text: ${text}, err: ${e}`
              );
            }
          }
        }
        if (node.type === NodeTypes.TEXT) {
          const { content: text } = node;
          try {
            const newContent = transformText(text, options, innerI18nMap);
            if (newContent) {
              // node.content = newContent;

              // 创建一个新的 INTERPOLATION 节点
              const interpolationNode = createInterpolationNode(newContent);

              // 替换原来的 TEXT 节点为 INTERPOLATION 节点
              Object.assign(node, interpolationNode);

              ms?.overwrite(
                node.loc.start.offset,
                node.loc.end.offset,
                `{{ ${newContent} }}`
              );
            }
          } catch (e) {
            console.error(
              `❌ Failed to parse text interpolation: text: ${text}, err: ${e}`
            );
          }
        }
        if (node.type === NodeTypes.ELEMENT) {
          node.props.forEach((prop, index) => {
            let text = "";
            if (prop.type === NodeTypes.ATTRIBUTE) {
              text = prop.value?.content;
              try {
                const newValue = transformText(text, options, innerI18nMap);
                if (newValue) {
                  // prop.value.content = newValue;
                  const directive = createDirectiveFromProp(prop, newValue);
                  // 将原属性替换为指令
                  node.props[index] = directive;

                  ms?.overwrite(
                    prop.loc.start.offset,
                    prop.loc.end.offset,
                    `:${prop.name}="${newValue.replace(/"/g, "'")}"`
                  );
                }
              } catch (e) {
                console.error(
                  `❌ Failed to parse static attribute: text: ${text}, err: ${e}`
                );
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
              text = normalizeText(prop.exp?.content);
              if (text) {
                try {
                  const newValue = extractTCallsFromInterpolation(
                    text,
                    options,
                    innerI18nMap
                  );
                  if (newValue) {
                    prop.exp.content = newValue;

                    ms?.overwrite(
                      prop.loc.start.offset,
                      prop.loc.end.offset,
                      `${prop.rawName}="${newValue.replace(/"/g, "'")}"`
                    );
                  }
                } catch (e) {
                  console.error(
                    `❌ Failed to parse dynamic directive: text: ${text}, err: ${e}`
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

  Object.assign(globalI18nMap, innerI18nMap);

  const isEmpty = isObjectRealEmpty(innerI18nMap);

  if (options.rewrite) {
    if (isEmpty) {
      return {
        changed: false,
        code: templateContent
      };
    }

    // if (options.sourcemap) {
    //   const map = ms.generateMap({
    //     source: filePath,
    //     hires: true
    //   });

    //   return {
    //     changed: true,
    //     code: trimEmptyLine(ms.toString()),
    //     map
    //   };
    // }

    return {
      changed: true,
      code: trimEmptyLine(ms.toString())
    };

    // return {
    //   changed: true,
    //   code: genTemplate(ast).code
    // };
  }

  return {
    changed: !isEmpty,
    code: templateContent
  };
}

function processFile(code, options) {
  const {
    descriptor: { script, scriptSetup, template }
  } = parseSFC(code);

  let transformedScript = "";
  let transformedScriptSetup = "";
  let transformedTemplate = "";
  let scriptChanged = false;
  let scriptSetupChanged = false;
  let templateChanged = false;

  const scriptContent = script?.content;
  const scriptSetupContent = scriptSetup?.content;
  const templateContent = template?.content;

  if (scriptContent) {
    const scriptResult = transformScript(scriptContent, options);
    scriptChanged = scriptResult.changed;
    transformedScript = scriptResult.code;
  }

  if (scriptSetupContent) {
    const scriptSetupResult = transformScript(scriptSetupContent, options);
    scriptSetupChanged = scriptSetupResult.changed;
    transformedScriptSetup = scriptSetupResult.code;
  }

  if (templateContent) {
    const templateResult = transformTemplate(templateContent, options);
    templateChanged = templateResult.changed;
    transformedTemplate = templateResult.code;
  }

  if (options.rewrite) {
    const ms = new MagicString(code);
    let changed = false;

    function overwrite(loc, replacement) {
      changed = true;
      ms.overwrite(loc.start.offset, loc.end.offset, padEmptyLine(replacement));
    }

    if (scriptChanged) {
      overwrite(script.loc, transformedScript);
    }

    if (scriptSetupChanged) {
      overwrite(scriptSetup.loc, transformedScriptSetup);
    }

    if (templateChanged) {
      overwrite(template.loc, transformedTemplate);
    }

    if (changed) {
      return {
        changed: true,
        code: ms.toString()
      };
    }
  }

  return {
    changed: scriptChanged || scriptSetupChanged || templateChanged,
    code
  };
}

export { processFile };
