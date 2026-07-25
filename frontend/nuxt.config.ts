import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  runtimeConfig: {
    apiBaseServer: process.env.API_BASE_SERVER || "http://backend:3001",
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3001",
    },
  },
  modules: ["@nuxt/ui", "@pinia/nuxt"],
  css: ["@/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
    },
  },
});
