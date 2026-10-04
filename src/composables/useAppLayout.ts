import { useDisplay } from "vuetify"

const drawerOpen = ref(true)
const sidebarRail = ref(false)

export const useAppLayout = () => {
  const display = useDisplay()

  const isMobile = computed(() => display.mdAndDown.value)

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
