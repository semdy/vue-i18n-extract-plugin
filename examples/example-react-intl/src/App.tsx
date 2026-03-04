import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Counter from "@/components/Counter";
import TextView from "@/components/TextView";
import { Trans } from "./locales";

function App() {
  return (
    <>
      <LanguageSwitcher />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <Counter />
      </div>
      <TextView />
      <Trans tagName="h2" msg="欢迎使用React" />
    </>
  );
}

export default App;
