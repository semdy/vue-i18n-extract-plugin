import { Node } from '@babel/types';

export interface TransformResult {
  ast: Node;
  needTransform: boolean;
}

export function i18nImportAstTransform(
  ast: Node,
  importName: string,
  importPath: string
): TransformResult;

export function i18nImportTransform(
  code: string,
  path: string,
  importName: string,
  importPath: string
): Promise<string>;

export function extractScriptContent(code: string, path: string): string; 