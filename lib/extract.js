const path = require("path");
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
  getLangJsonPath,
  readJsonWithDefault,
  isVueLike,
  isSvelte
} = require("./utils");
const { defaultOptions } = require("./options");
const { autoTranslate, cleanTranslate, cleanI18nMap } = require("./translate");

let globalI18nMap = {};
const keepRawTextOptions = {
  jsescOption: {
    minimal: true // 保留原始字符串，不被转义成Unicode
  }
};

function encodeToString(str) {
  return str.indexOf("'") === -1 ? `'${str}'` : `"${str}"`;
}

function warningOnce(message) {
  if (!warningOnce.warned) {
    console.warn(message);
    warningOnce.warned = true;
  }
}

function rebuildPattern(p, extensions) {
  if (path.extname(p) !== "") {
    return p;
  }
  if (p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  if (p.endsWith("**")) {
    return `${p}/*.{${extensions}}`;
  }
  if (p.endsWith("*")) {
    return `${p}.{${extensions}}`;
  }
  return `${p}/**/*.{${extensions}}`;
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
    const { code: exprCode } = generate(extractedNode, keepRawTextOptions);
    return exprCode;
  } else {
    console.warn("⚠️ 未能提取到 _expr 表达式");
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

async function writeI18nMapToFile(i18nMap, options, checkDiffs) {
  const outputJSONPath = getLangJsonPath(options.fromLang, options);
  let originalJson;

  if (checkDiffs) {
    // 检查是否有差异
    originalJson = readJsonWithDefault(outputJSONPath, null);
    if (originalJson) {
      const i18nMapKeys = Object.keys(i18nMap);
      let hasDiff = i18nMapKeys.length !== Object.keys(originalJson).length;
      if (!hasDiff) {
        hasDiff = i18nMapKeys.some(key => i18nMap[key] !== originalJson[key]);
      }
      if (!hasDiff) {
        console.warn("👉 新的 i18nMap 与源文件没有差异，跳过写入文件...");
        return Promise.resolve({ hasDiff: false, data: i18nMap });
      }
    }
  }

  originalJson = originalJson ?? readJsonWithDefault(outputJSONPath, null);
  if (originalJson) {
    if (options.cleanTranslate) {
      i18nMap = Object.assign(cleanI18nMap(i18nMap, originalJson), i18nMap);
    } else {
      i18nMap = Object.assign(originalJson, i18nMap);
    }
  }

  await fs.outputJson(outputJSONPath, i18nMap, {
    spaces: 2
  });

  return Promise.resolve({ hasDiff: true, data: i18nMap });
}

async function handleFinalI18nMap(i18nMap, options, checkDiffs) {
  const { hasDiff } = await writeI18nMapToFile(i18nMap, options, checkDiffs);

  if (!hasDiff) return;

  if (options.autoTranslate) {
    await autoTranslate(i18nMap, options);
  }

  if (options.cleanTranslate) {
    await cleanTranslate(options);
  }
}

function transformScript(code, options, useAst, i18nMap) {
  const innerI18nMap = i18nMap || {};
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"]
  });

  const newOptions = {
    ...options,
    keepDefaultMsg: options.keepRaw ? false : options.keepDefaultMsg,
    autoImportI18n: options.rewrite && options.autoImportI18n
  };

  traverse(ast, createI18nVisitor(newOptions, innerI18nMap));

  const isEmpty = isEmptyObject(innerI18nMap);

  if (!isEmpty) {
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
      code: generate(ast, { retainLines: true, ...keepRawTextOptions }).code
    };
  }

  return {
    changed: false,
    code
  };
}

