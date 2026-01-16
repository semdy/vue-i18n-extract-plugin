import {
  locale,
  changeLanguage,
  languageList,
  type SupportLocale
} from "@/locales";
import { useState, type ChangeEvent } from "react";

function LanguageSwitcher() {
  const [value, setValue] = useState(locale);
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const locale = event.target.value as SupportLocale;
    setValue(locale);
    changeLanguage(locale);
  };

  return (
    <select
      value={value}
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
