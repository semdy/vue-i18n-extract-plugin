import { NodePath } from "@babel/traverse";
import { I18nOptions } from "./options";

export interface TransformResult {
  needTransform: boolean;
}

export function i18nImportAstTransform(
  path: NodePath,
  importName: string,
  importPath: string
): TransformResult;

export function babelI18nImportTransform(
  path: NodePath,
  options: Partial<I18nOptions>
): boolean;
