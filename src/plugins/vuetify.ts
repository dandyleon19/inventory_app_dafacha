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
      primary: '#1F6F78',
      'primary-light': '#7FB5BA',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#212121',
      'text-secondary': '#9E9E9E',
      success: '#81C784',
      warning: '#FB8C00',
      info: '#4FC3F7',
      error: '#E57373',
      navbar: '#1F6F78',
      sidebar: '#212121',
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
