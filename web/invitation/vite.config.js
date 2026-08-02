import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // The dashboard build outputs into dist/dashboard/. We must NOT empty the
    // whole dist folder here, otherwise it would wipe the dashboard build.
    // The root build:all script handles cleaning dist/ before building.
    emptyOutDir: false,
  },
  server: {

    port: 5173,
    strictPort: true,
    proxy: {
      // In dev, the dashboard is a separate build served on port 5174.
      // Proxy all /dashboard/* requests to it so the invitation dev server
      // can serve both apps from a single origin (localhost:5173).
      "/dashboard": {
        target: "http://localhost:5174",
        changeOrigin: true,
        // Keep the /dashboard prefix so the dashboard build's base path works.
        // Ensure a trailing slash on the bare /dashboard path so the dashboard
        // server (base "/dashboard/") serves it instead of showing a redirect
        // prompt.
        rewrite: (path) => (path === "/dashboard" ? "/dashboard/" : path),
      },
    },

  },
});
