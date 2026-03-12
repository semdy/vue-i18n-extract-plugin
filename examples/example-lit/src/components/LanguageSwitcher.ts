import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  type SupportLocale,
  locale,
  changeLanguage,
  languageList
} from "@/locales";

@customElement("language-switcher")
export class LanguageSwitcher extends LitElement {
  @state()
  private value: SupportLocale = locale;

  private onChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newLocale = target.value as SupportLocale;
    this.value = newLocale;
    changeLanguage(newLocale);
  }

  render() {
    return html`
      <select @change=${this.onChange}>
        ${languageList.map(
          option => html`
            <option
              value=${option.value}
              ?selected=${this.value === option.value}
            >
              ${option.label}
            </option>
          `
        )}
      </select>
    `;
  }

  static styles = css`
    select {
      position: absolute;
      right: 30px;
      top: 30px;
      padding: 6px;
      font-size: 15px;
    }
  `;
}
