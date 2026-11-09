import { useDisplay } from "vuetify"

/**
 * Below this width the app is in "compact" mode: the menu is a drawer that opens over the page (instead of a permanent
 * column that takes 280px) and tables show their rows as cards. A phone, an iPad held upright or a small tablet fall
 * here; a tablet held sideways (1133px and up) and any computer keep the full layout.
 */
export const COMPACT_VIEWPORT_MAX = 1100

/** True while the window is narrower than {@link COMPACT_VIEWPORT_MAX}. */
export const useCompactViewport = () => {
  const display = useDisplay()
  return computed(() => display.width.value < COMPACT_VIEWPORT_MAX)
}

const drawerOpen = ref(true)
const sidebarRail = ref(false)

export const useAppLayout = () => {
  const isMobile = useCompactViewport()

  const toggleDrawer = () => {
    drawerOpen.value = !drawerOpen.value
  }

  const toggleRail = () => {
    sidebarRail.value = !sidebarRail.value
  }

  const handleNavClick = () => {
    if (isMobile.value) {
      drawerOpen.value = false
      return
    }

    if (sidebarRail.value) {
      sidebarRail.value = false
    }
  }

  watch(
    isMobile,
    (mobile) => {
      if (mobile) {
        sidebarRail.value = false
        drawerOpen.value = false
        return
      }

      drawerOpen.value = true
    },
    { immediate: true }
  )

  return {
    drawerOpen,
    sidebarRail,
    isMobile,
    toggleDrawer,
    toggleRail,
    handleNavClick,
  }
}
