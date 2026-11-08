<template>
  <div class="dashboard-empty">
    <span class="dashboard-empty__icon">
      <v-icon :icon="icon" size="22" />
    </span>
    <p class="dashboard-empty__title">{{ title }}</p>
    <p v-if="hint" class="dashboard-empty__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    hint?: string
    icon?: string
  }>(),
  {
    hint: "",
    icon: "tabler:inbox",
  }
)
</script>

<style scoped>
.dashboard-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.75rem 1rem;
  text-align: center;
}

.dashboard-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 0.75rem;
  border-radius: 14px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.dashboard-empty__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.dashboard-empty__hint {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
</style>
