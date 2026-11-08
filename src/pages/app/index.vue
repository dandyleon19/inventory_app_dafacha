<template>
  <!-- The owner of the platform sees every company's subscription; everybody else sees their own company. -->
  <DashboardSuperAdmin v-if="authStore.isSuperAdmin" />
  <DashboardInventoryOverview v-else />
</template>

<script setup lang="ts">
import { useAuthStore } from "~/store/modules/auth"

definePageMeta({ layout: "app" })
useHead({ title: "Dashboard" })

const authStore = useAuthStore()
</script>
