const MagicString = require("magic-string");
const { globalI18nMap, transformScript, transformText } = require("../core");

function transformTemplate(htmlAst, options, ms) {
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

  function replaceTextNode(node, text) {
    const replacement = transformText(text, options, innerI18nMap);
    if (!replacement) return;

    changed = true;

    ms?.overwrite(node.start, node.end, `{${replacement}}`);
  }

  function replaceTemplateElement(node) {
    const replacement = transformText(node.value.raw, options, innerI18nMap);
    if (!replacement) return;

    changed = true;

    ms?.overwrite(node.start, node.end, `\${${replacement}}`);
  }

  function transformExpression(expr) {
    if (!expr) return;

    switch (expr.type) {
      case "Literal":
        if (typeof expr.value === "string") {
          const replacement = transformText(expr.value, options, innerI18nMap);
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
            const replacement = transformText(arg.value, options, innerI18nMap);

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
        transformExpression(expr.callee);
        expr.arguments.forEach(transformExpression);
        break;

      case "MemberExpression":
        transformExpression(expr.object);
        transformExpression(expr.property);
        break;

      case "ArrayExpression":
        expr.elements.forEach(transformExpression);
        break;

      case "ObjectExpression":
        expr.properties.forEach(prop => {
          transformExpression(prop.value);
        });
        break;

      case "UnaryExpression":
        transformExpression(expr.argument);
        break;

      case "SequenceExpression":
        expr.expressions.forEach(transformExpression);
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
      const replacement = transformText(textNode.data, options, innerI18nMap);

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

function processFile(code, options) {
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
  const templateResult = transformTemplate(ast.html, options, ms);

  if (templateResult.changed) {
    changed = true;
  }

  return {
    changed,
    code: changed && !!ms ? ms.toString() : code
  };
}

module.exports = {
  processFile
};
