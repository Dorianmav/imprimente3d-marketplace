import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: "http://localhost:3000",
    },
  },
  modules: ["@nuxt/ui", "@pinia/nuxt"],
  css: ["@/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
});
