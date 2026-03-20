import t from "@babel/types";
import { babelI18nImportTransform } from "./i18n-import-transform.js";
import { processAngularFile } from "./parsers/index.js";
import { generateId, shouldExtract } from "./core/index.js";
import { extractFunctionName, hasHtmlTag, EXCLUDED_CALL } from "./utils.js";

function isTFunction(pathOrFnName, option) {
  const getLastName = memberName => {
    return memberName.split(".").pop();
  };

  const compareForResult = fnName => {
    return (
      fnName === option.translateKey ||
      getLastName(fnName) === option.translateKey
    );
  };

  if (typeof pathOrFnName === "string") {
    return compareForResult(pathOrFnName);
  }

  return compareForResult(extractFunctionName(pathOrFnName));
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

function isComponentName(name) {
  return (
    /^[A-Z]/.test(name) || // React / dev
    /^s_[A-Za-z0-9]+$/.test(name) // Qwik prod
  );
}

function findComponentFunction(path) {
  let current = path;

  while (current && current.parentPath) {
    const p = current.parentPath;

    // React FunctionDeclaration function Xxx() {}
    if (
      p.isFunctionDeclaration() &&
      t.isIdentifier(p.node.id) &&
      isComponentName(p.node.id.name)
    ) {
      return p;
    }

    // React const Xxx = function () {} / () => {}
    if (
      (p.isFunctionExpression() || p.isArrowFunctionExpression()) &&
      p.parentPath?.isVariableDeclarator() &&
      t.isIdentifier(p.parentPath.node.id) &&
      isComponentName(p.parentPath.node.id.name)
    ) {
      return p;
    }

    // Solid _$$component(...)
    if (
      p.isCallExpression() &&
      t.isIdentifier(p.node.callee, { name: "_$$component" })
    ) {
      const fnIndex = p.node.arguments.findIndex(
        arg => t.isFunctionExpression(arg) || t.isArrowFunctionExpression(arg)
      );

      if (fnIndex >= 0) {
        return p.get(`arguments.${fnIndex}`);
      }
    }

    current = p;
  }

  return null;
}

function markComponentUseHooks(path) {
  if (!path) return;
  const fnPath = findComponentFunction(path);
  if (!fnPath) return;

  fnPath.node.__useHooks = true;
}

function unwrapJSXCallee(callee) {
  // (0, foo.jsxDEV)
  if (t.isSequenceExpression(callee)) {
    return unwrapJSXCallee(callee.expressions[callee.expressions.length - 1]);
  }

  // 剥掉 TypeScript 包装
  if (
    t.isTSNonNullExpression(callee) ||
    t.isTSAsExpression(callee) ||
    t.isTSTypeAssertion(callee)
  ) {
    return unwrapJSXCallee(callee.expression);
  }

  // Identifier（jsx / _jsx / jsxDEV）
  if (t.isIdentifier(callee)) {
    return callee;
  }

  // MemberExpression（React.createElement / mod.jsxDEV）
  if (t.isMemberExpression(callee)) {
    return callee;
  }

  return null;
}

function hasJSXMember(name) {
  return [
    "jsx",
    "jsxs",
    "jsxDEV",
    "_jsx",
    "_jsxs",
    "_jsxDEV",
    "_jsxQ", // for Qwik html tag
    "_jsxC", // for Qwik custom component
    "_$createComponent" // for Solid
  ].includes(name);
}

function isJSXRuntimeCallee(node) {
  // jsx / jsxDEV / _jsx (vite / babel)
  if (t.isIdentifier(node)) {
    return hasJSXMember(node.name);
  }

  // xxx.jsx / xxx.jsxDEV / React.createElement（webpack / swc）
  if (t.isMemberExpression(node)) {
    if (t.isIdentifier(node.property) && hasJSXMember(node.property.name)) {
      return true;
    }

    if (
      t.isIdentifier(node.object, { name: "React" }) &&
      t.isIdentifier(node.property, { name: "createElement" })
    ) {
      return true;
    }
  }

  return false;
}

function isInJSXRuntimeCall(path, option) {
  let current = path;

  while (current && current.parentPath) {
    const p = current.parentPath;

    if (p.isCallExpression()) {
      const callee = unwrapJSXCallee(p.node.callee);

      if (!callee) {
        current = p;
        continue;
      }

      if (isJSXRuntimeCallee(callee)) {
        if (t.isIdentifier(p.node.arguments[0], { name: option.JSXElement })) {
          return;
        }
        return p;
      }

      // Solid _$insert
      if (t.isIdentifier(callee, { name: "_$insert" })) {
        return p;
      }
    }

    current = p;
  }
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

function transformJSXElementCallExpression(node, option, i18nMap) {
  if (!t.isIdentifier(node.callee) || !hasJSXMember(node.callee.name)) {
    return;
  }

  const args = node.arguments;

  if (args.length < 2) return;

  const component = args[0];
  const props = args[1];

  // 只处理 <Trans />
  if (!t.isIdentifier(component, { name: option.JSXElement })) {
    return;
  }

  if (!t.isObjectExpression(props)) return;

  // 找 msg 属性或children属性
  const msgProp = props.properties.find(
    prop =>
      t.isObjectProperty(prop) &&
      (t.isIdentifier(prop.key, { name: "msg" }) ||
        t.isIdentifier(prop.key, { name: "children" })) &&
      t.isStringLiteral(prop.value)
  );

  if (!msgProp) return;

  const msgValue = msgProp.value.value;

  if (!msgValue?.trim()) return;

  if (!shouldExtract(msgValue, option)) return;

  const hashed = generateId(msgValue, option);

  if (i18nMap) {
    i18nMap[hashed] = msgValue;
  }

  // 判断是否已经有 id
  const hasId = props.properties.some(
    prop => t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: "id" })
  );

  if (!hasId) {
    const idProperty = t.objectProperty(
      t.identifier("id"),
      t.stringLiteral(hashed)
    );

    const msgIndex = props.properties.indexOf(msgProp);
    // 移除msg属性
    if (!option.keepDefaultMsg && !option.keepRaw) {
      props.properties.splice(msgIndex, 1);
    }
    // 插入id属性
    props.properties.push(idProperty);
  }
}

