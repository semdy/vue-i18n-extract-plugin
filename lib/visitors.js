const t = require("@babel/types");
const {
  generateId,
  extractFunctionName,
  EXCLUDED_CALL,
  shouldExtract,
  importNodeLocalName
} = require("./utils");

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

function createI18nVisitor(option, i18nMap) {
  const excludedCall = [...option.excludedCall, ...EXCLUDED_CALL];
  const localImportName = option.useLocalImportName
    ? importNodeLocalName(option.translateKey)
    : option.translateKey;

  return {
    CallExpression(path) {
      if (!isTFunction(path.node, option)) return;

      const [firstArg] = path.node.arguments;
      let keyText = null;

      if (t.isStringLiteral(firstArg)) {
        keyText = firstArg.value;
      } else if (t.isTemplateLiteral(firstArg)) {
        keyText = firstArg.quasis.map(q => q.value.cooked).join("${}");
      }

      if (option.useLocalImportName) {
        if (t.isIdentifier(path.node.callee)) {
          path.node.callee = t.identifier(localImportName);
        } else if (t.isMemberExpression(path.node.callee)) {
          // obj.$t("中文")、this.$t("中文")情况的处理
          path.node.callee.property = t.identifier(localImportName);
        }
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
        const callExpression = t.callExpression(t.identifier(localImportName), [
          t.stringLiteral(hashed)
        ]);
        // 如果是 JSX 属性值，需要包裹在 JSXExpressionContainer 中
        if (parentPath.isJSXAttribute()) {
          const jsxExpression = t.jsxExpressionContainer(callExpression);
          path.replaceWith(jsxExpression);
        } else {
          // 其他情况直接替换
          path.replaceWith(callExpression);
        }
      }
    },

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
        const tCallExpression = `${localImportName}('${hashed}')`;
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
            t.callExpression(t.identifier(localImportName), [
              t.stringLiteral(hashed)
            ])
          )
        );
      }
    },
    JSXExpressionContainer(path) {
      // <div>{"Hi"}</div>
      if (option.extractFromText === false) return;
      const expr = path.node.expression;
      if (t.isStringLiteral(expr)) {
        if (!shouldExtract(expr.value, option.fromLang)) {
          return;
        }

        // console.log("JSXExpressionContainer", path.node.expression.expr);

        const hashed = generateId(expr.value);

        if (i18nMap) {
          i18nMap[hashed] = expr.value;
        }

        if (option.rewrite) {
          path.replaceWith(
            t.jsxExpressionContainer(
              t.callExpression(t.identifier(localImportName), [
                t.stringLiteral(hashed)
              ])
            )
          );
        }
      }
    }
  };
}

function createI18nPlugin(option, i18nMap) {
  return () => {
    return {
      visitor: createI18nVisitor(option, i18nMap)
    };
  };
}

module.exports = {
  shouldTransform,
  isTFunction,
  createI18nVisitor,
  createI18nPlugin
};
