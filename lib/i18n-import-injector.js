import * as t from "@babel/types";
import { hasI18nUsage } from "./cache.js";

function normalizeImportName(importName) {
  // importName 可能是 intl.t 这种
  if (importName.includes(".")) {
    return importName.split(".")[0];
  }
  return importName;
}

function createImportSpecifier(importName, importAs) {
  return t.importSpecifier(
    t.identifier(importAs || importName),
    t.identifier(importName)
  );
}

function getLocalImportName(importName, importAs) {
  return importAs || importName;
}

function createImportRequestTracker(requests) {
  const requestStateMap = new Map();
  let lastImportPath = null;

  for (const request of requests) {
    requestStateMap.set(request.key, {
      ...request,
      conflictDefined: false,
      hasSpecifier: false,
      matchedTargetImportPath: null
    });
  }

  return {
    requestStateMap,
    trackImportDeclaration(path) {
      lastImportPath = path;

      const sourcePath = path.node.source.value;

      for (const requestState of requestStateMap.values()) {
        if (requestState.conflictDefined) continue;

        // 判断是否有 import { $t } from '@/i18n' 或 import $t from '@/i18n'
        const existImport = path.node.specifiers.some(spec => {
          const localImportName = getLocalImportName(
            requestState.importName,
            requestState.importAs
          );

          if (t.isImportSpecifier(spec)) {
            return spec.local?.name === localImportName;
          }

          if (t.isImportDefaultSpecifier(spec)) {
            return spec.local?.name === localImportName;
          }

          return false;
        });

        // 判断是否是其它路径导入了 $t
        if (existImport && sourcePath !== requestState.importPath) {
          requestState.conflictDefined = true;
          continue;
        }

        if (sourcePath === requestState.importPath) {
          if (!requestState.matchedTargetImportPath) {
            requestState.matchedTargetImportPath = path;
          }
          if (existImport) {
            requestState.hasSpecifier = true;
          }
        }
      }
    },
    trackVariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id)) return;

      for (const requestState of requestStateMap.values()) {
        if (requestState.conflictDefined) continue;

        const localImportName = getLocalImportName(
          requestState.importName,
          requestState.importAs
        );

        if (path.node.id.name === localImportName) {
          requestState.conflictDefined = true;
        }
      }
    },
    trackFunctionDeclaration(path) {
      if (!t.isIdentifier(path.node.id)) return;

      for (const requestState of requestStateMap.values()) {
        if (requestState.conflictDefined) continue;

        const localImportName = getLocalImportName(
          requestState.importName,
          requestState.importAs
        );

        if (path.node.id.name === localImportName) {
          requestState.conflictDefined = true;
        }
      }
    },
    apply(programPath) {
      let needTransform = false;
      const pendingInsertionsByPath = new Map();

      for (const requestState of requestStateMap.values()) {
        if (requestState.conflictDefined) {
          continue;
        }

        const targetImportPath = requestState.matchedTargetImportPath;
        const importSpecifier = createImportSpecifier(
          requestState.importName,
          requestState.importAs
        );

        if (targetImportPath) {
          if (!requestState.hasSpecifier) {
            targetImportPath.node.specifiers.push(importSpecifier);
            needTransform = true;
          }

          continue;
        }

        if (!pendingInsertionsByPath.has(requestState.importPath)) {
          pendingInsertionsByPath.set(requestState.importPath, []);
        }

        pendingInsertionsByPath
          .get(requestState.importPath)
          .push(importSpecifier);
      }

      let insertionAnchor = lastImportPath;

      for (const [importPath, specifiers] of pendingInsertionsByPath) {
        if (!specifiers.length) continue;

        const importNode = t.importDeclaration(
          specifiers,
          t.stringLiteral(importPath)
        );

        if (insertionAnchor) {
          [insertionAnchor] = insertionAnchor.insertAfter(importNode);
        } else {
          const [insertedPath] = programPath.unshiftContainer(
            "body",
            importNode
          );
          insertionAnchor = insertedPath;
        }

        needTransform = true;
      }

      return {
        needTransform,
        requestStateMap
      };
    }
  };
}

function trackImportRequests(programPath, tracker) {
  programPath.traverse({
    ImportDeclaration(path) {
      tracker.trackImportDeclaration(path);
    },
    VariableDeclarator(path) {
      tracker.trackVariableDeclarator(path);
    },
    FunctionDeclaration(path) {
      tracker.trackFunctionDeclaration(path);
    }
  });
}

function applyImportRequests(programPath, requests) {
  if (!requests.length) {
    return {
      needTransform: false,
      requestStateMap: new Map()
    };
  }

  const tracker = createImportRequestTracker(requests);
  trackImportRequests(programPath, tracker);
  return tracker.apply(programPath);
}

function getImportNames(options) {
  return [
    options.importIdentifier || options.translateKey,
    options.jsx && options.JSXElement,
    options.injectHooks && options.hooksIdentifier,
    options.extraImportIdentifier
  ]
    .flat()
    .filter(Boolean);
}

function createImportRequests(options) {
  const requestMap = new Map();

  for (const importName of getImportNames(options)) {
    const normalizedImportName = normalizeImportName(importName);
    const key = `${options.i18nPkgImportPath}:${normalizedImportName}:`;
    requestMap.set(key, {
      key,
      importName: normalizedImportName,
      importAs: null,
      importPath: options.i18nPkgImportPath
    });
  }

  if (options.extraImports) {
    for (const extraImport of options.extraImports) {
      const normalizedImportName = normalizeImportName(extraImport.name);
      const key = `${extraImport.path}:${normalizedImportName}:${extraImport.as || ""}`;
      requestMap.set(key, {
        key,
        importName: normalizedImportName,
        importAs: extraImport.as,
        importPath: extraImport.path
      });
    }
  }

  return [...requestMap.values()];
}

function createI18nImportTransformTracker(options) {
  return createImportRequestTracker(createImportRequests(options));
}

function shouldRunI18nImportTransform(programPath, state) {
  if (state && state.__runInBabelPlugin && !state.__enabled) {
    programPath.stop?.();
    return false;
  }

  if (state && !hasI18nUsage(state.file?.opts?.filename)) {
    programPath.stop?.();
    return false;
  }

  return true;
}

function injectI18nImport(programPath, importName, importAs, importPath) {
  importName = normalizeImportName(importName);

  const { needTransform, requestStateMap } = applyImportRequests(programPath, [
    {
      key: `${importPath}:${importName}:${importAs || ""}`,
      importName,
      importAs,
      importPath
    }
  ]);

  const requestState = requestStateMap.values().next().value;

  if (requestState?.conflictDefined) {
    return {
      needTransform: false
    };
  }

  return {
    needTransform
  };
}

function batchInjectI18nImport(programPath, options, state) {
  if (!shouldRunI18nImportTransform(programPath, state)) {
    return false;
  }

  const tracker = createI18nImportTransformTracker(options);
  trackImportRequests(programPath, tracker);
  tracker.apply(programPath);

  return true;
}

export {
  injectI18nImport,
  batchInjectI18nImport,
  shouldRunI18nImportTransform,
  createI18nImportTransformTracker
};
