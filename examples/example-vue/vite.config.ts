import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { vitePluginI18n } from "extract-i18n-plugin";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173
  },
  plugins: [vue(), vitePluginI18n()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src")
    }
  }
});
