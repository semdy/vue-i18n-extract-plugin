import { useEffect, useState, type PropsWithChildren } from "react";
import { IntlProvider } from "react-intl";
import IntlGlobalProvider, { messages, locale, type SupportLocale } from ".";

export default function LocaleWrapper(props: PropsWithChildren) {
  const [localLocale, setLocalLocale] = useState<SupportLocale>(locale);

  useEffect(() => {
    const changeLocale = (e: any) => {
      const newLocale = (e as CustomEvent).detail as SupportLocale;
      setLocalLocale(newLocale);
    };
    window.addEventListener("languagechange", changeLocale);
    return () => {
      window.removeEventListener("languagechange", changeLocale);
    };
  }, []);

  return (
    <IntlProvider
      locale={localLocale}
      messages={messages[localLocale]}
      defaultLocale={localLocale}
    >
      <IntlGlobalProvider />
      {props.children}
    </IntlProvider>
  );
}
