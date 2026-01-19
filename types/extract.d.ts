import { Node } from "@babel/types";
import { I18nOptions as Options } from "./options";
import { I18nMap } from "./common";

export interface WriteResult {
  hasDiff: boolean;
  data: I18nMap;
}

export function writeI18nMapToFile(
  i18nMap: I18nMap,
  options: Partial<Options>,
  checkDiffs?: boolean
): Promise<WriteResult>;

export function handleFinalI18nMap(
  i18nMap: I18nMap,
  options: Partial<Options>,
  checkDiffs?: boolean
): Promise<void>;

export function extractI18n(options: Partial<Options>): Promise<void>;

export let globalI18nMap: I18nMap;
