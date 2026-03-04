import {
  type Component,
  type JSX,
  createContext,
  onMount,
  useContext
} from "solid-js";
import { createStore } from "solid-js/store";

import en_gen from "./gen/en.json";
import ja_gen from "./gen/ja.json";
import ko_gen from "./gen/ko.json";
import zhHans_gen from "./gen/zh-cn.json";
import zhHant_gen from "./gen/zh-tw.json";
import { Dynamic } from "solid-js/web";

export const messages = {
  "zh-CN": zhHans_gen,
  "zh-TW": zhHant_gen,
  en: en_gen,
  ja: ja_gen,
  ko: ko_gen
} as const;

export type SupportLocale = keyof typeof messages;

type ProviderProps = { children: JSX.Element };

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
  locale: SupportLocale;
  t: typeof t;
  setLocale: (lang: SupportLocale) => void;
};

export const I18nContext = createContext<ContextProps>({
  locale,
  t,
  setLocale: () => {}
});

export function I18nProvider(props: ProviderProps) {
  const [i18n, setI18n] = createStore({ locale });

  const t1 = createTranslator(() => i18n.locale);

  const setLocale = (lang: SupportLocale) => {
    if (i18n.locale === lang) return;
    setI18n("locale", lang);
  };

  onMount(() => {
    window.addEventListener("localeChange", (event: Event) => {
      const customEvent = event as CustomEvent<SupportLocale>;
      setLocale(customEvent.detail);
    });
  });

  return (
    <I18nContext.Provider value={{ ...i18n, t: t1, setLocale }}>
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n: must be used inside <I18nProvider />");
  }
  return context;
}

type BaseTransProps = {
  component?: Component | string;
  id?: string;
  defaultMessage?: string;
  values?: Record<string, any>;
};

export function Trans(
  props:
    | (BaseTransProps & { msg: string; children?: never })
    | (BaseTransProps & { children: string; msg?: never })
) {
  const { t } = useI18n();
  const content = () => {
    const msgValue =
      ("msg" in props && props.msg) ||
      ("children" in props && props.children) ||
      props.defaultMessage ||
      "";
    const id = props.id || msgValue;
    if (props.values) {
      return t(id, msgValue, props.values);
    }
    return t(id, msgValue);
  };

  if (!props.component) {
    return <>{content()}</>;
  }

  return <Dynamic component={props.component}>{content()}</Dynamic>;
}
