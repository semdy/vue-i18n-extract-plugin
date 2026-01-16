import reactLogo from "./assets/react.svg";
import "./App.css";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Counter from "@/components/Counter";
import TextView from "@/components/TextView";

function App() {
  return (
    <>
      <LanguageSwitcher />
      <div>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>React</h1>
      <div className="card">
        <Counter />
      </div>
      <TextView />
    </>
  );
}

export default App;
