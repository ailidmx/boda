import { defineConfig } from "vite";

export default defineConfig({
  // The dashboard is served under /dashboard/ (via proxy in dev, and via
  // Firebase Hosting rewrites in production). Setting base ensures all
  // asset URLs are prefixed correctly.
  base: "/dashboard/",
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    // Output into the invitation's dist folder so that a single Firebase
    // Hosting site can serve both apps: the invitation at / and the
    // dashboard under /dashboard/*.
    outDir: "../invitation/dist/dashboard",
    emptyOutDir: true,
  },
});
