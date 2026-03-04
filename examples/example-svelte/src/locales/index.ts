import { get, derived } from "svelte/store";
import { init, addMessages, format } from "svelte-i18n";

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

export let locale = getClientLocale();

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
  const localeFromStorage = localStorage.getItem("locale");
  if (localeFromStorage) {
    return localeFromStorage as SupportLocale;
  }
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

export function changeLanguage(lang: SupportLocale) {
  if (locale === lang) return;
  locale = lang;
  localStorage.setItem("locale", lang);
}

// use in ts/js files
export function $t(
  id: string,
  values?: Record<string, string | number | Date>,
  defaultMsg?: string
): string {
  const translate = get(format);

  if (typeof values === "string") {
    defaultMsg = values;
  }

  return translate(id, {
    default: defaultMsg,
    values
  });
}

// use in svelte files
export const t = derived(format, $format => {
  return (
    id: string,
    values?: Record<string, string | number | Date>,
    defaultMsg?: string
  ) => {
    if (typeof values === "string") {
      defaultMsg = values;
    }
    return $format(id, { default: defaultMsg, values });
  };
});

addMessages("en", en_gen);
addMessages("de", zhHant_gen);
addMessages("zh-CN", zhHans_gen);
addMessages("zh-TW", zhHant_gen);
addMessages("ja", ja_gen);
addMessages("ko", ko_gen);

init({
  fallbackLocale: "en",
  initialLocale: locale
});
