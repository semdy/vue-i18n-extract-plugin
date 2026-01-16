import { createApp } from "vue";
import "./style.css";
import i18n from "./locales";
import App from "./App.vue";

createApp(App).use(i18n).mount("#app");
