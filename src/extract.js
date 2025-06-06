const fs = require("fs-extra");
const glob = require("fast-glob");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");
const { parse: parseSFC } = require("@vue/compiler-sfc");
const {
  parse: parseTemplate,
  transform,
  // generate: genTemplate,
  getBaseTransformPreset,
  NodeTypes,
} = require("@vue/compiler-dom");
const MagicString = require("magic-string");
const { createI18nPlugin, addI18nImportIfNeeded } = require("./visitors");
const {
  defaultOptions,
  relativeCWDPath,
  shouldExtract,
  trimEmptyLine,
  padEmptyLine,
} = require("./utils");

const i18nMap = {};

function encodeToString(str) {
  return str.indexOf("'") === -1 ? `'${str}'` : `"${str}"`;
}

function wrapAsStatement(expression) {
  return `const _expr = ${expression};`;
}

function unwrapTransformedCode(ast) {
  let extractedNode = null;

  traverse(ast, {
    VariableDeclarator(path) {
      if (path.node.id.name === "_expr") {
        extractedNode = path.node.init;
        path.stop();
      }
    },
  });

  if (extractedNode) {
    const { code: exprCode } = generate(extractedNode);
    return exprCode;
  } else {
    console.warn("未能提取到 _expr 表达式");
    return null;
  }
}

function transformScriptExpression(expression, options, useAst) {
  const wrapped = wrapAsStatement(expression);
  const transformedAst = transformScript(
    wrapped,
    { ...options, autoImportI18n: false },
    true
  );
  const transformedCode = unwrapTransformedCode(transformedAst);

  if (useAst) {
    // 使用 transformScript 解析之后确保返回 CallExpression
    const ast = parser.parseExpression(transformedCode);

    // 判断是否是 CallExpression 类型，并返回
    if (t.isCallExpression(ast)) {
      return ast;
    } else {
      throw new Error(`Expected CallExpression but got: ${ast.type}`);
    }
  }
  return transformedCode;
}

function extractTCallsFromInterpolation(code, options) {
  let ast;
  try {
    // 这是一个 JS 表达式，不是完整语句，所以使用 parseExpression
    ast = parser.parseExpression(code, {
      plugins: ["typescript"],
    });
  } catch (e) {
    console.error("插值解析失败：", e.message);
    return;
  }

  // 包装成完整的 AST
  const program = t.program([t.expressionStatement(ast)]);

  traverse(program, createI18nPlugin(options, i18nMap).visitor);

  if (options.rewrite) {
    return generate(ast, { compact: true }).code;
  }

  // return ast;
}

function createInterpolationNode(content) {
  const interpolationNode = {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
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
      isStatic: false,
    },
    arg: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: prop.name,
      isStatic: true,
    },
    modifiers: [],
    loc: prop.loc,
  };
}

function transformScript(code, options, useAst) {
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  if (options.autoImportI18n && options.rewrite) {
    addI18nImportIfNeeded(ast, options);
  }

  traverse(ast, createI18nPlugin(options, i18nMap).visitor);

  if (useAst) {
    return ast;
  }

  if (options.rewrite) {
    return generate(ast).code;
  }

  return ast;
}

