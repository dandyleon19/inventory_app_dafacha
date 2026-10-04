<template>
  <v-app-bar color="navbar" :elevation="2" rounded="0">
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
      <AlertsMenu />

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
const route = useRoute()
const dashboardStore = useDashboardStore()
onMounted(() => dashboardStore.fetchSummary())
watch(() => route.fullPath, () => dashboardStore.fetchSummary())

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
.app-navbar__title {
  font-size: clamp(0.95rem, 2.5vw, 1.25rem);
}

.app-navbar__toggle.v-btn--variant-text,
.app-navbar__toggle.v-btn--variant-text .v-icon {
  color: #fff !important;
}
</style>
