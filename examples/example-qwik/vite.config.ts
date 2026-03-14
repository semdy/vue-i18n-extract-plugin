import path from "node:path";
import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { vitePluginI18n } from "extract-i18n-plugin";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5178,
    open: true
  },
  plugins: [
    qwikVite({
      csr: true
    }),
    vitePluginI18n()
  ],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src")
    }
  }
});
