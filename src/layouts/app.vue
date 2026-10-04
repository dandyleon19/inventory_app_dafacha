<template>
  <v-app>
    <AppSidebar />

    <v-main class="app-layout-main">
      <NavBar />
      <v-container class="app-layout-container" fluid>
        <slot />
      </v-container>
    </v-main>

    <!-- Phones only: quick access to the key pages, working alongside the sidebar. -->
    <AppBottomNav v-if="isMobile" />
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from "~/store/modules/auth"
import { useAppLayout } from "~/composables/useAppLayout"

const authStore = useAuthStore()
const { isMobile } = useAppLayout()

useHead({
  titleTemplate: (title) => {
    const companyName = authStore.user?.companyName || "DF Inventory"
    return title ? `${title} - ${companyName}` : companyName
  },
})
</script>

<style scoped>
.app-layout-main {
  background: rgb(var(--v-theme-surface));
  /* A flex/grid child with long content can't shrink below it unless told it may: that is what pushes pages sideways. */
  min-width: 0;
}

.app-layout-container {
  width: 100%;
  max-width: 100%;
  padding-top: 8px;
  padding-bottom: 24px;
  /* Safety net: whatever a page does, the page itself never scrolls sideways (tables and code scroll inside their own box). */
  overflow-x: clip;
}

@media (max-width: 799px) {
  .app-layout-container {
    padding-inline: 12px;
  }

  /* Long names (warehouses, products) wrap inside a chip instead of stretching the page. */
  .app-layout-container :deep(.v-chip) {
    max-width: 100%;
    height: auto;
    min-height: 24px;
  }

  .app-layout-container :deep(.v-chip__content) {
    white-space: normal;
  }
}
</style>
