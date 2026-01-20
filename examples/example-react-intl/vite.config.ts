import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vitePluginI18n } from "extract-i18n-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vitePluginI18n()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src")
    }
  }
});
