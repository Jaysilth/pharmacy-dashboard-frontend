import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const port = Number(env.PORT) || 5173;

  // Backend target (Spring Boot)
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET || "http://localhost:8080";

  return {
    base: env.BASE_PATH || "/",

    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },

    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },

    server: {
      port,
      host: "0.0.0.0",

      // 🔥 FIXED PROXY (IMPORTANT PART)
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false, // 🔴 important for local dev stability
          ws: true,

          // optional debugging (VERY useful)
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log(
                `[VITE PROXY] ${req.method} -> ${apiProxyTarget}${req.url}`
              );
            });
          },
        },
      },
    },

    preview: {
      port,
      host: "0.0.0.0",
    },
  };
});