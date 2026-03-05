import { get, derived } from "svelte/store";
import { locale, init, addMessages, format } from "svelte-i18n";

import en_gen from "./gen/en.json";
import ja_gen from "./gen/ja.json";
import ko_gen from "./gen/ko.json";
import zhHans_gen from "./gen/zh-cn.json";
import zhHant_gen from "./gen/zh-tw.json";

const messages = {
  "zh-CN": zhHans_gen,
  "zh-TW": zhHant_gen,
  "en-US": en_gen,
  "ja-JP": ja_gen,
  "ko-KR": ko_gen
} as const;

export type SupportLocale = keyof typeof messages;

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
  { value: "en-US", label: "English" },
  { value: "ja-JP", label: "日本語" },
  { value: "ko-KR", label: "한국인" }
];

export function getClientLocale(): SupportLocale {
  const localeFromStorage = localStorage.getItem("locale");
  if (localeFromStorage) {
    return localeFromStorage as SupportLocale;
  }
  const clientLocale = navigator.language;
  const clientLocaleMap: Record<string, SupportLocale> = {
    "zh-CN": "zh-CN",
    zh: "zh-CN",
    "zh-TW": "zh-TW",
    "en-US": "en-US",
    "ja-JP": "ja-JP",
    "ko-KR": "ko-KR",
    ja: "ja-JP",
    ko: "ko-KR",
    kr: "ko-KR"
  };
  return clientLocaleMap[clientLocale] || "en-US";
}

export function changeLanguage(lang: SupportLocale) {
  if (get(locale) === lang) return;
  locale.set(lang);
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

export { locale };

addMessages("en-US", en_gen);
addMessages("zh-CN", zhHans_gen);
addMessages("zh-TW", zhHant_gen);
addMessages("ja-JP", ja_gen);
addMessages("ko-KR", ko_gen);

init({
  fallbackLocale: "en-US",
  initialLocale: getClientLocale()
});
