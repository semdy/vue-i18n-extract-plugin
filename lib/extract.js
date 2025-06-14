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
  NodeTypes
} = require("@vue/compiler-dom");
const MagicString = require("magic-string");
const prettier = require("prettier");
const { createI18nVisitor } = require("./visitors");
const {
  relativeCWDPath,
  shouldExtract,
  trimEmptyLine,
  padEmptyLine,
  isEmptyObject,
  readJsonWithDefault
} = require("./utils");
const { defaultOptions } = require("./options");
const { autoTranslate, cleanTranslate } = require("./translate");

let globalI18nMap = {};

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
    }
  });

  if (extractedNode) {
    const { code: exprCode } = generate(extractedNode);
    return exprCode;
  } else {
    console.warn("未能提取到 _expr 表达式");
    return null;
  }
}

function transformScriptExpression(expression, options, i18nMap) {
  const wrapped = wrapAsStatement(expression);
  const transformedAst = transformScript(
    wrapped,
    { ...options, autoImportI18n: false },
    true,
    i18nMap
  );
  const transformedCode = unwrapTransformedCode(transformedAst);

  // if (useAst) {
  //   // 使用 transformScript 解析之后确保返回 CallExpression
  //   const ast = parser.parseExpression(transformedCode);

  //   // 判断是否是 CallExpression 类型，并返回
  //   if (t.isCallExpression(ast)) {
  //     return ast;
  //   } else {
  //     throw new Error(`Expected CallExpression but got: ${ast.type}`);
  //   }
  // }
  return transformedCode;
}

function extractTCallsFromInterpolation(code, options, i18nMap) {
  let ast;
  try {
    // 这是一个 JS 表达式，不是完整语句，所以使用 parseExpression
    ast = parser.parseExpression(code, {
      plugins: ["typescript"]
    });
  } catch (e) {
    console.error("插值解析失败：", e.message);
    return;
  }

  // 包装成完整的 AST
  const program = t.program([t.expressionStatement(ast)]);

  traverse(program, createI18nVisitor(options, i18nMap));

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

function addI18nImportIfNeeded(ast, options, generateCode) {
  let hasI18nImport = false;
  let lastImportPath = null;

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (source === options.i18nPkgImportPath) {
        hasI18nImport = true;
      }
      lastImportPath = path;
    }
  });

  if (!hasI18nImport) {
    const importStatement = t.importDeclaration(
      // [t.importDefaultSpecifier(t.identifier("i18n"))],
      [
        t.importSpecifier(
          t.identifier(options.i18nPkgImportName),
          t.identifier(options.i18nPkgImportName)
        )
      ],
      t.stringLiteral(options.i18nPkgImportPath)
    );

    // 如果存在其他 import 语句，插入到最后一个导入语句之后
    if (lastImportPath) {
      // 插入一个空行
      // lastImportPath.insertAfter(t.emptyStatement());
      lastImportPath.insertAfter(importStatement);
    } else {
      // 插入一个空行
      // ast.program.body.unshift(t.emptyStatement());
      // 如果没有任何 import 语句，插入到文件的最前面
      ast.program.body.unshift(importStatement);
    }
  }

  if (generateCode) {
    return generate(ast);
  }

  return ast;
}

function transformScript(code, options, useAst, i18nMap) {
  const innerI18nMap = i18nMap || {};
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"]
  });

  traverse(ast, createI18nVisitor(options, innerI18nMap));

  const isEmpty = isEmptyObject(innerI18nMap);

  if (!isEmpty) {
    if (options.autoImportI18n && options.rewrite) {
      addI18nImportIfNeeded(ast, options);
    }
    Object.assign(globalI18nMap, innerI18nMap);
  }

  if (useAst) {
    return ast;
  }

  if (options.rewrite) {
    if (isEmpty) {
      return { changed: false, code };
    }
    return {
      changed: true,
      code: generate(ast, { retainLines: true }).code
    };
  }

  return {
    changed: false,
    code
  };
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
            console.error(`模板表达式解析失败: text: ${text}, err: ${e}`);
          }
        }
        if (node.type === NodeTypes.TEXT) {
          let { content: text } = node;
          try {
            text = text.replace(/\n+/g, " ").trim();
            if (!text) return;
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
            console.error(`文本解析失败: text: ${text}, err: ${e}`);
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
                shouldExtract(text, options.fromLang)
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
                  console.error(`静态属性解析失败: text: ${text}, err: ${e}`);
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
                shouldExtract(text, options.fromLang)
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
                  console.error(`动态指令解析失败: text: ${text}, err: ${e}`);
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

function processVueFile(code, options) {
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
        .replace(scriptContent, padEmptyLine(transformedScript))
        .replace(templateContent, padEmptyLine(transformedTemplate))
    };
  }

  return { changed: false, code };
}

async function formatFile(code, filePath) {
  const options = await prettier.resolveConfig(filePath);
  return await prettier.format(code, {
    ...options,
    filepath: filePath
  });
}

async function extractI18n(options) {
  options = { ...defaultOptions, ...options };

  let includePath = Array.isArray(options.includePath)
    ? options.includePath
    : [options.includePath];

  includePath = includePath.map(p => {
    if (p instanceof RegExp) {
      p = p.source.replace(/\\/g, "").replace(/\/\//, "/");
    }
    return relativeCWDPath(p);
  });

  const extensions = options.allowedExtensions
    .map(s => s.replace(/^\./, ""))
    .join(",");
  const globPattern = includePath.map(p => `${p}**/*.{${extensions}}`);
  const files = await glob(globPattern);

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");

    let changed = false;
    let code = "";

    if (!content.trim()) continue;

    if (file.endsWith(".vue")) {
      const vueContent = processVueFile(content, options);
      changed = vueContent.changed;
      code = vueContent.code;
    } else {
      const scriptContent = transformScript(content, options);
      changed = scriptContent.changed;
      code = scriptContent.code;
    }

    if (options.rewrite && changed) {
      code = await formatFile(code, file);
      await fs.writeFile(file, code, "utf8");
    }
  }

  const outputJSONPath =
    relativeCWDPath(options.outputPath) +
    options.customGenLangFileName(options.fromLang) +
    ".json";

  if (options.incrementalExtract) {
    const originalJson = readJsonWithDefault(outputJSONPath, null);
    if (originalJson) {
      globalI18nMap = Object.assign(originalJson, globalI18nMap);
    }
  }

  await fs.outputJson(outputJSONPath, globalI18nMap, {
    spaces: 2
  });

  if (options.autoTranslate) {
    await autoTranslate(options, globalI18nMap);
  }

  if (options.cleanTranslate) {
    await cleanTranslate(options);
  }
}

module.exports = { extractI18n };
