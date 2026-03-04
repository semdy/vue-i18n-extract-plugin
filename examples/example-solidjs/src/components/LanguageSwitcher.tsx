import {
  locale,
  changeLanguage,
  languageList,
  type SupportLocale
} from "@/locales";
import { createSignal, For, type JSX } from "solid-js";

function LanguageSwitcher() {
  const [value, setValue] = createSignal<SupportLocale>(locale);
  const onChange: JSX.ChangeEventHandlerUnion<
    HTMLSelectElement,
    Event
  > = event => {
    const locale = event.target.value as SupportLocale;
    setValue(locale);
    changeLanguage(locale);
  };

  return (
    <select
      value={value()}
      onChange={onChange}
      style={{
        position: "absolute",
        right: "30px",
        top: "30px",
        padding: "6px",
        "font-size": "15px"
      }}
    >
      <For each={languageList}>
        {option => <option value={option.value}>{option.label}</option>}
      </For>
    </select>
  );
}

export default LanguageSwitcher;
