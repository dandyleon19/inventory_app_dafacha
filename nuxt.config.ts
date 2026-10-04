import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  // Fixed local port (salonspa_app_v2 uses 3000)
  devServer: { port: 3001 },
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  app: {
    head: {
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        { rel: "icon", href: "/favicon.ico?v=4", sizes: "any" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png?v=4" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png?v=4" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=4" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Outfit:wght@500;600;700&display=swap",
        },
      ],
    },
  },
  css: [
    '@/assets/styles/variables.css',
    '@/assets/styles/icons.css',
  ],
  components: [
    {
      path: '~/components',
      pathPrefix: false
    },
    {
      path: '~/components/app/shared',
      pathPrefix: false
    }
  ],
  srcDir: 'src/',
  dir: {
    public: 'public',
  },
  modules: [
    '@nuxt/icon',
    '@pinia/nuxt',
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
  ],
  build: {
    transpile: ['vuetify'],
  },
  icon: {
    mode: 'svg',
    serverBundle: {
      collections: ['tabler'],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_API_BASE,
    }
  }
})
