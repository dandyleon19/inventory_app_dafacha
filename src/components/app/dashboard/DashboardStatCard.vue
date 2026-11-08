<template>
  <v-card
    class="dashboard-stat-card"
    :class="{ 'dashboard-stat-card--link': to }"
    :style="accentStyle"
    :to="to"
    :link="!!to"
    rounded="xl"
    elevation="0"
  >
    <v-card-text class="dashboard-stat-card__body">
      <div class="dashboard-stat-card__icon">
        <v-icon :icon="icon" size="24" />
      </div>

      <div class="dashboard-stat-card__content">
        <div class="dashboard-stat-card__label-row">
          <p class="dashboard-stat-card__label">{{ label }}</p>
          <v-tooltip v-if="hint" location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" icon="tabler:info-circle" size="14" class="dashboard-stat-card__hint" />
            </template>
            {{ hint }}
          </v-tooltip>
        </div>
        <AppSkeletonTransition>
          <v-skeleton-loader v-if="loading" key="dashboard-stat-skeleton" type="text" width="64" />
          <p v-else key="dashboard-stat-content" class="dashboard-stat-card__value">{{ value }}</p>
        </AppSkeletonTransition>
        <p v-if="caption && !loading" class="dashboard-stat-card__caption">{{ caption }}</p>
      </div>

      <v-icon v-if="to" icon="tabler:chevron-right" size="18" class="dashboard-stat-card__chevron" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  label: string
  value: number | string
  icon: string
  color?: string
  loading?: boolean
  hint?: string
  /** Small line under the value, e.g. "12 ventas". */
  caption?: string
  to?: string
}>()

// The accent comes from the theme color ("primary", "success", ...), so the tile follows palette changes.
// The icon is printed in the dark "ink" of that color, since the bright fill is too pale on its own tinted tile.
const accentStyle = computed(() => ({
  "--stat-accent": `var(--v-theme-${props.color || "primary"})`,
  "--stat-ink": `var(--ink-${props.color || "primary"}, rgb(var(--v-theme-${props.color || "primary"})))`,
}))
</script>

<style scoped>
.dashboard-stat-card {
  position: relative;
  overflow: hidden;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

/* A thin accent line along the top edge ties the card to its color. */
.dashboard-stat-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, rgb(var(--stat-accent)) 0%, rgba(var(--stat-accent), 0.25) 100%);
}

.dashboard-stat-card--link:hover {
  border-color: rgba(var(--stat-accent), 0.4);
}

.dashboard-stat-card__body {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.25rem 1.125rem !important;
}

.dashboard-stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  color: var(--stat-ink);
  background: linear-gradient(135deg, rgba(var(--stat-accent), 0.18) 0%, rgba(var(--stat-accent), 0.08) 100%);
  box-shadow: inset 0 0 0 1px rgba(var(--stat-accent), 0.16);
}

.dashboard-stat-card__content {
  flex: 1 1 auto;
  min-width: 0;
}

.dashboard-stat-card__label-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
}

.dashboard-stat-card__label {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.dashboard-stat-card__hint {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.dashboard-stat-card__value {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.625rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: rgba(var(--v-theme-on-surface), 0.92);
  overflow-wrap: anywhere;
}

.dashboard-stat-card__caption {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.dashboard-stat-card__chevron {
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.32);
  transition: transform 0.2s ease, color 0.2s ease;
}

.dashboard-stat-card--link:hover .dashboard-stat-card__chevron {
  color: var(--stat-ink);
  transform: translateX(3px);
}
</style>
