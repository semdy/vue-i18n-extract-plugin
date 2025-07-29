import { Node } from '@babel/types';
import { I18nOptions as Options } from './options';
import { I18nMap } from './common';

export interface WriteResult {
  hasDiff: boolean;
  data: I18nMap;
}

export function writeI18nMapToFile(
  i18nMap: I18nMap,
  options: Options,
  checkDiffs?: boolean
): Promise<WriteResult>;

export function handleFinalI18nMap(
  i18nMap: I18nMap,
  options: Options,
  checkDiffs?: boolean
): Promise<void>;

export function addI18nImportIfNeeded(ast: Node, options: Partial<Options>): Node
export function addI18nImportIfNeeded(ast: Node, options: Partial<Options>, generateCode: false): Node
export function addI18nImportIfNeeded(ast: Node, options: Partial<Options>, generateCode: true): string

export function extractI18n(options: Options): Promise<void>;

export let globalI18nMap: I18nMap; 