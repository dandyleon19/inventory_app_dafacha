<template>
  <v-card class="dash-card" rounded="xl" elevation="0">
    <div class="dash-card__header">
      <div class="d-flex align-center ga-2">
        <v-icon :icon="icon" :color="color" size="22" />
        <h2 class="text-subtitle-1 font-weight-bold app-font-heading">{{ title }}</h2>
        <v-chip v-if="count !== undefined && count > 0" size="x-small" :color="color" variant="tonal">
          {{ count }}
        </v-chip>
      </div>

      <v-btn v-if="to" :to="to" variant="text" size="small" class="text-none">
        Ver todo
      </v-btn>
    </div>

    <div v-if="empty" class="dash-card__empty">
      <v-icon :icon="APP_ICONS.checkCircle" color="success" size="20" />
      <span class="text-body-2 text-medium-emphasis">{{ emptyText }}</span>
    </div>

    <v-list v-else density="comfortable" lines="two" class="py-0 dash-card__list">
      <slot />
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"

withDefaults(
  defineProps<{
    title: string
    icon: string
    color?: string
    /** Optional counter shown next to the title. */
    count?: number
    to?: string
    empty?: boolean
    emptyText?: string
  }>(),
  {
    color: "primary",
    empty: false,
    emptyText: "Nada que mostrar",
  }
)
</script>

<style scoped>
.dash-card {
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
}

.dash-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 1rem 1.25rem 0.5rem;
}

.dash-card__empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem 1.5rem;
}

.dash-card__list {
  background: transparent;
}
</style>
