const t = require("@babel/types");
const { defaultOptions } = require("./options");

module.exports = function () {
  return {
    name: "auto-import-i18n",
    visitor: {
      Program(path, state) {
        const {
          translateKey: _importName,
          i18nPkgImportPath: importPath,
          enabled
        } = {
          ...defaultOptions,
          ...state.opts
        };

        if (!enabled) return;

        let importName = _importName;

        if (importName.includes(".")) {
          importName = importName.split(".")[0];
        }

        const localName = importName;
        let hasI18nImport = false;
        let lastImportPath = null;
        let conflictTDefined = false;

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

            const sourcePath = path.node.source.value;

            // 判断是否是其它路径导入了 $t
            const importedTElsewhere = path.node.specifiers.some(spec => {
              return (
                (t.isImportSpecifier(spec) ||
                  t.isImportDefaultSpecifier(spec)) &&
                spec.local.name === importName &&
                sourcePath !== importPath
              );
            });

            if (importedTElsewhere) {
              conflictTDefined = true;
              path.stop();
              return;
            }

            // 检查是否已经导入目标路径
            if (sourcePath === importPath) {
              hasI18nImport = true;

              // 情况1：已有 import { $t } from '@/i18n'
              const existingImport = path.node.specifiers.find(
                spec =>
                  t.isImportSpecifier(spec) && spec.imported.name === importName
              );

              if (existingImport) return;

              // if (
              //   existingImport &&
              //   !t.isImportSpecifier(existingImport, {
              //     local: { name: localName }
              //   })
              // ) {
              //   // 将 $t 改为 _$t
              //   existingImport.local = t.identifier(localName);
              // } else
              // 情况2：已有 import i18n from '@/i18n'

              // 添加 $t 到已有的 import
              path.node.specifiers.push(
                t.importSpecifier(
                  t.identifier(localName),
                  t.identifier(importName)
                )
              );
            }
          },
          VariableDeclarator(path) {
            if (
              t.isIdentifier(path.node.id) &&
              path.node.id.name === importName
            ) {
              conflictTDefined = true;
              path.stop();
            }
          },

          FunctionDeclaration(path) {
            if (
              t.isIdentifier(path.node.id) &&
              path.node.id.name === importName
            ) {
              conflictTDefined = true;
              path.stop();
            }
          }
        });

        // 跳过导入语句的生成
        if (conflictTDefined) {
          return {
            ast,
            needTransform: false
          };
        }

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
