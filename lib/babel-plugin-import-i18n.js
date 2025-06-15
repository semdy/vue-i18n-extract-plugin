const t = require("@babel/types");
const { importNodeLocalName } = require("./utils");
const { defaultOptions } = require("./options");

module.exports = function () {
  return {
    name: "auto-import-i18n",
    visitor: {
      Program(path, state) {
        const {
          i18nPkgImportName: importName,
          i18nPkgImportPath: importPath,
          useLocalImportName
        } = {
          ...defaultOptions,
          ...state.opts
        };

        const localName = useLocalImportName
          ? importNodeLocalName(importName)
          : importName;

        let hasI18nImport = false;
        let lastImportPath = null;

        path.traverse({
          // ImportDeclaration(path) {
          //   lastImportPath = path;
          //   if (
          //     path.node.source.value === importPath &&
          //     path.node.specifiers.some(
          //       spec =>
          //         t.isImportSpecifier(spec) && spec.imported.name === importName
          //     )
          //   ) {
          //     hasI18nImport = true;
          //   }
          // },
          ImportDeclaration(path) {
            lastImportPath = path;

            if (path.node.source.value === importPath) {
              hasI18nImport = true;

              // 情况1：已有 import { $t } from '@/i18n'
              const existingImport = path.node.specifiers.find(
                spec =>
                  t.isImportSpecifier(spec) && spec.imported.name === importName
              );

              if (
                existingImport &&
                !t.isImportSpecifier(existingImport, {
                  local: { name: localName }
                })
              ) {
                // 将 $t 改为 _$t
                existingImport.local = t.identifier(localName);
              }
              // 情况2：已有 import i18n from '@/i18n'
              else if (
                path.node.specifiers.some(spec =>
                  t.isImportDefaultSpecifier(spec)
                )
              ) {
                // 添加 { $t as _$t }
                path.node.specifiers.push(
                  t.importSpecifier(
                    t.identifier(localName),
                    t.identifier(importName)
                  )
                );
              }
              // 情况3：已有 import { other } from '@/i18n'
              else if (path.node.specifiers.length > 0) {
                // 添加 $t as _$t
                path.node.specifiers.push(
                  t.importSpecifier(
                    t.identifier(localName),
                    t.identifier(importName)
                  )
                );
              }
            }
          }
        });

        // 情况4：完全没有导入 @/i18n
        if (!hasI18nImport) {
          const importNode = t.importDeclaration(
            [
              // t.importDefaultSpecifier(t.identifier("i18n")),
              t.importSpecifier(
                t.identifier(localName),
                t.identifier(importName)
              )
            ],
            t.stringLiteral(importPath)
          );

          if (lastImportPath) {
            // 插入到最后一个 import 之后
            lastImportPath.insertAfter(importNode);
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
