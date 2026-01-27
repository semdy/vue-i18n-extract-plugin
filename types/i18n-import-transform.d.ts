import { NodePath } from "@babel/traverse";
import { Node } from "@babel/types";
import { I18nOptions } from "./options";

export interface TransformResult {
  ast: Node;
  needTransform: boolean;
}

export function i18nImportAstTransform(
  ast: Node,
  importName: string,
  importPath: string
): TransformResult;

export function babelI18nImportTransform(
  path: NodePath,
  ast: Node,
  options: Partial<I18nOptions>
): boolean;
