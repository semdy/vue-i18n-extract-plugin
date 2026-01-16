import i18n from "i18next";
import {
  Trans as RawTrans,
  useTranslation as useRawTranslation,
  initReactI18next
} from "react-i18next";

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
}

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

// use it outside of react components
export let t = formatMessage;

export function useTranslation() {
  const hooks = useRawTranslation();
  const rawTFunc = hooks.t;
  // @ts-expect-error override t function
  hooks.t = (...args: any[]) => {
    let [id, defaultValue, values] = args;

    if (typeof defaultValue === "object") {
      values = defaultValue;
    }
    return rawTFunc(id, {
      defaultValue,
      ...values
    });
  };

  return hooks;
}

export function Trans(props: {
  id: string;
  msg?: string;
  defaultMessage?: string;
  values?: Record<string, any>;
}) {
  if (props.msg) {
    return <RawTrans i18nKey={props.id} defaults={props.msg} {...props} />;
  }
  return (
    <RawTrans i18nKey={props.id} defaults={props.defaultMessage} {...props} />
  );
}

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": {
      translation: messages["zh-CN"]
    },
    "zh-TW": {
      translation: messages["zh-TW"]
    },
    ja: {
      translation: messages["ja"]
    },
    ko: {
      translation: messages["ko"]
    },
    en: {
      translation: messages["en"]
    }
  },
  lng: locale,
  fallbackLng: "zh-CN",
  interpolation: {
    prefix: "{",
    suffix: "}"
  },
  debug: false
});

export default i18n;
