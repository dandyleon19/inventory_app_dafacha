<template>
  <v-app-bar color="navbar" class="app-navbar" :elevation="0" rounded="0">
    <template #prepend>
      <v-app-bar-nav-icon
        v-if="isMobile"
        class="app-navbar__toggle"
        aria-label="Abrir menú"
        @click="toggleDrawer"
      />
      <v-btn
        v-else
        variant="text"
        class="app-navbar__toggle"
        :aria-label="sidebarRail ? 'Expandir menú' : 'Contraer menú'"
        :icon="sidebarRail ? APP_ICONS.menuExpand : APP_ICONS.menuCollapse"
        @click="toggleRail"
      />
    </template>

    <v-app-bar-title class="app-navbar__title">
      {{ companyName }}
    </v-app-bar-title>

    <template #append>
      <AlertsMenu v-if="!authStore.isSuperAdmin" />

      <v-menu location="bottom end" offset="8">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            variant="text"
            class="text-white text-none"
          >
            <v-avatar size="32" color="white" class="mr-2">
              <span class="text-primary text-caption font-weight-bold">
                {{ userInitials }}
              </span>
            </v-avatar>
            <span v-if="userName" class="d-none d-sm-inline">{{ userName }}</span>
            <v-icon end :icon="APP_ICONS.chevronDown" />
          </v-btn>
        </template>

        <v-list min-width="220" rounded="lg">
          <v-list-item>
            <v-list-item-title class="font-weight-medium">
              {{ userName }}
            </v-list-item-title>
            <v-list-item-subtitle>{{ userEmail }}</v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-1" />

          <v-list-item
            :prepend-icon="APP_ICONS.logout"
            title="Cerrar sesión"
            @click="handleLogout"
          />
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore } from "~/store/modules/auth"
import { useDashboardStore } from "~/store/modules/dashboard"
import { useAppLayout } from "~/composables/useAppLayout"

const authStore = useAuthStore()
const { logout } = useAuth()
const { isMobile, sidebarRail, toggleDrawer, toggleRail } = useAppLayout()

// The bell's counters: loaded with the layout and refreshed on navigation (throttled in the store).
// The platform owner has no company of their own, so there is nothing to count (and no bell).
const route = useRoute()
const dashboardStore = useDashboardStore()
const loadAlerts = () => {
  if (!authStore.isSuperAdmin) dashboardStore.fetchSummary()
}
onMounted(loadAlerts)
watch(() => route.fullPath, loadAlerts)

const userName = computed(() => {
  const user = authStore.user
  if (!user) return ""

  return (
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    ""
  )
})

const userEmail = computed(() => authStore.user?.email ?? "")

const companyName = computed(() => authStore.user?.companyName || "DF Inventory")

const userInitials = computed(() => {
  const user = authStore.user
  if (!user) return "?"

  const first = user.firstName?.charAt(0) ?? ""
  const last = user.lastName?.charAt(0) ?? ""
  const initials = `${first}${last}`.toUpperCase()

  if (initials) return initials

  return user.email?.charAt(0).toUpperCase() ?? "?"
})

const handleLogout = async () => {
  await logout()
}
</script>

<style scoped>
/* Carbon black bar with a thin line in the brand color along its bottom edge. */
.app-navbar {
  background-image: linear-gradient(100deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 60%);
  box-shadow:
    inset 0 -2px 0 rgb(var(--v-theme-primary)),
    0 8px 22px rgba(0, 0, 0, 0.28);
}

/* Everything printed on the black bar is white (the global rule for text buttons would make it dark gray). */
.app-navbar :deep(.v-btn.v-btn--variant-text),
.app-navbar :deep(.v-btn.v-btn--variant-text .v-icon),
.app-navbar :deep(.v-app-bar-title) {
  color: #fff !important;
}

.app-navbar__title {
  font-family: var(--font-heading);
  font-weight: 600;
  letter-spacing: -0.01em;
  font-size: clamp(0.95rem, 2.5vw, 1.25rem);
}

.app-navbar__toggle.v-btn--variant-text,
.app-navbar__toggle.v-btn--variant-text .v-icon {
  color: #fff !important;
}
</style>
