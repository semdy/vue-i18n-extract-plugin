const t = require("@babel/types");
const {
  generateId: _generateId,
  extractFunctionName,
  EXCLUDED_CALL,
  shouldExtract: _shouldExtract
} = require("./utils");

function isTFunction(node, option) {
  return (
    t.isCallExpression(node) &&
    (t.isIdentifier(node.callee, { name: option.translateKey }) || // $t(...)
      (t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.property, {
          name: option.translateKey.split(".").pop()
        }))) // xxx.$t(...)
  );
}

function isVNodeCall(path, nodeName) {
  if (!path.isCallExpression()) return false;
  const callee = path.node.callee;
  return (
    (t.isIdentifier(callee) && callee.name === nodeName) ||
    (t.isMemberExpression(callee) &&
      t.isIdentifier(callee.property) &&
      callee.property.name === nodeName)
  );
}

function isJSXElement(path, nodeName) {
  const jsxElement = path.findParent(p => p.isJSXOpeningElement());

  if (
    jsxElement &&
    t.isJSXIdentifier(jsxElement.node.name, { name: nodeName })
  ) {
    const jsxAttr = path.findParent(p => p.isJSXAttribute());
    const attrName = jsxAttr.node.name.name;
    if (attrName === "msg" || attrName === "values") {
      return true;
    }
  }
  return false;
}

