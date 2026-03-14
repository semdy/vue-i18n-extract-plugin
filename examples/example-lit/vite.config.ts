import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginI18n } from "extract-i18n-plugin";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5179,
    open: true
  },
  plugins: [vitePluginI18n()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src")
    }
  }
});
