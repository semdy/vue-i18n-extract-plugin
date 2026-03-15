import preactLogo from "./assets/preact.svg";
import viteLogo from "/vite.svg";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Counter from "@/components/Counter";
import TextView from "@/components/TextView";
import { Trans } from "@/locales";
import "./App.css";

function App() {
  return (
    <>
      <LanguageSwitcher />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={preactLogo} class="logo preact" alt="PReact logo" />
        </a>
      </div>
      <h1>Vite + PReact</h1>
      <div class="card">
        <Counter />
      </div>
      <TextView />
      <Trans msg="欢迎使用PReact" />
    </>
  );
}

export default App;
