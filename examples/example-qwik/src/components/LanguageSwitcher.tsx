import {
  locale,
  changeLanguage,
  languageList,
  type SupportLocale
} from "@/locales";
import {
  component$,
  useSignal,
  $,
  type QRLEventHandlerMulti
} from "@builder.io/qwik";

const LanguageSwitcher = component$(() => {
  const lang = useSignal<SupportLocale>(locale);

  const onChange: QRLEventHandlerMulti<Event, HTMLSelectElement> = $(event => {
    const target = event.target as HTMLSelectElement;
    const localeValue = target.value as SupportLocale;
    lang.value = localeValue;
    changeLanguage(localeValue);
  });

  return (
    <select
      value={lang.value}
      onChange$={onChange}
      style={{
        position: "absolute",
        right: "30px",
        top: "30px",
        padding: "6px",
        "font-size": "15px"
      }}
    >
      {languageList.map(option => (
        <option value={option.value} key={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

export default LanguageSwitcher;
