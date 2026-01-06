import { i18nImportTransform } from "./import-i18n-transform.js";
import { createFilterFn } from "./utils.js";
import { defaultOptions } from "./options.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { bin } = require("../package.json");

export function generateImports(code, path, option) {
  if (!option.autoImportI18n) return Promise.resolve(code);
  return i18nImportTransform(
    code,
    path,
    option.jsx
      ? [
          option.translateKey,
          option.JSXElement,
          option.injectUseTranslation ? option.useTranslationIdentifier : null
        ].filter(Boolean)
      : option.injectUseTranslation
        ? [option.translateKey, option.useTranslationIdentifier]
        : [option.translateKey],
    option.i18nPkgImportPath
  );
}

export default function vitePluginImportI18n(userConfig = {}) {
  let filter;
  let resolvedOptions = userConfig;

  return {
    name: "vite-plugin-import-i18n",
    enforce: "post",
    async configResolved() {
      const { loadConfig } = await import("c12");
      const { config: configFromFile } = await loadConfig({
        name: Object.keys(bin)[0]
      });

      resolvedOptions = { ...defaultOptions, ...configFromFile, ...userConfig };
      filter = createFilterFn(resolvedOptions);
    },
    async transform(code, path) {
      path = path.split("?")[0];

      if (
        !resolvedOptions.enabled ||
        !resolvedOptions.autoImportI18n ||
        !filter?.(path)
      ) {
        return;
      }

      return generateImports(code, path, resolvedOptions);
    }
  };
}
