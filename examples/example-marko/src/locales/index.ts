import mitt from "mitt";

import en_gen from "./gen/en.json";
import ja_gen from "./gen/ja.json";
import ko_gen from "./gen/ko.json";
import zhHans_gen from "./gen/zh-cn.json";
import zhHant_gen from "./gen/zh-tw.json";

const messages = {
  zh_CN: zhHans_gen,
  zh_TW: zhHant_gen,
  en_US: en_gen,
  ja_JP: ja_gen,
  ko_KR: ko_gen
} as const;

export type SupportLocale = keyof typeof messages;

type Events = {
  localeChange: { lang: SupportLocale };
};

export let locale = getClientLocale();

export const emitter = mitt<Events>();

export const languageList: {
  value: SupportLocale;
  label: string;
}[] = [
  {
    value: "zh_CN",
    label: "简体中文"
  },
  {
    value: "zh_TW",
    label: "繁体中文"
  },
  { value: "en_US", label: "English" },
  { value: "ja_JP", label: "日本語" },
  { value: "ko_KR", label: "한국인" }
];

export function getClientLocale(): SupportLocale {
  if (typeof localStorage !== "undefined") {
    const localeFromStorage = localStorage.getItem("locale");
    if (localeFromStorage) {
      return localeFromStorage as SupportLocale;
    }
  }
  if (typeof navigator !== "undefined") {
    const clientLocale = navigator.language;
    const clientLocaleMap: Record<string, SupportLocale> = {
      "zh-CN": "zh_CN",
      zh: "zh_CN",
      "zh-TW": "zh_TW",
      "en-US": "en_US",
      "ja-JP": "ja_JP",
      "ko-KR": "ko_KR",
      ja: "ja_JP",
      ko: "ko_KR",
      kr: "ko_KR"
    };
    return clientLocaleMap[clientLocale] || "en_US";
  }

  return "en_US";
}

export function changeLanguage(lang: SupportLocale) {
  if (locale === lang) return;
  locale = lang;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("locale", lang);
    emitter.emit("localeChange", { lang });
  }
}

export function $t(
  locale: string,
  id?: string,
  values?: Record<string, any>,
  defaultMessage?: string
) {
  const dict = messages[locale] || {};

  if (!defaultMessage && typeof values === "string") {
    defaultMessage = values;
  }

  let text = dict[id] || defaultMessage || id;

  if (typeof values === "object") {
    text = text.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? k);
  }

  return text;
}

export function t(
  id?: string,
  values?: Record<string, any>,
  defaultMessage?: string
) {
  return $t(locale, id, values, defaultMessage);
}
