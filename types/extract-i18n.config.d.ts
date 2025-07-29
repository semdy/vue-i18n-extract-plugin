import { I18nOptions } from './options';

declare module 'extract-i18n.config.ts' {
  const config: Partial<I18nOptions>;
  export default config;
}
  