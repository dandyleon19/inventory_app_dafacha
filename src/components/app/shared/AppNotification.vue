<template>
  <v-snackbar
    v-model="notification.visible"
    :color="snackbarColor"
    :timeout="notification.timeout"
    location="top"
    rounded="lg"
    elevation="12"
    class="app-notification"
    :style="{ '--notification-text': onColor }"
  >
    <div class="d-flex align-center ga-3 py-1 app-notification__body">
      <v-avatar :color="iconColor" size="36" class="flex-shrink-0">
        <v-icon :icon="icon" size="20" />
      </v-avatar>

      <div>
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
        size="small"
        class="app-notification__close"
        aria-label="Cerrar aviso"
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

// Text and icon use the theme's "on" color of the fill: white on green, blue and red; near-black on amber.
const onColor = computed(() => `rgb(var(--v-theme-on-${snackbarColor.value}))`)
const iconColor = computed(() =>
  notification.value.type === "warning" ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.2)"
)
</script>

<style scoped>
.app-notification :deep(.v-snackbar__wrapper) {
  min-width: min(320px, calc(100vw - 32px));
  max-width: min(480px, calc(100vw - 32px));
  color: var(--notification-text);
}

.app-notification__body,
.app-notification__body :deep(.v-icon),
.app-notification__close,
.app-notification__close :deep(.v-icon) {
  color: var(--notification-text) !important;
}
</style>