function _shouldExtract(text, options) {
  return (options.shouldExtract || shouldExtract)(text, options.fromLang);
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
            if (!text || !_shouldExtract(text, options)) return;
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
                _shouldExtract(text, options)
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
                _shouldExtract(text, options)
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

function transformSvelteTemplate(htmlAst, options, ms) {
  let changed = false;
  const innerI18nMap = {};

  function isTCall(expr) {
    return (
      expr &&
      expr.type === "CallExpression" &&
      expr.callee?.type === "Identifier" &&
      expr.callee.name === options.translateKey
    );
  }

  function transformText(text) {
    text = text?.replace(/\n+/g, " ").trim();
    if (!text || !_shouldExtract(text, options)) return null;
    const replacement = transformScriptExpression(
      encodeToString(text),
      options,
      innerI18nMap
    );

    return replacement || null;
  }

  function replaceTextNode(node, text) {
    const replacement = transformText(text);
    if (!replacement) return;

    changed = true;

    ms?.overwrite(node.start, node.end, `{${replacement}}`);
  }

  function replaceTemplateElement(node) {
    const replacement = transformText(node.value.raw);
    if (!replacement) return;

    changed = true;

    ms?.overwrite(node.start, node.end, `\${${replacement}}`);
  }

  function transformExpression(expr) {
    if (!expr) return;

    switch (expr.type) {
      case "Literal":
        if (typeof expr.value === "string") {
          const replacement = transformText(expr.value);
          if (replacement) {
            changed = true;
            ms?.overwrite(expr.start, expr.end, replacement);
          }
        }
        break;

      case "TemplateLiteral":
        // 静态部分
        expr.quasis.forEach(q => {
          replaceTemplateElement(q);
        });

        // 动态部分
        expr.expressions.forEach(transformExpression);
        break;

      case "BinaryExpression":
      case "LogicalExpression":
        transformExpression(expr.left);
        transformExpression(expr.right);
        break;

      case "ConditionalExpression":
        transformExpression(expr.test);
        transformExpression(expr.consequent);
        transformExpression(expr.alternate);
        break;

      case "CallExpression":
        if (isTCall(expr)) {
          const arg = expr.arguments[0];

          // 只处理字符串字面量
          if (arg && arg.type === "Literal" && typeof arg.value === "string") {
            const replacement = transformText(arg.value);

            if (replacement) {
              changed = true;
              // 只替换参数，不包一层
              ms?.overwrite(
                arg.start,
                arg.end,
                replacement.replace(
                  new RegExp(`^\\${options.translateKey}\\(|\\)$`, "g"),
                  ""
                )
              );
            }
          }
          return;
        }
        expr.arguments.forEach(transformExpression);
        break;

      case "ArrayExpression":
        expr.elements.forEach(transformExpression);
        break;

      case "ObjectExpression":
        expr.properties.forEach(prop => {
          transformExpression(prop.value);
        });
        break;

      default:
        break;
    }
  }

  function transformAttribute(attr) {
    if (!attr.value || attr.value.length === 0) return;

    // 静态属性
    if (attr.value.length === 1 && attr.value[0].type === "Text") {
      const textNode = attr.value[0];
      const replacement = transformText(textNode.data);

      if (replacement) {
        changed = true;

        ms?.overwrite(attr.start, attr.end, `${attr.name}={${replacement}}`);
      }
      return;
    }

    // 动态属性
    attr.value.forEach(v => {
      if (v.type === "MustacheTag") {
        transformExpression(v.expression);
      }
    });
  }

  function walk(node) {
    if (!node) return;

    // 纯文本
    if (node.type === "Text") {
      replaceTextNode(node, node.data);
    }

    // Mustache 表达式
    if (node.type === "MustacheTag") {
      transformExpression(node.expression);
    }

    // 元素 / 组件
    if (node.type === "Element" || node.type === "InlineComponent") {
      node.attributes?.forEach(transformAttribute);
    }

    node.children?.forEach(walk);
  }

  walk(htmlAst);

  Object.assign(globalI18nMap, innerI18nMap);

  return { changed };
}

function processSvelteFile(code, options) {
  const { parse } = require("svelte/compiler");
  const ast = parse(code);
  const ms = options.rewrite ? new MagicString(code) : null;

  let changed = false;

  // 处理 <script>
  if (ast.instance) {
    const scriptSource = code.slice(
      ast.instance.content.start,
      ast.instance.content.end
    );
    const scriptResult = transformScript(scriptSource, options);

    if (scriptResult.changed) {
      changed = true;
      ms?.overwrite(
        ast.instance.content.start,
        ast.instance.content.end,
        scriptResult.code
      );
    }
  }

  // 处理 <script context="module">
  if (ast.module) {
    const moduleSource = code.slice(
      ast.module.content.start,
      ast.module.content.end
    );
    const moduleResult = transformScript(moduleSource, options);

    if (moduleResult.changed) {
      changed = true;
      ms?.overwrite(
        ast.module.content.start,
        ast.module.content.end,
        moduleResult.code
      );
    }
  }

  // 处理 template（html）
  const templateResult = transformSvelteTemplate(ast.html, options, ms);

  if (templateResult.changed) {
    changed = true;
  }

  return {
    changed,
    code: changed && !!ms ? ms.toString() : code
  };
}

async function formatFile(code, filePath) {
  const options = await prettier.resolveConfig(filePath);

  const plugins = options.plugins || [];

  if (isSvelte(filePath)) {
    try {
      const sveltePlugin = await import("prettier-plugin-svelte");
      plugins.push(sveltePlugin.default || sveltePlugin);
    } catch {
      warningOnce(`
⚠️ [extract-i18n]

Detected a Svelte project but "prettier-plugin-svelte" is not installed.

Run:

npm install -D prettier-plugin-svelte
`);
    }
  }

  try {
    return await prettier.format(code, {
      ...options,
      filepath: filePath,
      plugins
    });
  } catch (e) {
    return code;
  }
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
  const globPattern = includePath.map(p => rebuildPattern(p, extensions));
  const files = await glob(globPattern, { ignore: options.excludedPath });

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");

    let changed = false;
    let code = "";

    if (!content.trim()) continue;

    try {
      if (isVueLike(file)) {
        const vueContent = processVueFile(content, options);
        changed = vueContent.changed;
        code = vueContent.code;
      } else if (isSvelte(file)) {
        const svelteResult = processSvelteFile(content, options);
        changed = svelteResult.changed;
        code = svelteResult.code;
      } else {
        const scriptContent = transformScript(content, options);
        changed = scriptContent.changed;
        code = scriptContent.code;
      }
    } catch (err) {
      console.error(`❌ processing error with file ${file}`, err);
    }

    if (options.rewrite && changed) {
      code = await formatFile(code, file);
      await fs.writeFile(file, code, "utf8");
    }
  }

  await handleFinalI18nMap(globalI18nMap, options);
}

module.exports = {
  extractI18n,
  writeI18nMapToFile,
  handleFinalI18nMap,
  globalI18nMap
};
