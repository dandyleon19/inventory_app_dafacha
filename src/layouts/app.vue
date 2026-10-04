<template>
  <v-app>
    <AppSidebar />

    <v-main class="app-layout-main">
      <NavBar />
      <v-container class="app-layout-container" fluid>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from "~/store/modules/auth"

const authStore = useAuthStore()

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
}

.app-layout-container {
  width: 100%;
  max-width: 100%;
  padding-top: 8px;
  padding-bottom: 24px;
}
</style>