// 将qwik jsx静态标记转换成动态标记
function transformQwikJSXCallExpression(path) {
  if (!path) return;
  const { callee } = path.node;
  if (
    t.isIdentifier(callee, { name: "_jsxQ" }) ||
    (t.isIdentifier(callee.property) &&
      t.isIdentifier(callee.property, { name: "_jsxQ" }))
  ) {
    path.node.arguments[4] = t.numericLiteral(1);
  }
}

const hoistedMap = new Map();

function createI18nVisitor(option, i18nMap) {
  const excludedCall = [...option.excludedCall, ...EXCLUDED_CALL];

  return {
    Program(path, state) {
      if (option.autoImportI18n) {
        const result = babelI18nImportTransform(path, option, state);
        if (result === false) {
          return;
        }
      }

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
      // 获取调用函数名称
      const fnName = extractFunctionName(path);

      if (!fnName) return;

      if (excludedCall.includes(fnName)) {
        path.skip();
        return;
      }

      if (!isTFunction(fnName, option)) {
        transformJSXElementCallExpression(path.node, option, i18nMap);

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

      if (!keyText?.trim() || !shouldExtract(keyText, option)) {
        return;
      }

      const hashed = generateId(keyText, option);

      if (i18nMap) {
        i18nMap[hashed] = keyText;
      }

      const newArg = t.stringLiteral(generateText(keyText, hashed, option));
      args[0] = newArg;

      // 跳过后续StringLiteral的处理
      path.skip();

      if (option.injectHooks) {
        markComponentUseHooks(isInJSXRuntimeCall(path, option));
      }

      if (!option.keepDefaultMsg) return;

      const defaultMsgNode = t.stringLiteral(keyText);

      if (!secondArg) {
        args.push(defaultMsgNode);
        return;
      }

      if (!t.isStringLiteral(secondArg)) {
        args.splice(option.defaultMsgPos, 0, defaultMsgNode);
      }
    },
    StringLiteral(path) {
      if (option.extractFromText === false) return;

      const { node, parentPath } = path;
      const value = node.value;

      if (!value?.trim() || !shouldExtract(value, option)) {
        return;
      }

      if (!shouldTransform(path)) return;

      const hashed = generateId(value, option);

      if (i18nMap) {
        i18nMap[hashed] = value;
      }

      if (option.injectHooks) {
        const jsxCallExpr = isInJSXRuntimeCall(path, option);
        transformQwikJSXCallExpression(jsxCallExpr);
        markComponentUseHooks(jsxCallExpr);
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
        path.skip();
      } else {
        // 其他情况直接替换
        path.replaceWith(callExpression);
        path.skip();
      }
    },

    TemplateElement(path) {
      if (option.extractFromText === false) return;

      const { node } = path;

      if (!node.value) return;

      const value = node.value.raw || node.value.cooked;

      if (!value?.trim() || !shouldExtract(value, option)) {
        return;
      }

      if (option.rewrite && hasHtmlTag(value)) {
        const result = processAngularFile(
          value,
          option,
          "virtual://template.html",
          i18nMap
        );

        if (!result.changed) {
          return;
        }
        node.value.raw = node.value.cooked = `${result.code}`;
        return;
      }

      const hashed = generateId(value, option);

      if (i18nMap) {
        i18nMap[hashed] = value;
      }

      if (option.injectHooks) {
        const jsxCallExpr = isInJSXRuntimeCall(path, option);
        transformQwikJSXCallExpression(jsxCallExpr);
        markComponentUseHooks(jsxCallExpr);
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

      let text = path.node.value;

      text = text?.replace(/\n+/g, "").trim();

      if (!text || !shouldExtract(text, option)) {
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

      path.skip();
    },
    JSXExpressionContainer(path) {
      // <div>{"Hi"}</div>
      if (option.extractFromText === false) return;

      const expr = path.node.expression;

      if (t.isStringLiteral(expr)) {
        const value = expr.value;

        if (!value?.trim() || !shouldExtract(value, option)) {
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

        path.skip();
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

          // 兼容 <Trans msg={"测试"} />
          if (
            !msgValue &&
            attr.value &&
            t.isJSXExpressionContainer(attr.value) &&
            t.isStringLiteral(attr.value.expression)
          ) {
            msgValue = attr.value.expression.value;
          }
        }
      });

      // 如果没有 msg，从 children 提取文本
      if (!msgValue) {
        const texts = [];

        path.node.children.forEach(child => {
          // <Trans>测试</Trans>
          if (t.isJSXText(child)) {
            const text = child.value;
            if (text?.trim()) texts.push(text);
          }

          if (t.isJSXExpressionContainer(child)) {
            // <Trans>{"测试"}</Trans>
            if (t.isStringLiteral(child.expression)) {
              texts.push(child.expression.value);
            }

            // <Trans>{`测试`}</Trans>
            if (
              t.isTemplateLiteral(child.expression) &&
              child.expression.expressions.length === 0
            ) {
              texts.push(child.expression.quasis[0].value.raw);
            }
          }
        });

        if (texts.length) {
          msgValue = texts.join("");
        }
      }

      // 计算 id，如果未提供，则使用 msg 的哈希值
      if (!idValue && msgValue) {
        idValue = generateId(msgValue, option);
      }

      // 有id并且有msg的情况
      if (i18nMap && idValue && msgValue) {
        i18nMap[idValue] = msgValue;
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

      path.skip();

      // 清空children
      // if (!option.keepRaw && msgValue) {
      //   path.node.children = [];
      // }
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

function createI18nImportPlugin(option) {
  return () => {
    return {
      visitor: {
        Program(path, state) {
          if (option.autoImportI18n) {
            babelI18nImportTransform(path, option, state);
          }
        }
      }
    };
  };
}

export {
  isTFunction,
  createI18nVisitor,
  createI18nPlugin,
  createI18nImportPlugin
};
