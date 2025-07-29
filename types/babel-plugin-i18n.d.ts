import { PluginObj, PluginPass } from '@babel/core';
import { I18nOptions } from './options';

declare const plugin: (api: any, options?: Partial<I18nOptions>) => PluginObj<PluginPass>;

export default plugin;
