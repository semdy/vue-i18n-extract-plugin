import path from "node:path";
import type { Request, Response } from "express";
import { defineConfig } from "vite";
import marko from "@marko/vite";
import { vitePluginI18n } from "extract-i18n-plugin";

export default defineConfig({
  server: {
    port: 5192,
    open: true
  },
  build: {
    ssr: "./src/index.ts",
    sourcemap: true, // Generate sourcemaps for all builds.
    emptyOutDir: false // Avoid server & client deleting files from each other.
  },
  resolve: {
    alias: {
      "@": path.join(__dirname, "src")
    }
  },
  plugins: [
    marko(),
    vitePluginI18n(),
    {
      name: "preview",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          try {
            const { router } = (await server.ssrLoadModule(
              "./src/index.ts"
            )) as typeof import("./src/index.ts");
            router(req as Request, res as Response, next);
          } catch (err) {
            next(err);
          }
        });
      }
    }
  ]
});
