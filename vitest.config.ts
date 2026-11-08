import { defineVitestConfig } from "@nuxt/test-utils/config"

// Runs the specs inside a real Nuxt app (auto-imports, Pinia, Vuetify plugin, runtime config) so components and
// stores behave as they do in the browser, without needing the API or a browser.
export default defineVitestConfig({
  test: {
    environment: "nuxt",
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["tests/setup.ts"],
  },
})
