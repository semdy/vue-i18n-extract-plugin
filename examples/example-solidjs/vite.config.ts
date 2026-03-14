import path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { vitePluginI18n } from "extract-i18n-plugin";

export default defineConfig({
  server: {
    port: 5175,
    open: true
  },
  plugins: [solid(), vitePluginI18n()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src")
    }
  }
});
