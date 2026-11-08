<template>
  <v-navigation-drawer
    v-model="drawerOpen"
    color="sidebar"
    class="app-sidebar transition-all duration-300"
    :rail="!isMobile && sidebarRail"
    :permanent="!isMobile"
    :temporary="isMobile"
    :width="280"
    :rail-width="72"
  >
    <div class="app-sidebar__brand" :class="{ 'app-sidebar__brand--spread': !isRail && isMobile }">
      <div class="app-sidebar__logo-wrap">
        <div class="app-sidebar__logo-badge">
          <img :src="logoDf" alt="DF Inventory" class="app-sidebar__logo">
        </div>
        <span v-if="!isRail" class="app-sidebar__brand-name">DF Inventory</span>
      </div>

      <v-btn
        v-if="!isRail && isMobile"
        :icon="APP_ICONS.close"
        variant="text"
        aria-label="Cerrar menú"
        @click="toggleDrawer"
      />
    </div>

    <v-divider />

    <v-list density="compact" nav class="app-sidebar__nav">
      <v-list-item
        v-for="item in filteredItems"
        :key="item.to"
        :prepend-icon="item.icon"
        :append-icon="isLocked(item) ? APP_ICONS.lock : undefined"
        :title="item.title"
        :value="item.title"
        :class="{ 'app-sidebar__item--locked': isLocked(item) }"
        link
        :to="item.to"
        rounded="lg"
        @click="handleNavClick"
        @mouseenter="prefetchSidebarRoute(item.to)"
      />
    </v-list>

    <template v-if="canManageSettings">
      <v-divider />
      <v-list density="compact" nav class="app-sidebar__footer">
        <v-list-item
          :prepend-icon="APP_ICONS.settings"
          title="Configuración"
          value="Configuración"
          link
          to="/app/settings"
          rounded="lg"
          @click="handleNavClick"
          @mouseenter="prefetchSidebarRoute('/app/settings')"
        />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import logoDf from "~/assets/img/logo-df-icon.png"
import { useSubscriptionStore } from "~/store/modules/subscription"
import type { FeatureKey } from "~/interfaces/subscriptionInterfaces"
import { useAuthStore } from "~/store/modules/auth"
import { useAppLayout } from "~/composables/useAppLayout"

const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const { drawerOpen, sidebarRail, isMobile, toggleDrawer, handleNavClick } = useAppLayout()

const isRail = computed(() => !isMobile.value && sidebarRail.value)

interface SidebarItem {
  title: string
  icon: string
  to: string
  onlyFor?: string[]
  /** The platform owner (SUPER_ADMIN) sees only the items marked like this; everybody else never sees them. */
  platform?: boolean
  /** Plan feature the page needs; without it the item stays in the menu with a lock. */
  feature?: FeatureKey
}

// One entry per module; add `onlyFor: ["ADMIN_USER", ...]` to restrict by role.
const items: SidebarItem[] = [
  { title: "Dashboard", icon: APP_ICONS.dashboard, to: "/app", platform: true },
  { title: "Empresas", icon: APP_ICONS.building, to: "/app/companies", onlyFor: ["SUPER_ADMIN"], platform: true },
  { title: "Inventario", icon: APP_ICONS.stock, to: "/app/inventory" },
  { title: "Vencimientos", icon: APP_ICONS.expiry, to: "/app/expirations" },
  { title: "Movimientos", icon: APP_ICONS.movements, to: "/app/stock-movements" },
  { title: "Órdenes de compra", icon: APP_ICONS.purchaseOrder, to: "/app/purchase-orders", feature: "purchase_orders" },
  { title: "Recepciones", icon: APP_ICONS.receive, to: "/app/receipts", feature: "purchase_orders" },
  { title: "Productos", icon: APP_ICONS.package, to: "/app/products" },
  {
    title: "Categorías",
    icon: APP_ICONS.tags,
    to: "/app/product-categories",
    onlyFor: ["ADMIN_USER"],
  },
  {
    title: "Proveedores",
    icon: APP_ICONS.truckDelivery,
    to: "/app/suppliers",
    onlyFor: ["ADMIN_USER", "PURCHASING_USER", "VIEWER"],
    feature: "purchase_orders",
  },
  {
    title: "Almacenes",
    icon: APP_ICONS.warehouse,
    to: "/app/warehouses",
    onlyFor: ["ADMIN_USER"],
    platform: true,
  },
  {
    title: "Usuarios",
    icon: APP_ICONS.users,
    to: "/app/users",
    onlyFor: ["ADMIN_USER"],
    platform: true,
  },
  {
    title: "Auditoría",
    icon: APP_ICONS.audit,
    to: "/app/audit",
    onlyFor: ["ADMIN_USER"],
    feature: "audit_log",
  },
]

// A feature the company's plan does not include stays in the menu with a lock: clicking it explains why.
const isLocked = (item: SidebarItem) =>
  !!item.feature && !authStore.isSuperAdmin && !subscriptionStore.hasFeature(item.feature)

// Settings sit in their own block at the bottom of the sidebar, apart from the module links.
const canManageSettings = computed(() => authStore.isAdmin)

const filteredItems = computed(() =>
  authStore.isSuperAdmin
    ? items.filter((item) => item.platform)
    : items.filter((item) => !item.onlyFor || item.onlyFor.includes(authStore.role as string))
)

const prefetchSidebarRoute = (to: string) => {
  preloadRouteComponents(to)
}
</script>

<style scoped>
.app-sidebar__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  min-height: 72px;
}

.app-sidebar__brand--spread {
  justify-content: space-between;
}

.app-sidebar__logo-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  overflow: hidden;
}

/* The icon is already a rounded colour tile with transparent corners: shown as is, no frame around it. */
.app-sidebar__logo-badge {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
}

.app-sidebar__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.app-sidebar__brand-name {
  font-family: var(--font-heading);
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.app-sidebar__nav {
  flex: 1;
}

.app-sidebar__footer {
  flex: 0 0 auto;
  padding-bottom: 8px;
}

.app-sidebar__footer :deep(.v-list-item-title) {
  opacity: 0.82;
}

.app-sidebar :deep(.v-list-item) {
  min-height: 42px;
  margin-bottom: 3px;
  color: rgba(255, 255, 255, 0.78);
}

.app-sidebar :deep(.v-list-item:hover) {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.app-sidebar :deep(.v-list-item-title) {
  font-size: 0.875rem;
  font-weight: 500;
}

/* Current page: brand tint, a bar on the left edge, white text and a brand-color icon. */
.app-sidebar :deep(.v-list-item--active) {
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.26) 0%, rgba(255, 255, 255, 0.03) 100%);
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
  color: #fff;
}

.app-sidebar :deep(.v-list-item--active .v-list-item-title) {
  font-weight: 600;
}

.app-sidebar :deep(.v-list-item--active .v-list-item__prepend > .v-icon) {
  color: rgb(var(--v-theme-primary));
}

.app-sidebar :deep(.v-list-item__overlay) {
  display: none;
}

.app-sidebar :deep(.v-divider) {
  border-color: rgba(255, 255, 255, 0.08);
  opacity: 1;
}

.app-sidebar :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
}

.app-sidebar :deep(.v-list-item__prepend > .v-icon) {
  color: rgba(255, 255, 255, 0.82);
  opacity: 1;
  margin-inline-end: 8px;
}

.app-sidebar__item--locked :deep(.v-list-item-title),
.app-sidebar__item--locked :deep(.v-list-item__prepend) {
  opacity: 0.68;
}
</style>
