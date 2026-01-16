import { injectIntl, FormattedMessage, useIntl } from "react-intl";

export * from "react-intl";
export { default as LocaleWrapper } from "./Wrapper";

import en_gen from "./gen/en.json";
import ja_gen from "./gen/ja.json";
import ko_gen from "./gen/ko.json";
import zhHans_gen from "./gen/zh-cn.json";
import zhHant_gen from "./gen/zh-tw.json";

export const messages = {
  "zh-CN": zhHans_gen,
  "zh-TW": zhHant_gen,
  en: en_gen,
  ja: ja_gen,
  ko: ko_gen
} as const;

export type SupportLocale = keyof typeof messages;

export function getClientLocale(): SupportLocale {
  const localeFromStorage = localStorage.getItem("locale");
  if (localeFromStorage) {
    return localeFromStorage as SupportLocale;
  }
  const clientLocale = navigator.language;
  const clientLocaleMap: Record<string, SupportLocale> = {
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    zh: "zh-CN",
    "en-US": "en",
    "ja-JP": "ja",
    "ko-KR": "ko",
    kr: "ko"
  };
  return clientLocaleMap[clientLocale] || "en";
}

export let locale: SupportLocale = getClientLocale();

export const languageList: {
  value: SupportLocale;
  label: string;
}[] = [
  {
    value: "zh-CN",
    label: "简体中文"
  },
  {
    value: "zh-TW",
    label: "繁体中文"
  },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국인" }
];

export function changeLanguage(lang: SupportLocale) {
  if (locale === lang) return;
  locale = lang;
  localStorage.setItem("locale", lang);
  window.dispatchEvent(
    new CustomEvent("languagechange", {
      detail: locale
    })
  );
}

export let intl = {} as any;

function formatMessage(id: string): string;
function formatMessage(id: string, defaultMessage: string): string;
function formatMessage(id: string, values: Record<string, any>): string;
function formatMessage(
  id: string,
  defaultMessage: string,
  values: Record<string, any>
): string;
function formatMessage(
  ...args:
    | [string]
    | [string, string]
    | [string, string, Record<string, any>]
    | [string, Record<string, any>]
): string {
  let [id, defaultMessage, values] = args;

  if (typeof defaultMessage === "object") {
    values = defaultMessage;
    defaultMessage = undefined;
  }
  let msg =
    (messages[locale] as Record<string, any>)?.[id] || defaultMessage || id;
  if (values) {
    msg = msg.replace(/\{([^}]+)\}/gm, (match: any, name: string) => {
      return values[name] ?? match;
    });
  }
  return msg;
}

export let t = formatMessage;

export function useTranslation() {
  const intl = useIntl();

  // @ts-expect-error no-check
  intl.t = t;

  return intl as ReturnType<typeof useIntl> & { t: typeof t };
}

export function Trans(props: {
  id: string;
  msg?: string;
  defaultMessage?: string;
  values?: Record<string, any>;
}) {
  if (props.msg) {
    return <FormattedMessage defaultMessage={props.msg} {...props} />;
  }
  return <FormattedMessage {...props} />;
}

function IntlGlobalProvider(props: any) {
  intl = props.intl;
  const f = intl.formatMessage;
  t = function (...args: any) {
    let [id, defaultMessage, values] = args;
    if (typeof defaultMessage === "object") {
      values = defaultMessage;
      defaultMessage = undefined;
    }
    return f({ id, defaultMessage }, values);
  };

  return null;
}

export default injectIntl(IntlGlobalProvider);
