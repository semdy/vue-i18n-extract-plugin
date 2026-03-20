const MagicString = require("magic-string");
const {
  globalI18nMap,
  transformText,
  generateId,
  shouldExtract
} = require("../core");

function transformTemplate(code, options, ms, templateUrl) {
  const { parseTemplate } = require("@angular/compiler");

  const ast = parseTemplate(code, templateUrl, {
    preserveWhitespaces: true
  });

  let changed = false;
  const innerI18nMap = {};

  function markChanged() {
    changed = true;
  }

  function isTCall(expr) {
    return (
      expr?.constructor?.name === "Call" &&
      expr.receiver?.name === options.translateKey
    );
  }

  function hasBoundAttribute(node, name) {
    return node.inputs?.some(i => i.name === name);
  }

  function transformTextAttribute(attr, parentNode) {
    // 有同名属性跳过绑定
    if (hasBoundAttribute(parentNode, attr.name)) {
      return;
    }

    if (!attr.value) return;

    const replacement = transformText(attr.value, options, innerI18nMap);
    if (!replacement) return;

    markChanged();

    ms?.overwrite(
      attr.sourceSpan.start.offset,
      attr.sourceSpan.end.offset,
      `[${attr.name}]="${replacement}"`
    );
  }

  function transformBoundAttribute(attr) {
    const expr = attr.value;
    if (!expr) return;

    if (expr.ast.constructor.name === "Interpolation") {
      const raw = expr.source || "";
      const replacement = transformText(
        raw.replace(/^\{\{'|'\}\}$/g, "").trim(),
        options,
        innerI18nMap
      );
      if (!replacement) return;

      markChanged();
      ms?.overwrite(
        attr.sourceSpan.start.offset,
        attr.sourceSpan.end.offset,
        `[${attr.name}]="${replacement}"`
      );
    } else {
      transformExpression(expr.ast);
    }
  }

  function transformExpression(expr) {
    if (!expr) return;

    const type = expr.constructor.name;

    switch (type) {
      case "LiteralPrimitive":
        if (typeof expr.value === "string") {
          const replacement = transformText(expr.value, options, innerI18nMap);
          if (replacement) {
            markChanged();
            ms?.overwrite(
              expr.sourceSpan.start,
              expr.sourceSpan.end,
              replacement
            );
          }
        }
        break;

      case "Binary":
        transformExpression(expr.left);
        transformExpression(expr.right);
        break;

      case "Conditional":
        transformExpression(expr.condition);
        transformExpression(expr.trueExp);
        transformExpression(expr.falseExp);
        break;

      case "BindingPipe":
        // 只处理 t pipe
        if (expr.name !== options.translateKey) {
          // transformExpression(expr.exp);
          // expr.args?.forEach(transformExpression);
          return;
        }

        // 只处理 exp 是字符串
        if (
          expr.exp.constructor.name === "LiteralPrimitive" &&
          typeof expr.exp.value === "string"
        ) {
          const text = expr.exp.value?.replace(/\n+/g, " ");

          if (!text.trim() || !shouldExtract(text, options)) return;

          const id = generateId(text, options);
          const defaultMsg = text;
          const rawArgs = [];

          // 处理参数（变量）
          expr.args?.forEach(arg => {
            const rawArg = code.slice(arg.sourceSpan.start, arg.sourceSpan.end);
            rawArgs.push(rawArg);
          });

          const pipeTailArr = [options.translateKey, rawArgs];

          if (options.keepDefaultMsg) {
            pipeTailArr.splice(options.defaultMsgPos, 0, `'${defaultMsg}'`);
          }

          const pipeTail = pipeTailArr.flat().join(" : ");
          const newPipe = `'${id}' | ${pipeTail}`;

          innerI18nMap[id] = text;

          markChanged();
          ms?.overwrite(expr.sourceSpan.start, expr.sourceSpan.end, newPipe);
        }
        break;

      case "Interpolation": // {{ ... }}
        expr.expressions.forEach(transformExpression);
        break;

      case "Call":
        if (isTCall(expr)) {
          const arg = expr.args?.[0];

          if (arg?.constructor?.name === "LiteralPrimitive") {
            const replacement = transformText(arg.value, options, innerI18nMap);

            if (replacement) {
              markChanged();

              ms?.overwrite(
                arg.sourceSpan.start,
                arg.sourceSpan.end,
                replacement.replace(
                  new RegExp(`^\\${options.translateKey}\\(|\\)$`, "g"),
                  ""
                )
              );
            }
          }
          return;
        }

        expr.args?.forEach(transformExpression);
        break;

      case "LiteralArray":
        expr.expressions.forEach(transformExpression);
        break;

      case "LiteralMap":
        expr.values.forEach(transformExpression);
        break;

      default:
        break;
    }
  }

  function walk(nodes) {
    nodes.forEach(node => {
      const type = node.constructor.name;

      switch (type) {
        case "Text":
          const replacement = transformText(node.value, options, innerI18nMap);
          if (replacement) {
            markChanged();
            ms?.overwrite(
              node.sourceSpan.start.offset,
              node.sourceSpan.end.offset,
              `{{${replacement}}}`
            );
          }
          break;

        case "BoundText": // {{ xxx }}
          transformExpression(node.value.ast, node.sourceSpan);
          break;

        case "Element":
          // 静态属性
          node.attributes?.forEach(attr => transformTextAttribute(attr, node));
          // 动态属性
          node.inputs?.forEach(transformBoundAttribute);
          // 子节点
          walk(node.children);
          break;

        // @for
        case "ForLoopBlock":
          // 遍历表达式
          transformExpression(node.expression.ast);

          // children
          walk(node.children);
          break;

        // @if
        case "IfBlock":
          node.branches.forEach(branch => {
            transformExpression(branch.expression);
            walk(branch.children);
          });
          break;

        // @switch
        case "SwitchBlock":
          transformExpression(node.expression);
          node.cases.forEach(c => {
            walk(c.children);
          });
          break;

        // @defer
        case "DeferredBlock":
          walk(node.children);
          break;

        default:
          break;
      }
    });
  }

  walk(ast.nodes);

  Object.assign(globalI18nMap, innerI18nMap);

  return {
    changed
  };
}

function processFile(code, options, templateUrl) {
  const ms = options.rewrite ? new MagicString(code) : null;
  const result = transformTemplate(code, options, ms, templateUrl);

  return {
    changed: result.changed,
    code: result.changed && !!ms ? ms.toString() : code
  };
}

module.exports = {
  processFile
};
