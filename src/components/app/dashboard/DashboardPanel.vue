<template>
  <v-card class="dashboard-panel" rounded="xl" elevation="0">
    <header class="dashboard-panel__header">
      <div class="dashboard-panel__heading">
        <h2 class="dashboard-panel__title">{{ title }}</h2>
        <p v-if="subtitle" class="dashboard-panel__subtitle">{{ subtitle }}</p>
      </div>

      <div v-if="$slots.actions || to" class="dashboard-panel__actions">
        <slot name="actions" />
        <v-btn
          v-if="to"
          :to="to"
          variant="text"
          size="small"
          class="dashboard-panel__link"
          append-icon="tabler:arrow-right"
        >
          {{ actionLabel }}
        </v-btn>
      </div>
    </header>

    <div class="dashboard-panel__body" :class="{ 'dashboard-panel__body--flush': flush }">
      <slot />
    </div>
  </v-card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    to?: string
    actionLabel?: string
    /** No padding around the content (lists that draw their own rows). */
    flush?: boolean
  }>(),
  {
    subtitle: "",
    to: undefined,
    actionLabel: "Ver todo",
    flush: false,
  }
)
</script>

<style scoped>
.dashboard-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), 0.1);
  background: rgb(var(--v-theme-surface));
}

.dashboard-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.125rem 1.25rem 0.875rem;
}

.dashboard-panel__heading {
  min-width: 0;
}

.dashboard-panel__title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.dashboard-panel__subtitle {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.dashboard-panel__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0.5rem;
}

.dashboard-panel__link {
  margin-right: -0.5rem;
  font-size: 0.8125rem;
  color: var(--ink-primary) !important;
}

.dashboard-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0.25rem 1.25rem 1.25rem;
}

.dashboard-panel__body--flush {
  padding: 0;
}
</style>