function getPropKey(propNode) {
  if (t.isIdentifier(propNode.key)) {
    return propNode.key.name;
  }
  if (t.isStringLiteral(propNode.key)) {
    return propNode.key.value; // .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  }
  return null;
}

/**
 * 向 hoisted dynamicProps 数组中追加 propKey（若不存在）
 * @returns 是否真的发生了修改
 */
function pushDynamicPropsIfMissing(arr, propKey) {
  const hasKey = arr.elements.some(
    el => t.isStringLiteral(el) && el.value === propKey
  );

  if (!hasKey) {
    arr.elements.push(t.stringLiteral(propKey));
  }

  return !hasKey;
}

// 自动补齐动态属性，如 createVNode(c, {message: dynamicValue}) => createVNode(c, {message: dynamicValue}, null, 8, ['message'])
function transformDirectiveIfNeeded(path, parentPath) {
  let hasCreateVNode = false;
  // 属性值情况，如 title: "xxx"
  if (parentPath.isObjectProperty()) {
    const propKey = getPropKey(parentPath.node);

    if (!propKey) return;

    const vNodeCall = path.findParent(
      p =>
        isVNodeCall(p, "_createVNode") || isVNodeCall(p, "_createElementVNode")
    );

    if (vNodeCall) {
      hasCreateVNode = true;
      const args = vNodeCall.node.arguments;
      // PatchFlag = 8 (PROPS), dynamicProps = ["title"]
      const patchFlagIndex = 3;
      const dynamicPropsIndex = 4;

      // 确保第 3 个参数（children）存在，否则补 null
      if (args.length === 2) {
        args.push(t.nullLiteral()); // => 第三个参数
      }

      // 补齐参数数组长度到第 5 个参数（index: 4）
      while (args.length <= dynamicPropsIndex) {
        args.push(null);
      }

      // 设置 patchFlag = 8
      if (!args[patchFlagIndex]) {
        args[patchFlagIndex] = t.numericLiteral(8);
      }

      // 设置 dynamicProps = ["propKey"]
      const existingDynamicProps = args[dynamicPropsIndex];

      if (t.isIdentifier(existingDynamicProps)) {
        const arr = hoistedMap.get(existingDynamicProps.name);
        if (arr) {
          pushDynamicPropsIfMissing(arr, propKey);
        }
      }

      if (!existingDynamicProps) {
        args[dynamicPropsIndex] = t.arrayExpression([t.stringLiteral(propKey)]);
      } else if (t.isArrayExpression(existingDynamicProps)) {
        const existingKeys = new Set(
          existingDynamicProps.elements
            .filter(el => t.isStringLiteral(el))
            .map(el => el.value)
        );
        if (!existingKeys.has(propKey)) {
          existingDynamicProps.elements.push(t.stringLiteral(propKey));
        }
      }
    }
  }
  return hasCreateVNode;
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

function generateText(rawText, hashedText, options) {
  if (options.keepRaw && options.rewrite) {
    return rawText;
  }
  return hashedText;
}

function generateId(rawText, options) {
  if (typeof options.generateId === "function") {
    return options.generateId(rawText, _generateId);
  }
  return _generateId(rawText);
}

function generateJSXElement(name, id, msg) {
  // 生成 <Trans id="hashed" msg="xxxx" />
  const openingElement = t.jsxOpeningElement(
    t.jsxIdentifier(name),
    [
      t.jsxAttribute(t.jsxIdentifier("id"), t.stringLiteral(id)),
      msg ? t.jsxAttribute(t.jsxIdentifier("msg"), t.stringLiteral(msg)) : null
    ].filter(Boolean),
    true // self-closing
  );

  return t.jsxElement(openingElement, null, [], true);
}

function unwrapVueCacheCallIfNeeded(path) {
  const assignPath = path.parentPath;
  if (!assignPath?.isAssignmentExpression({ operator: "=" })) {
    return false;
  }

  const logicalPath = assignPath.parentPath;
  if (!logicalPath?.isLogicalExpression({ operator: "||" })) {
    return false;
  }

  const { left, right } = logicalPath.node;

  // 校验 left: _cache[x]
  const isCacheMember =
    t.isMemberExpression(left) &&
    t.isIdentifier(left.object) &&
    left.object.name.startsWith("_cache");

  // 校验 right: (_cache[x] = createTextVNode(...))
  const isSameAssignment =
    right === assignPath.node &&
    t.isMemberExpression(assignPath.node.left) &&
    t.isCallExpression(assignPath.node.right);

  if (!isCacheMember || !isSameAssignment) {
    return false;
  }

  normalizeVNodePatchFlag(assignPath.node.right);
  // 用 createTextVNode(...) 替换整个 _cache || (...)
  logicalPath.replaceWith(assignPath.node.right);
  return true;
}

function unwrapVueSlotArrayCache(path) {
  // 1. 找 ArrayExpression
  const arrayPath = path.findParent(p => p.isArrayExpression());
  if (!arrayPath) return false;

  // 2. array 是 assignment 的 right
  const assignPath = arrayPath.parentPath;
  if (!assignPath?.isAssignmentExpression({ operator: "=" })) return false;

  // 3. assignment 在 LogicalExpression || 中
  const logicalPath = assignPath.parentPath;
  if (!logicalPath?.isLogicalExpression({ operator: "||" })) return false;

  // 4. logical 在 SpreadElement 中
  const spreadPath = logicalPath.parentPath;
  if (!spreadPath?.isSpreadElement()) return false;

  // 5. 校验 _cache[x]
  const left = logicalPath.node.left;
  const isCache =
    t.isMemberExpression(left) &&
    t.isIdentifier(left.object) &&
    left.object.name.startsWith("_cache");

  if (!isCache) return false;

  // 删除 array 里的 vnode参数-1
  arrayPath.node.elements.forEach(el => {
    normalizeVNodePatchFlag(el);
  });

  // unwrap：用 array.elements 替换 spread(...)
  spreadPath.replaceWithMultiple(arrayPath.node.elements);

  return true;
}

function normalizeVNodePatchFlag(node) {
  const path = { node, isCallExpression: () => t.isCallExpression(node) };
  if (!isAnyVNodeCall(path)) return;
  if (isVNodeCall(path, "_createTextVNode")) return;

  const args = node.arguments;
  if (!args || args.length < 4) return;

  const flag = args[3];
  if (t.isNumericLiteral(flag) && flag.value !== -1) {
    return;
  }
  args.splice(3, 1); // 删除第4个参数 -1
}

function isDynamicTextExpression(node) {
  // 只要不是 StringLiteral，100% 是动态文本
  return !t.isStringLiteral(node);
}

function unwrapNearestCacheBoundary(path) {
  let p = path.parentPath;

  while (p) {
    // 先拆[..._cache2[0] || (_cache2[0] = [createBaseVNode(...)])]
    if (!unwrapVueSlotArrayCache(p)) {
      // 再尝试拆 _cache2[0] || (_cache2[0] = createTextVNode(...))
      unwrapVueCacheCallIfNeeded(p);
    }
    p = p.parentPath;
  }
}

const VNODE_CALLS = new Set([
  "_createTextVNode",
  "_createElementVNode",
  "_createElementBlock",
  "_createVNode",
  "_createBlock",
  "_createBaseVNode",
  "_createStaticVNode"
]);

function isAnyVNodeCall(path) {
  if (!path.isCallExpression()) return false;

  const callee = path.node.callee;

  if (t.isIdentifier(callee)) {
    return VNODE_CALLS.has(callee.name);
  }

  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return VNODE_CALLS.has(callee.property.name);
  }

  return false;
}

function findReactComponentFunction(path) {
  let current = path;

  while (current && current.parentPath) {
    const p = current.parentPath;

    // function Xxx() {}
    if (
      p.isFunctionDeclaration() &&
      t.isIdentifier(p.node.id) &&
      /^[A-Z]/.test(p.node.id.name)
    ) {
      return p;
    }

    // const Xxx = function () {} / () => {}
    if (
      (p.isFunctionExpression() || p.isArrowFunctionExpression()) &&
      p.parentPath?.isVariableDeclarator() &&
      t.isIdentifier(p.parentPath.node.id) &&
      /^[A-Z]/.test(p.parentPath.node.id.name)
    ) {
      return p;
    }

    current = p;
  }

  return null;
}

function markComponentUseHooks(path) {
  const fnPath = findReactComponentFunction(path);
  if (!fnPath) return;

  fnPath.node.__useHooks = true;
}

function isInJSXRuntimeCall(path) {
  let current = path;

  while (current && current.parentPath) {
    const p = current.parentPath;

    if (p.isCallExpression()) {
      const { callee, arguments: args } = p.node;

      let isJSXFn = false;

      if (t.isIdentifier(callee)) {
        isJSXFn = ["_jsx", "_jsxs", "jsx", "jsxs", "jsxDEV"].includes(
          callee.name
        );
      } else if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.property, { name: "createElement" })
      ) {
        // React.createElement
        isJSXFn = true;
      }

      if (!isJSXFn) {
        current = p;
        continue;
      }

      // 检验函数中是否有children属性（为了严谨）
      if (
        args.length >= 2 &&
        t.isObjectExpression(args[1]) &&
        args[1].properties.some(
          prop =>
            t.isObjectProperty(prop) &&
            (t.isIdentifier(prop.key, { name: "children" }) ||
              t.isStringLiteral(prop.key, { value: "children" }))
        )
      ) {
        return true;
      }
    }

    current = p;
  }

  return false;
}

