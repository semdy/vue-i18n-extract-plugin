import { component$ } from "@builder.io/qwik";

import { I18nProvider } from "./locales";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Counter from "./components/Counter";
import TextView from "./components/TextView";
import qwikLogo from "./assets/qwik.svg";
import viteLogo from "/vite.svg";
import "./app.css";

export const App = component$(() => {
  return (
    <I18nProvider>
      <div>
        <LanguageSwitcher />
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a href="https://qwik.dev" target="_blank">
          <img src={qwikLogo} class="logo qwik" alt="Qwik logo" />
        </a>
      </div>
      <h1>Vite + Qwik</h1>
      <div class="card">
        <Counter />
      </div>
      <TextView />
      <p class="read-the-docs">
        Click on the Vite and Qwik logos to learn more
      </p>
    </I18nProvider>
  );
});
