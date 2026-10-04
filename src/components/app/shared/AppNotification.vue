<template>
  <v-snackbar
    v-model="notification.visible"
    :color="snackbarColor"
    :timeout="notification.timeout"
    location="top"
    rounded="lg"
    elevation="12"
    class="app-notification"
  >
    <div class="d-flex align-center ga-3 py-1">
      <v-avatar :color="iconColor" size="36" class="flex-shrink-0">
        <v-icon :icon="icon" color="white" size="20" />
      </v-avatar>

      <div class="text-white">
        <div v-if="notification.title" class="text-subtitle-2 font-weight-bold">
          {{ notification.title }}
        </div>
        <div class="text-body-2">{{ notification.message }}</div>
      </div>
    </div>

    <template #actions>
      <v-btn
        variant="text"
        :icon="APP_ICONS.close"
        color="white"
        size="small"
        @click="hide"
      />
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import type { NotificationType } from "~/composables/useNotification"

const { notification, hide } = useNotification()

const config: Record<
  NotificationType,
  { color: string; icon: string; iconColor: string }
> = {
  success: {
    color: "success",
    icon: APP_ICONS.checkCircle,
    iconColor: "rgba(255, 255, 255, 0.2)",
  },
  error: {
    color: "error",
    icon: APP_ICONS.error,
    iconColor: "rgba(255, 255, 255, 0.2)",
  },
  info: {
    color: "info",
    icon: APP_ICONS.info,
    iconColor: "rgba(255, 255, 255, 0.2)",
  },
  warning: {
    color: "warning",
    icon: APP_ICONS.warning,
    iconColor: "rgba(255, 255, 255, 0.2)",
  },
}

const snackbarColor = computed(() => config[notification.value.type].color)
const icon = computed(() => config[notification.value.type].icon)
const iconColor = computed(() => config[notification.value.type].iconColor)
</script>

<style scoped>
.app-notification :deep(.v-snackbar__wrapper) {
  min-width: 320px;
  max-width: 480px;
}
</style>