function transformTemplate(templateContent, options, filePath) {
  const magicString = new MagicString(templateContent);

  const ast = parseTemplate(templateContent, {
    comments: true, // 保留注释
    whitespace: "preserve", // 保留空白
  });

  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(true);

  transform(ast, {
    nodeTransforms: [
      ...nodeTransforms,
      (node) => {
        if (node.type === NodeTypes.INTERPOLATION) {
          const { content } = node;

          if (!content || !content.content.trim()) return;

          const text = content.content.trim();
          try {
            let newContent = "";
            // {{ '中文' }} 不包含 $t
            if (text.indexOf(options.translateKey) === -1) {
              newContent = transformScriptExpression(text, options);
            } else {
              newContent = extractTCallsFromInterpolation(text, options);
            }
            if (newContent) {
              content.content = newContent;
              magicString.overwrite(
                node.loc.start.offset,
                node.loc.end.offset,
                `{{ ${newContent} }}`
              );
            }
          } catch (e) {
            console.error(`模板表达式解析失败: text: ${text}, err: ${e}`);
          }
        }
        if (node.type === NodeTypes.TEXT) {
          const { content: text } = node;
          try {
            if (!text || text.trim() === "") return;
            const newContent = transformScriptExpression(
              encodeToString(text.trim()),
              options
            );
            if (newContent) {
              // node.content = newContent;

              // 创建一个新的 INTERPOLATION 节点
              const interpolationNode = createInterpolationNode(newContent);

              // 替换原来的 TEXT 节点为 INTERPOLATION 节点
              Object.assign(node, interpolationNode);

              magicString.overwrite(
                node.loc.start.offset,
                node.loc.end.offset,
                `{{ ${newContent} }}`
              );
            }
          } catch (e) {
            console.error(`文本解析失败: text: ${text}, err: ${e}`);
          }
        }
        if (node.type === NodeTypes.ELEMENT) {
          node.props.forEach((prop, index) => {
            let text = "";
            if (prop.type === NodeTypes.ATTRIBUTE) {
              text = prop.value?.content;
              if (text && typeof text === "string" && shouldExtract(text)) {
                try {
                  const newValue = transformScriptExpression(
                    encodeToString(text.trim()),
                    options
                  );
                  if (newValue) {
                    // prop.value.content = newValue;
                    const directive = createDirectiveFromProp(prop, newValue);
                    // 将原属性替换为指令
                    node.props[index] = directive;

                    magicString.overwrite(
                      prop.loc.start.offset,
                      prop.loc.end.offset,
                      `:${prop.name}="${newValue.replace(/"/g, "'")}"`
                    );
                  }
                } catch (e) {
                  console.error(`静态属性解析失败: text: ${text}, err: ${e}`);
                }
              }
            }
            if (prop.type === NodeTypes.DIRECTIVE && prop.name === "bind") {
              text = prop.exp?.content;
              if (text && typeof text === "string" && shouldExtract(text)) {
                try {
                  const newValue = extractTCallsFromInterpolation(
                    text.trim(),
                    options
                  );
                  if (newValue) {
                    prop.exp.content = newValue;

                    magicString.overwrite(
                      prop.loc.start.offset,
                      prop.loc.end.offset,
                      `${prop.rawName}="${newValue.replace(/"/g, "'")}"`
                    );
                  }
                } catch (e) {
                  console.error(`动态指令解析失败: text: ${text}, err: ${e}`);
                }
              }
            }
          });
        }
      },
    ],
    directiveTransforms,
  });

  if (options.rewrite) {
    if (options.sourcemap) {
      const map = magicString.generateMap({
        source: filePath,
        hires: true,
      });

      return {
        code: trimEmptyLine(magicString.toString()),
        map,
      };
    }

    return trimEmptyLine(magicString.toString());

    // return genTemplate(ast).code;
  }
}

function processVueFile(content, options, filePath) {
  const sfc = parseSFC(content);

  let transformedScript = "";
  let transformedTemplate = "";

  const scriptContent =
    sfc.descriptor.script?.content || sfc.descriptor.scriptSetup?.content || "";
  const templateContent = sfc.descriptor.template?.content || "";

  if (scriptContent) {
    transformedScript = transformScript(scriptContent, options);
  }

  if (templateContent) {
    transformedTemplate = transformTemplate(templateContent, options, filePath);
  }

  if (options.rewrite) {
    return content
      .replace(scriptContent, padEmptyLine(transformedScript))
      .replace(templateContent, padEmptyLine(transformedTemplate));
  }
}

async function extractI18n(options = defaultOptions) {
  let includePath = Array.isArray(options.includePath)
    ? options.includePath
    : [options.includePath];
  includePath = includePath.map((p) => {
    if (p instanceof RegExp) {
      p = p.source.replace(/\\/g, "").replace(/\/\//, "/");
    }
    p = relativeCWDPath(p);
    return p.endsWith("/") ? p : p + "/";
  });
  const globPattern = includePath.map((p) => `${p}**/*.{js,jsx,ts,tsx,vue}`);
  const files = await glob(globPattern);

  for (const file of files) {
    let content = await fs.readFile(file, "utf8");

    if (file.endsWith(".vue")) {
      content = processVueFile(content, options, file);
    } else {
      content = transformScript(content, options);
    }

    if (options.rewrite && content) {
      await fs.writeFile(file, content, "utf8");
    }
  }

  await fs.outputJson(relativeCWDPath(options.outputPath), i18nMap, {
    spaces: 2,
  });
}

module.exports = { extractI18n };
