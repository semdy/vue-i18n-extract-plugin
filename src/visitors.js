const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");
const {
  generateId,
  extractFunctionName,
  EXCLUDED_CALL,
  shouldExtract,
} = require("./utils");
const { defaultOptions } = require("./options");

// const allowedObjects = ["this", "i18n", "vm"];

// function isTFunction(node, option) {
//   return (
//     t.isCallExpression(node) &&
//     (t.isIdentifier(node.callee, { name: option.translateKey }) || // $t(...)
//       (t.isMemberExpression(node.callee) &&
//         // t.isThisExpression(node.callee.object) &&
//         t.isIdentifier(node.callee.property, { name: option.translateKey }) && // xxx.$t(...)
//         t.isIdentifier(node.callee.object) &&
//         allowedObjects.includes(node.callee.object.name)))
//   );
// };

function isTFunction(node, option) {
  return (
    t.isCallExpression(node) &&
    (t.isIdentifier(node.callee, { name: option.translateKey }) || // $t(...)
      (t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.property, { name: option.translateKey }))) // xxx.$t(...)
  );
}

function shouldTransform(path) {
  const parent = path.parentPath;
  return !(
    parent.isImportDeclaration() ||
    parent.isImportSpecifier() ||
    (parent.isObjectProperty() && path.key === "key") ||
    parent.isObjectMethod() ||
    parent.isClassMethod() ||
    parent.isClassProperty() ||
    parent.isExportNamedDeclaration()
  );
}

function CallExpression(path, option, i18nMap) {
  if (!isTFunction(path.node, option)) return;

  const [firstArg] = path.node.arguments;
  let keyText = null;

  if (t.isStringLiteral(firstArg)) {
    keyText = firstArg.value;
  } else if (t.isTemplateLiteral(firstArg)) {
    keyText = firstArg.quasis.map((q) => q.value.cooked).join("${}");
  }

  if (!keyText) return;

  if (!shouldExtract(keyText, option.fromLang)) {
    return;
  }

  // console.log("CallExpression", path.node.arguments);

  const hashed = generateId(keyText);

  if (i18nMap) {
    i18nMap[hashed] = keyText;
  }

  if (option.rewrite) {
    const newArg = t.stringLiteral(hashed);
    path.node.arguments[0] = newArg;
  }

  // // 停止对当前节点的遍历
  // path.stop();
}

