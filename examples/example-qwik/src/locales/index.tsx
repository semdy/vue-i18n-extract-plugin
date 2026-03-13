import {
  useSignal,
  useContext,
  useContextProvider,
  useVisibleTask$,
  createContextId,
  Slot,
  component$,
  type Signal,
  type Component
} from "@builder.io/qwik";

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
  window.dispatchEvent(new CustomEvent("localeChange", { detail: lang }));
}

function formatMessage(
  locale: SupportLocale,
  id: string,
  defaultMessage?: string | Record<string, any>,
  values?: Record<string, any>
): string {
  if (typeof defaultMessage === "object") {
    values = defaultMessage;
    defaultMessage = undefined;
  }

  let msg =
    (messages[locale] as Record<string, any>)?.[id] || defaultMessage || id;
  if (values) {
    msg = msg.replace(/\{([^}]+)\}/gm, (match: any, name: string) => {
      return values![name] ?? match;
    });
  }
  return msg;
}

const createTranslator = (targetLocale: () => SupportLocale) => {
  function translate(id: string): string;
  function translate(id: string, defaultMessage: string): string;
  function translate(id: string, values: Record<string, any>): string;
  function translate(
    id: string,
    defaultMessage?: string | Record<string, any>,
    values?: Record<string, any>
  ): string;
  function translate(
    id: string,
    defaultMessage?: string | Record<string, any>,
    values?: Record<string, any>
  ): string {
    return formatMessage(targetLocale(), id, defaultMessage, values);
  }
  return translate;
};

export const t = createTranslator(() => locale);

type ContextProps = {
  locale: Signal<SupportLocale>;
  t: typeof t;
  setLocale: (lang: SupportLocale) => void;
};

export const I18nContext = createContextId<ContextProps>("i18n-context");

export const I18nProvider = component$(() => {
  const i18n = useSignal<SupportLocale>(locale);

  const t1 = createTranslator(() => i18n.value);

  const setLocale = (lang: SupportLocale) => {
    if (i18n.value === lang) return;
    i18n.value = lang;
  };

  useVisibleTask$(() => {
    window.addEventListener("localeChange", (event: Event) => {
      const customEvent = event as CustomEvent<SupportLocale>;
      setLocale(customEvent.detail);
    });
  });

  useContextProvider(I18nContext, { locale: i18n, t: t1, setLocale });

  return (
    <>
      <Slot />
    </>
  );
});

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n: must be used inside <I18nProvider />");
  }
  return context;
}

type TransProps = {
  component?: Component<any> | string;
  id?: string;
  msg?: string;
  defaultMessage?: string;
  values?: Record<string, any>;
};

export const Trans = component$<TransProps>(props => {
  const { t } = useI18n();
  const msgValue = props.msg || props.defaultMessage || "";
  const id = props.id || msgValue;
  const content = props.values
    ? t(id, msgValue, props.values)
    : t(id, msgValue);

  const slot = content || <Slot />;

  if (!props.component) {
    return <>{slot}</>;
  }

  // handle string components (HTML tags)
  if (typeof props.component === "string") {
    const Tag = props.component as any;
    return <Tag>{slot}</Tag>;
  }

  // For component functions, return directly
  return <>{slot}</>;
});
