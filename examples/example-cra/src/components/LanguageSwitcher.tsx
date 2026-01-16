import {
  type SupportLocale,
  locale,
  changeLanguage,
  languageList,
  useTranslation
} from "@/locales";
import { type ChangeEvent } from "react";

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const locale = event.target.value as SupportLocale;
    changeLanguage(locale);
    i18n.changeLanguage(locale);
  };

  return (
    <select
      value={locale}
      onChange={onChange}
      style={{
        position: "absolute",
        right: 30,
        top: 30,
        padding: 6,
        fontSize: 15
      }}
    >
      {languageList.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default LanguageSwitcher;