function createHooksDeclaration(options) {
  return t.variableDeclaration("const", [
    t.variableDeclarator(
      t.objectPattern([
        t.objectProperty(
          t.identifier(options.translateKey),
          t.identifier(options.translateKey),
          false,
          true
        )
      ]),
      t.callExpression(t.identifier(options.hooksIdentifier), [])
    )
  ]);
}

function injectHooks(fnPath, options) {
  const body = fnPath.get("body");

  if (!body.isBlockStatement()) {
    // ArrowFunctionExpression 简写：() => <div />
    body.replaceWith(
      t.blockStatement([
        createHooksDeclaration(options),
        t.returnStatement(body.node)
      ])
    );
    return;
  }

  const statements = body.get("body");

  // 判断是否已存在hooks
  if (
    statements.some(
      s =>
        s.isVariableDeclaration() &&
        s.node.declarations.some(
          d =>
            t.isCallExpression(d.init) &&
            t.isIdentifier(d.init.callee, {
              name: options.hooksIdentifier
            })
        )
    )
  ) {
    return;
  }

  body.unshiftContainer("body", createHooksDeclaration(options));
}

function shouldExtract(text, options) {
  return (options.shouldExtract || _shouldExtract)(text, options.fromLang);
}

const hoistedMap = new Map();

