const t = require("@babel/types");
const { defaultOptions } = require("./options");

module.exports = function () {
  return {
    name: "auto-import-i18n",
    visitor: {
      Program(path, state) {
        const { translateKey: importName, i18nPkgImportPath: importPath } = {
          ...defaultOptions,
          ...state.opts
        };

        let hasImport = false;
        let lastImport = null;

        path.traverse({
          ImportDeclaration(path) {
            lastImport = path;
            if (
              path.node.source.value === importPath &&
              path.node.specifiers.some(
                spec =>
                  t.isImportSpecifier(spec) && spec.imported.name === importName
              )
            ) {
              hasImport = true;
            }
          }
        });

        // 如果未导入，则注入
        if (!hasImport) {
          const importNode = t.importDeclaration(
            [
              t.importSpecifier(
                t.identifier(importName),
                t.identifier(importName)
              )
            ],
            t.stringLiteral(importPath)
          );

          if (lastImport) {
            // 插入到最后一个 import 之后
            lastImport.insertAfter(importNode);
          } else {
            // 插入到文件顶部
            path.unshiftContainer("body", importNode);
          }
        }
      }
    }
  };
};

/**
 * // babel.config.js
module.exports = {
  presets: ['@vue/cli-plugin-babel/preset'],
  plugins: [
    [
      'vue-i18n-extract-plugin/babel-plugin-import-i18n.js', // 插件路径
      {
        importName: '$t',     // 可选，默认 '$t'
        importPath: '@/i18n', // 可选，默认 '@/i18n'
      },
    ],
  ],
};
 */
