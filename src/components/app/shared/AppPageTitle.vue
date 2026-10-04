<template>
  <div class="app-page-title-wrapper">
    <v-card class="app-page-title mb-4" rounded="xl" elevation="0">
      <v-card-text class="pa-5 pa-md-6">
        <div class="d-flex align-center justify-space-between flex-wrap ga-4">
          <div>
            <p v-if="subtitle" class="text-overline text-medium-emphasis mb-1">
              {{ subtitle }}
            </p>
            <h1 class="text-h5 text-md-h4 font-weight-bold mb-2">
              {{ title }}
            </h1>
            <v-chip
              v-if="totalItems !== undefined"
              size="small"
              color="primary"
              variant="tonal"
              :prepend-icon="APP_ICONS.list"
            >
              {{ totalItems }} registro{{ totalItems === 1 ? "" : "s" }}
            </v-chip>
          </div>

          <div v-if="$slots.actions" class="app-page-title__actions d-flex flex-wrap ga-2">
            <slot name="actions" />
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    totalItems?: number
  }>(),
  {
    subtitle: "",
  }
)
</script>

<style scoped>
.app-page-title-wrapper {
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  min-width: 0;
}

.app-page-title {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.08) 0%,
    rgb(var(--v-theme-background)) 55%
  );
}

@media (max-width: 960px) {
  .app-page-title :deep(.v-card-text) {
    padding: 1.25rem !important;
  }
}

/* Phones: the title takes a full row and the actions sit below it, each button sharing the width. */
@media (max-width: 799px) {
  .app-page-title h1 {
    overflow-wrap: anywhere;
  }

  .app-page-title__actions {
    width: 100%;
  }

  .app-page-title__actions :deep(.v-btn) {
    flex: 1 1 auto;
    min-width: 0;
  }
}
</style>