function createI18nVisitor(option, i18nMap) {
  const excludedCall = [...option.excludedCall, ...EXCLUDED_CALL];

  return {
    Program(path) {
      path.traverse({
        VariableDeclarator(p) {
          const { id, init } = p.node;
          if (
            t.isIdentifier(id) &&
            t.isArrayExpression(init) &&
            id.name.startsWith("_hoisted_")
          ) {
            hoistedMap.set(id.name, init);
          }
        }
      });
    },
    CallExpression(path) {
      if (!isTFunction(path.node, option)) {
        if (isVNodeCall(path, "_createTextVNode")) {
          const args = path.node.arguments;
          if (!args.length) return;
          const content = args[0];
          // 是否动态文本
          if (isDynamicTextExpression(content)) {
            args[1] = t.numericLiteral(1); // PatchFlags.TEXT createTextVNode(" " + toDisplayString$1(text)) => createTextVNode(" " + toDisplayString$1(text), 1)
          }
        }
        return;
      }

      const args = path.node.arguments;
      const [firstArg, secondArg] = args;
      let keyText = null;

      if (t.isStringLiteral(firstArg)) {
        keyText = firstArg.value;
      } else if (t.isTemplateLiteral(firstArg)) {
        keyText = firstArg.quasis.map(q => q.value.cooked).join("${}");
      }

      keyText = keyText?.trim();

      if (!keyText) return;

      if (!shouldExtract(keyText, option)) {
        return;
      }

      const hashed = generateId(keyText, option);

      if (i18nMap) {
        i18nMap[hashed] = keyText;
      }

      const newArg = t.stringLiteral(generateText(keyText, hashed, option));
      args[0] = newArg;

      if (!option.keepDefaultMsg) return;

      const defaultMsgNode = t.stringLiteral(keyText);

      if (!secondArg) {
        args.push(defaultMsgNode);
        return;
      }

      if (!t.isStringLiteral(secondArg)) {
        args.splice(1, 0, defaultMsgNode);
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

      // 跳过<Trans msg="你好，{name}" values={{name: '世界'} /> msg和values属性的转换
      if (isJSXElement(path, option.JSXElement)) {
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

      if (!value || !shouldExtract(value, option)) {
        return;
      }

      const hashed = generateId(value, option);

      if (i18nMap) {
        i18nMap[hashed] = value;
      }

      if (option.injectHooks && isInJSXRuntimeCall(path)) {
        markComponentUseHooks(path);
      }

      // 生成 _ctx.$t("hashed")
      let callExpression = t.callExpression(
        t.memberExpression(
          t.identifier("_ctx"),
          t.identifier(option.translateKey)
        ),
        [
          t.stringLiteral(generateText(value, hashed, option)),
          option.keepDefaultMsg ? t.stringLiteral(value) : null
        ].filter(Boolean)
      );

      // 判断是否createTextVNode或MemberExpression（如 Vue.createTextVNode）
      if (isVNodeCall(parentPath, "_createTextVNode")) {
        // createTextVNode强制补充第二个参数 1
        parentPath.node.arguments = [callExpression, t.numericLiteral(1)];
        unwrapNearestCacheBoundary(path);
        // 是否 vue.createElementVNode(...)，且该 StringLiteral 是第三个参数
      } else if (
        isVNodeCall(parentPath, "_createElementVNode") ||
        isVNodeCall(parentPath, "_createElementBlock")
      ) {
        const callExpr = parentPath.node;
        const args = callExpr.arguments;
        // 第 3 个参数是 children
        const argIndex = args.findIndex(arg => arg === path.node);
        if (argIndex === 2) {
          args[2] = callExpression;
          // 强制 patchFlag = 1
          if (args.length < 4) {
            args.push(t.numericLiteral(1));
          } else {
            args[3] = t.numericLiteral(1);
          }
          unwrapNearestCacheBoundary(path);
        }
      } else {
        const hasCreateVNode = transformDirectiveIfNeeded(path, parentPath);
        if (!hasCreateVNode) {
          // 生成 $t("hashed")
          callExpression = t.callExpression(
            t.identifier(option.translateKey),
            [
              t.stringLiteral(generateText(value, hashed, option)),
              option.keepDefaultMsg ? t.stringLiteral(value) : null
            ].filter(Boolean)
          );
        }
      }

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
      if (option.extractFromText === false) return;

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

      if (!shouldExtract(value, option)) {
        return;
      }

      const hashed = generateId(value, option);

      if (i18nMap) {
        i18nMap[hashed] = value;
      }

      if (option.injectHooks && isInJSXRuntimeCall(path)) {
        markComponentUseHooks(path);
      }

      // 替换为字符类型翻译节点
      const tCallExpression = option.keepDefaultMsg
        ? `${option.translateKey}('${generateText(value, hashed, option)}', ${JSON.stringify(value)})`
        : `${option.translateKey}('${generateText(value, hashed, option)}')`;

      node.value.raw = node.value.cooked = `\${${tCallExpression}}`;
    },
    JSXText(path) {
      // <div>Hello world</div>
      if (option.extractFromText === false) return;

      const text = path.node.value.trim();
      if (!text) return; // 空白或换行等，跳过

      if (!shouldExtract(text, option)) {
        return;
      }

      const hashed = generateId(text, option);

      if (i18nMap) {
        i18nMap[hashed] = text;
      }

      if (option.injectHooks) {
        markComponentUseHooks(path);
      }

      if (option.jsx) {
        const jsxElement = generateJSXElement(
          option.JSXElement,
          hashed,
          option.keepDefaultMsg ? text : null
        );
        path.replaceWith(jsxElement);
        return;
      }

      // 替换为表达式 {$t("hashed")}
      path.replaceWith(
        t.jsxExpressionContainer(
          t.callExpression(
            t.identifier(option.translateKey),
            [
              t.stringLiteral(generateText(text, hashed, option)),
              option.keepDefaultMsg ? t.stringLiteral(text) : null
            ].filter(Boolean)
          )
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
        if (!shouldExtract(value, option)) {
          return;
        }

        const hashed = generateId(value, option);

        if (i18nMap) {
          i18nMap[hashed] = value;
        }

        if (option.injectHooks) {
          markComponentUseHooks(path);
        }

        if (
          option.jsx &&
          (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment())
        ) {
          const jsxElement = generateJSXElement(
            option.JSXElement,
            hashed,
            option.keepDefaultMsg ? value : null
          );
          path.replaceWith(jsxElement);
          return;
        }

        path.replaceWith(
          t.jsxExpressionContainer(
            t.callExpression(
              t.identifier(option.translateKey),
              [
                t.stringLiteral(generateText(value, hashed, option)),
                option.keepDefaultMsg ? t.stringLiteral(value) : null
              ].filter(Boolean)
            )
          )
        );
      }
    },
    JSXElement(path) {
      // <Trans id="aaa" msg="xxx" />
      const openingElement = path.node.openingElement;
      if (
        !t.isJSXIdentifier(openingElement.name) ||
        openingElement.name.name !== option.JSXElement
      ) {
        return;
      }

      let idAttr = null;
      let idValue = null;
      let msgValue = null;

      // 遍历属性，查找 id 和 msg
      openingElement.attributes.forEach(attr => {
        if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) return;

        if (attr.name.name === "id") {
          idAttr = attr;
          if (attr.value && t.isStringLiteral(attr.value)) {
            idValue = attr.value.value;
          }
        }

        if (attr.name.name === "msg") {
          if (attr.value && t.isStringLiteral(attr.value)) {
            msgValue = attr.value.value;
          }
        }
      });

      // 计算 id，如果未提供，则使用 msg 的哈希值
      if (!idValue && msgValue) {
        idValue = generateId(msgValue, option);

        if (i18nMap) {
          i18nMap[idValue] = msgValue;
        }
      }

      // 有id并且有msg的情况
      if (idValue && msgValue) {
        if (i18nMap) {
          i18nMap[idValue] = msgValue;
        }
      }

      if (idValue) {
        // 添加或更新 id 属性
        if (idAttr) {
          idAttr.value = t.stringLiteral(idValue);
        } else {
          openingElement.attributes.push(
            t.jsxAttribute(t.jsxIdentifier("id"), t.stringLiteral(idValue))
          );
        }
      }

      if (!option.keepDefaultMsg && !option.keepRaw) {
        // 移除 msg
        openingElement.attributes = openingElement.attributes.filter(
          attr =>
            !(
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name) &&
              attr.name.name === "msg"
            )
        );
      }
    },
    // visitor：Function / ArrowFunction
    Function: {
      exit(path) {
        if (!option.injectHooks) return;
        if (!path.node.__useHooks) return;

        // 防止重复注入
        if (path.node.__i18nInjected) return;
        path.node.__i18nInjected = true;

        injectHooks(path, option);
      }
    }
  };
}

function createI18nPlugin(option, i18nMap) {
  return () => {
    return {
      visitor: createI18nVisitor({ ...option, keepRaw: false }, i18nMap)
    };
  };
}

module.exports = {
  shouldTransform,
  isTFunction,
  createI18nVisitor,
  createI18nPlugin
};
