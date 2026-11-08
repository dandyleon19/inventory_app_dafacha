import 'vuetify/styles'
import '~/assets/styles/typography.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createVuetify } from 'vuetify'
import { es } from 'vuetify/locale'
import { createHybridIconSet } from '~/helpers/iconHelpers'
import { VUETIFY_ICON_ALIASES } from '~/constants/vuetifyIconAliases'

export default defineNuxtPlugin(nuxtApp => {
  const inventoryLightTheme = {
    dark: false,
    colors: {
      // Petronas green on black and silver (Mercedes F1). Green is the action color; black frames the app.
      primary: '#00A19B',
      'primary-light': '#5CD6CF',
      background: '#FFFFFF',
      // Cards and panels are white; the page behind them is a soft tinted canvas (--app-canvas).
      surface: '#FFFFFF',
      text: '#212121',
      'text-secondary': '#9E9E9E',
      // State fills are deep enough for WHITE text (4.5:1 or better); amber is too light for white, so its text
      // is near-black. The "on-*" colors below are what buttons, chips and alerts print on each fill.
      success: '#1B8556',
      warning: '#F2B100',
      info: '#1F78C1',
      error: '#D32F2F',
      // Petronas green is bright: its text is near-black (white on it is only 3:1).
      'on-primary': '#0B0B0C',
      'on-warning': '#14110F',
      'on-success': '#FFFFFF',
      'on-info': '#FFFFFF',
      'on-error': '#FFFFFF',
      navbar: '#0E0E10',
      sidebar: '#0B0B0C',
    },
    variables: {
      // Secondary text ("text-medium-emphasis", subtitles) was 60% black = 4.3:1; 72% is 6:1.
      'medium-emphasis-opacity': 0.72,
    },
  }

  const vuetify = createVuetify({
    ssr: false,
    locale: {
      locale: 'es',
      fallback: 'en',
      messages: { es },
    },
    components: {
      ...components,
    },
    directives,
    display: {
      thresholds: {
        xs: 0,
        sm: 340,
        md: 540,
        lg: 800,
        xl: 1280,
      }
    },
    defaults: {
      // The browser's own suggestion bubble ("Tesén Cornejo", old entries it remembers) covers the list of options
      // in every input. 'suppress' is Vuetify's way of turning it off; a field that needs the browser's help
      // (the login form) sets its own `autocomplete` and wins over this default.
      VTextField: { autocomplete: 'suppress' },
      VTextarea: { autocomplete: 'suppress' },
      VSelect: { autocomplete: 'suppress' },
      VAutocomplete: { autocomplete: 'suppress' },
      VCombobox: { autocomplete: 'suppress' },
      VChip: {
        rounded: 'lg',
      },
      VBtn: {
        variant: 'flat',
        color: 'primary',
        elevation: 0,
      },
    },
    theme: {
      defaultTheme: 'inventoryLightTheme',
      themes: {
        inventoryLightTheme,
      }
    },
    icons: {
      defaultSet: 'hybrid',
      aliases: VUETIFY_ICON_ALIASES,
      sets: {
        hybrid: createHybridIconSet(),
      },
    },
  })
  nuxtApp.vueApp.use(vuetify)
})
