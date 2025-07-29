import { PluginObj } from '@babel/core';
import { I18nOptions } from './options';

declare function babelPluginImportI18n(options?: Partial<I18nOptions>): PluginObj;

export = babelPluginImportI18n;