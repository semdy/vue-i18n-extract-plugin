import { ErrorBoundary } from "solid-js";
import { I18nProvider, Trans } from "./locales";
import Counter from "./components/Counter";
import LanguageSwitcher from "./components/LanguageSwitcher";
import TextView from "./components/TextView";
import solidLogo from "./assets/solid.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  return (
    <I18nProvider>
      <ErrorBoundary fallback={err => <div>Error: {err.message}</div>}>
        <LanguageSwitcher />
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} class="logo" alt="Vite logo" />
          </a>
          <a href="https://solidjs.com" target="_blank">
            <img src={solidLogo} class="logo solid" alt="Solid logo" />
          </a>
        </div>
        <h1>Vite + Solid</h1>
        <div class="card">
          <Counter />
          <TextView />
          <p>
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p class="read-the-docs">
          Click on the Vite and Solid logos to learn more
        </p>
        <Trans component="h2">欢迎使用Solid</Trans>
      </ErrorBoundary>
    </I18nProvider>
  );
}

export default App;
