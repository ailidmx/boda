import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build number injected at build time so the footer can display the exact
// deployed version. It is a short UTC timestamp (YYYYMMDD-HHMM) that changes
// on every build, making it trivial to confirm which release a guest is seeing
// (and to spot a stale cached version).
const BUILD_NUMBER = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 13);

export default defineConfig({
  base: "./",
  plugins: [
    react(),
  ],
  define: {
    __BUILD_NUMBER__: JSON.stringify(BUILD_NUMBER),
  },

  build: {
    // The dashboard build outputs into dist/dashboard/. We must NOT empty the
    // whole dist folder here, otherwise it would wipe the dashboard build.
    // The root build:all script handles cleaning dist/ before building.
    emptyOutDir: false,
    // The Firebase SDK is a large vendor dependency (~677 kB minified) that is
    // split into its own cached chunk. It's loaded once and cached by the
    // browser, so it doesn't affect the initial render. Raise the warning
    // threshold to acknowledge this known, intentional large chunk.
    chunkSizeWarningLimit: 700,
    rollupOptions: {

      output: {
        // Code-split the large, rarely-changing modules into their own chunks
        // so the main entry bundle stays small and the browser can cache them
        // independently across deploys.
        manualChunks: {
          // React + React DOM (framework runtime).
          "react-vendor": ["react", "react-dom"],
          // The big trilingual content/data file (125 kB of translations).
          content: ["/src/content.js"],
          // Spotify Web Playback SDK integration.
          spotify: ["/src/spotify-player.js"],
          // Cloudinary image delivery SDK.
          cloudinary: ["@cloudinary/react", "@cloudinary/url-gen"],
          // Firebase SDK.
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
        },
      },
    },
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
