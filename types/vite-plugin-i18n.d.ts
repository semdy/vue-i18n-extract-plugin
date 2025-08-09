import { Plugin } from 'vite';
import { I18nOptions } from './options';

export function createFilterFn(option: Partial<I18nOptions>): (id: string) => boolean;

export default function vitePluginI18n(option?: Partial<I18nOptions>): Plugin