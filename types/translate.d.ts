import { I18nOptions, LangKey } from './options';
import { I18nMap } from './common';

export function createTextSplitter(values: string[], maxChunkSize: number): string[];

export function cleanI18nMap(sourceObj: I18nMap, targetObj: I18nMap): I18nMap;

export function autoTranslateFromFile(): Promise<void>;

export function autoTranslate(i18nMap: I18nMap, option?: Partial<I18nOptions>): Promise<void>;

export function cleanTranslate(option?: Partial<I18nOptions>): Promise<void>;

export function translateChunks(
  transLangObj: I18nMap,
  toTranslateLang: LangKey,
  option: Partial<I18nOptions>
): Promise<string[]>; 