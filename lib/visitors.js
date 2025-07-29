const t = require("@babel/types");
const {
  generateId,
  extractFunctionName,
  EXCLUDED_CALL,
  shouldExtract
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

      keyText = keyText.trim();

      if (!keyText) return;

      if (!shouldExtract(keyText, option.fromLang)) {
        return;
      }

      // console.log("CallExpression", path.node.arguments);

      const hashed = generateId(keyText);

      if (i18nMap) {
        i18nMap[hashed] = keyText;
      }

      const newArg = t.stringLiteral(hashed);
      path.node.arguments[0] = newArg;
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
      const extractFnName = extractFunctionName(path);

      // 防止导入语句，只处理那些当前节点不是键值对的键的字符串字面量，调用语句判断当前调用语句是否包含需要过滤的调用语句
      if (
        parent?.callee?.property?.name === option.translateKey ||
        t.isImportDeclaration(parent) ||
        parent.key === node ||
        (extractFnName &&
          (excludedCall.includes(extractFnName) ||
            (extractFnName?.split(".")?.pop() &&
              excludedCall.includes(extractFnName?.split(".")?.pop() || ""))))
      ) {
        return;
      }

      const value = path.node.value.trim();

      // const callExpr = path.findParent((p) => p.isCallExpression());

      // // 如果是 $t 调用用参数有中文，则不处理
      // if (!callExpr || callExpr.node.callee.name === option.translateKey) {
      //   return;
      // }

      if (!value || !shouldExtract(value, option.fromLang)) {
        return;
      }

      // console.log("StringLiteral", value);

      const hashed = generateId(value);

      if (i18nMap) {
        i18nMap[hashed] = value;
      }

      const callExpression = t.callExpression(
        t.identifier(option.translateKey),
        [t.stringLiteral(hashed)]
      );
      // 如果是 JSX 属性值，需要包裹在 JSXExpressionContainer 中
      if (parentPath.isJSXAttribute()) {
        const jsxExpression = t.jsxExpressionContainer(callExpression);
        path.replaceWith(jsxExpression);
      } else {
        // 其他情况直接替换
        path.replaceWith(callExpression);
      }
    },

    TemplateElement(path) {
      const { node } = path;
      if (!node.value) return;

      let value = (node.value.raw || node.value.cooked).trim();

      if (!value) return;

      // 获取真实调用函数
      const extractFnName = extractFunctionName(path);
      // 调用语句判断当前调用语句是否包含需要过滤的调用语句
      if (
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

      // 替换为字符类型翻译节点
      const tCallExpression = `${option.translateKey}('${hashed}')`;
      node.value.raw = node.value.cooked = `\${${tCallExpression}}`;
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

      // 替换为表达式 {$t("hashed")}
      path.replaceWith(
        t.jsxExpressionContainer(
          t.callExpression(t.identifier(option.translateKey), [
            t.stringLiteral(hashed)
          ])
        )
      );
    },
    JSXExpressionContainer(path) {
      // <div>{"Hi"}</div>
      if (option.extractFromText === false) return;
      const expr = path.node.expression;

      if (t.isStringLiteral(expr)) {
        const value = expr.value.trim();

        if (!value) return;
        if (!shouldExtract(value, option.fromLang)) {
          return;
        }

        // console.log("JSXExpressionContainer", path.node.expression.expr);

        const hashed = generateId(value);

        if (i18nMap) {
          i18nMap[hashed] = value;
        }

        path.replaceWith(
          t.jsxExpressionContainer(
            t.callExpression(t.identifier(option.translateKey), [
              t.stringLiteral(hashed)
            ])
          )
        );
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
