<template>
  <div class="app-form-section">
    <div v-if="title" class="app-form-section__header">
      <p class="app-form-section__title app-font-heading">{{ title }}</p>
      <p v-if="subtitle" class="app-form-section__subtitle">
        {{ subtitle }}
      </p>
    </div>
    <div class="app-form-section__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<style scoped>
.app-form-section {
  margin-bottom: 2rem;
}

.app-form-section:last-child {
  margin-bottom: 0;
}

.app-form-section__header {
  margin-bottom: 1.25rem;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.08) 0%,
    rgba(var(--v-theme-surface), 0.95) 100%
  );
  border: 1px solid rgba(var(--v-theme-primary), 0.14);
}

.app-form-section__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.app-form-section__subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.app-form-section__content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.app-form-section__content > .v-row {
  margin-top: 0;
  margin-bottom: 0;
}
</style>
