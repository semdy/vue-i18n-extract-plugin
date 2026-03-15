import path from "node:path";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { vitePluginI18n } from "extract-i18n-plugin";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5180,
    open: true
  },
  plugins: [preact(), vitePluginI18n()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src")
    }
  }
});
