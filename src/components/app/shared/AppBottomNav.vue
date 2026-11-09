<template>
  <!--
    Phone layout only (the layout mounts it when the screen is small): quick access to the most used pages, plus
    "Más" which opens the sidebar for everything else. The highlighted item comes from the current route, the same
    source the sidebar uses, so both always agree on which page is the current one.
  -->
  <v-bottom-navigation
    :model-value="activeValue"
    :active="visible"
    mandatory
    grow
    height="68"
    color="primary"
    class="app-bottom-nav"
    aria-label="Accesos rápidos"
  >
    <v-btn
      v-for="item in items"
      :key="item.to"
      :value="item.to"
      class="app-bottom-nav__btn"
      @click="go(item.to)"
    >
      <v-icon size="24">{{ item.icon }}</v-icon>
      <span class="app-bottom-nav__label">{{ item.title }}</span>
    </v-btn>

    <v-btn value="more" class="app-bottom-nav__btn" aria-label="Abrir el menú completo" @click="toggleDrawer">
      <v-icon size="24">{{ APP_ICONS.menu }}</v-icon>
      <span class="app-bottom-nav__label">Más</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import { useAppLayout } from "~/composables/useAppLayout"
import { useAuthStore } from "~/store/modules/auth"
import { useOverlayState } from "~/composables/useOverlayState"

interface QuickItem {
  title: string
  icon: string
  to: string
  /** Only the page itself counts as current (not its sub-pages): needed for the home page, which is a prefix of all. */
  exact?: boolean
}

// The most used pages, open to every role (the rest stay in the sidebar). Change the list here to change the bar.
const companyItems: QuickItem[] = [
  { title: "Inicio", icon: APP_ICONS.dashboard, to: "/app", exact: true },
  { title: "Inventario", icon: APP_ICONS.stock, to: "/app/inventory" },
  { title: "Órdenes", icon: APP_ICONS.purchaseOrder, to: "/app/purchase-orders" },
  { title: "Productos", icon: APP_ICONS.package, to: "/app/products" },
]

// The platform owner only has the platform pages.
const platformItems: QuickItem[] = [
  { title: "Inicio", icon: APP_ICONS.dashboard, to: "/app", exact: true },
  { title: "Empresas", icon: APP_ICONS.building, to: "/app/companies" },
  { title: "Almacenes", icon: APP_ICONS.warehouse, to: "/app/warehouses" },
  { title: "Usuarios", icon: APP_ICONS.users, to: "/app/users" },
]

const authStore = useAuthStore()
const items = computed(() => (authStore.isSuperAdmin ? platformItems : companyItems))

const route = useRoute()
const { drawerOpen, toggleDrawer } = useAppLayout()
const { anyOpen } = useOverlayState()

const isCurrent = (item: QuickItem) =>
  route.path === item.to || (!item.exact && route.path.startsWith(`${item.to}/`))

/** The quick page the user is on; when it is a page that lives only in the sidebar, "Más" is the one highlighted. */
const activeValue = computed(() => items.value.find(isCurrent)?.to ?? "more")

// Out of the way while the sidebar or a form panel is open: they cover the same area.
const visible = computed(() => !drawerOpen.value && !anyOpen.value)

const go = (to: string) => {
  if (route.path !== to) navigateTo(to)
}
</script>

<style scoped>
.app-bottom-nav {
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.08);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Vuetify gives every button of the bar a minimum width of 80px: with five or six items that is wider than a phone, so the
   first and the last would fall off the screen. They share the width instead. */
.app-bottom-nav :deep(.app-bottom-nav__btn.v-btn) {
  min-width: 0;
  padding-inline: 2px;
  border-radius: 16px;
  text-transform: none;
  letter-spacing: normal;
}

.app-bottom-nav__label {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
}

/* The current page: a soft tile behind icon and label, like the sidebar's highlighted row. */
.app-bottom-nav :deep(.v-btn--active) {
  background: rgba(var(--v-theme-primary), 0.12);
}

.app-bottom-nav :deep(.v-btn--active .v-btn__overlay) {
  opacity: 0;
}
</style>
