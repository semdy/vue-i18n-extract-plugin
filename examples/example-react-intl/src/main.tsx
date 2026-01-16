import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import LocaleWrapper from "@/locales/Wrapper";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleWrapper>
      <App />
    </LocaleWrapper>
  </StrictMode>
);