function addI18nImportIfNeeded(ast, options, generateCode) {
  let hasI18nImport = false;
  let lastImportPath = null;

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (source === options.i18nPath) {
        hasI18nImport = true;
      }
      lastImportPath = path;
    },
  });

  if (!hasI18nImport) {
    const importStatement = t.importDeclaration(
      // [t.importDefaultSpecifier(t.identifier("i18n"))],
      [
        t.importSpecifier(
          t.identifier(options.translateKey),
          t.identifier(options.translateKey)
        ),
      ],
      t.stringLiteral(options.i18nPath)
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

function createI18nPlugin(option = defaultOptions, i18nMap) {
  const excludedCall = [...option.excludedCall, ...EXCLUDED_CALL];

  return {
    visitor: {
      CallExpression(path) {
        CallExpression(path, option, i18nMap);
      },

      StringLiteral(path) {
        if (option.extractFromText === false) return;
        if (!shouldTransform(path)) return;

        let { node, parent, parentPath } = path;

        // 仅对非 $t 调用中的字符串进行处理
        if (parentPath.isCallExpression() && isTFunction(parent, option)) {
          return;
        }

        // 获取真实调用函数
        const extractFnName = extractFunctionName(parent);

        // 防止导入语句，只处理那些当前节点不是键值对的键的字符串字面量，调用语句判断当前调用语句是否包含需要过滤的调用语句
        if (
          parent?.callee?.property?.name === option.translateKey ||
          t.isImportDeclaration(parent) ||
          parent.key === node ||
          (t.isCallExpression(parent) &&
            extractFnName &&
            (excludedCall.includes(extractFnName) ||
              (extractFnName?.split(".")?.pop() &&
                excludedCall.includes(extractFnName?.split(".")?.pop() || ""))))
        ) {
          return;
        }

        const value = path.node.value;

        // const callExpr = path.findParent((p) => p.isCallExpression());

        // // 如果是 $t 调用用参数有中文，则不处理
        // if (!callExpr || callExpr.node.callee.name === option.translateKey) {
        //   return;
        // }

        if (value.trim() === "") return;
        if (!shouldExtract(value, option.fromLang)) {
          return;
        }

        // console.log("StringLiteral", value);

        const hashed = generateId(value);

        if (i18nMap) {
          i18nMap[hashed] = value;
        }

        if (option.rewrite) {
          const callExpression = t.callExpression(
            t.identifier(option.translateKey),
            [t.stringLiteral(hashed)]
          );
          path.replaceWith(callExpression);
        }
      },

      // TemplateLiteral(path) {
      //   const { node, parent } = path;
      //   // 获取真实调用函数
      //   const extractFnName = extractFunctionName(parent);
      //   // 调用语句判断当前调用语句是否包含需要过滤的调用语句
      //   if (
      //     t.isCallExpression(parent) &&
      //     extractFnName &&
      //     (excludedCall.includes(extractFnName) ||
      //       (extractFnName?.split(".")?.pop() &&
      //         excludedCall.includes(extractFnName?.split(".")?.pop() || "")))
      //   ) {
      //     return;
      //   }

      //   const raw = node.quasis.map((q) => q.value.cooked).join("${}");
      //   if (!raw.trim()) return;
      //   if (!shouldExtract(raw, option.fromLang)) {
      //     return;
      //   }

      //   if (option.extractFromText === false) return;

      //   console.log("TemplateLiteral", path.node.quasis);

      //   const hashed = generateId(raw);

      //   if (i18nMap) {
      //     i18nMap[hashed] = raw;
      //   }

      //   if (option.rewrite) {
      //     const callExpression = t.callExpression(
      //       t.identifier(option.translateKey),
      //       [t.stringLiteral(hashed)]
      //     );
      //     path.replaceWith(callExpression);
      //     // path.replaceWith(t.stringLiteral(hashed));
      //     node.expressions.forEach((expr) =>
      //       CallExpression(
      //         {
      //           node: expr,
      //           parent: node,
      //           scope: path.scope,
      //           stop: path.stop,
      //         },
      //         option,
      //         i18nMap
      //       )
      //     );
      //   }
      // },
      TemplateElement(path) {
        const { node, parent } = path;
        if (!node.value) return;

        let value = node.value.raw || node.value.cooked;

        if (value.trim() === "") return;

        // 获取真实调用函数
        const extractFnName = extractFunctionName(parent);
        // 调用语句判断当前调用语句是否包含需要过滤的调用语句
        if (
          t.isCallExpression(parent) &&
          extractFnName &&
          (excludedCall.includes(extractFnName) ||
            (extractFnName?.split(".")?.pop() &&
              excludedCall.includes(extractFnName?.split(".")?.pop() || "")))
        ) {
          return;
        }

        if (!shouldExtract(value, option.fromLang)) {
          return;
        }

        if (option.extractFromText === false) return;

        // console.log("TemplateElement", value);

        const hashed = generateId(value);

        if (i18nMap) {
          i18nMap[hashed] = value;
        }

        if (option.rewrite) {
          // 替换为字符类型翻译节点
          const tCallExpression = `${option.translateKey}('${hashed}')`;
          node.value.raw = node.value.cooked = `\${${tCallExpression}}`;
        }
      },
      JSXText(path) {
        // <div>Hello world</div>
        if (option.extractFromText === false) return;

        const text = path.node.value.trim();
        if (!text) return; // 空白或换行等，跳过

        if (!shouldExtract(text, option.fromLang)) {
          return;
        }

        // console.log("JSXText", path.node.value);

        const hashed = generateId(text);

        if (i18nMap) {
          i18nMap[hashed] = text;
        }

        if (option.rewrite) {
          // 替换为表达式 {$t("hashed")}
          path.replaceWith(
            t.jsxExpressionContainer(
              t.callExpression(t.identifier(option.translateKey), [
                t.stringLiteral(hashed),
              ])
            )
          );
        }
      },
      JSXExpressionContainer(path) {
        if (option.extractFromText === false) return;
        // <div>{"Hi"}</div>
        const expr = path.node.expression;
        if (t.isStringLiteral(expr)) {
          if (!shouldExtract(expr.value, option.fromLang)) {
            return;
          }

          // console.log("JSXExpressionContainer", path.node.expression.value);

          const hashed = generateId(expr.value);

          if (i18nMap) {
            i18nMap[hashed] = expr.value;
          }

          if (option.rewrite) {
            path.replaceWith(
              t.jsxExpressionContainer(
                t.callExpression(t.identifier(option.translateKey), [
                  t.stringLiteral(hashed),
                ])
              )
            );
          }
        }
      },
    },
  };
}

module.exports = {
  shouldTransform,
  isTFunction,
  generateId,
  addI18nImportIfNeeded,
  createI18nPlugin,
};
