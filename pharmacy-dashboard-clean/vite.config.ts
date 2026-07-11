import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/**
 * SECURITY FIX — real HTTP security headers.
 *
 * The CSP <meta> tag in index.html covers script/style/connect-src etc.,
 * but per spec, `frame-ancestors` is silently ignored when set via <meta> —
 * it only takes effect as a real HTTP header. Without this, the clickjacking
 * protection implied by the CSP was never actually enforced. `vite preview`
 * (what actually serves this app in production on Render — see package.json)
 * is a real Connect/http server under the hood, so a plugin middleware can
 * set response headers directly; no separate server or hosting change needed.
 *
 * Also sets X-Frame-Options as a redundant, older-browser-compatible
 * backstop for the same clickjacking protection, plus X-Content-Type-Options,
 * Referrer-Policy, Permissions-Policy, and X-Robots-Tag (a real header
 * equivalent of the noindex/nofollow meta tag — this one applies to every
 * response, not just the HTML document).
 */
function securityHeadersPlugin(): Plugin {
  const applyHeaders = (res: { setHeader: (name: string, value: string) => void }) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    // frame-ancestors 'none' is the actual clickjacking-relevant directive here;
    // the rest of the CSP already lives in index.html's <meta> tag and is left
    // there rather than duplicated, to avoid the two drifting out of sync.
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  };

  return {
    name: "security-headers",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        applyHeaders(res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        applyHeaders(res);
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const port = Number(env.PORT) || 5173;

  // Backend target (Spring Boot)
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET || "http://localhost:8080";

  return {
    base: env.BASE_PATH || "/",

    plugins: [react(), tailwindcss(), securityHeadersPlugin()],

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
