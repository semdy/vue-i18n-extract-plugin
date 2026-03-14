import path from "node:path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { vitePluginI18n } from "extract-i18n-plugin";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5174,
    open: true
  },
  plugins: [svelte(), vitePluginI18n()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src")
    }
  }
});
