import { ref } from "vue";
import { createI18n } from "vue-i18n";

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

export const locale = ref<SupportLocale>(getClientLocale());

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
  if (locale.value === lang) return;
  locale.value = lang;
  (i18n.global as any).locale.value = lang;
  localStorage.setItem("locale", lang);
}

export function $t(
  ...args: [key: string, defaultMsg?: string, values?: Record<string, unknown>]
): string {
  if (args.length === 3 && typeof args[2] === "object" && !args[2].named) {
    args[2] = { named: args[2] };
  }
  // @ts-expect-error ignore
  return i18n.global.t(...args);
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: locale.value,
  allowComposition: true,
  fallbackLocale: "en",
  messages: messages as unknown as Record<string, any>
});

export default i18n;
