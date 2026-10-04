<template>
  <div class="app-table-skeleton" :aria-busy="true">
    <div class="app-table-skeleton__head">
      <div
        v-for="column in columns"
        :key="`head-${column}`"
        class="app-table-skeleton__cell app-table-skeleton__cell--head"
      >
        <v-skeleton-loader type="text" width="72%" />
      </div>
    </div>

    <div
      v-for="row in rows"
      :key="`row-${row}`"
      class="app-table-skeleton__row"
    >
      <div
        v-for="column in columns"
        :key="`row-${row}-col-${column}`"
        class="app-table-skeleton__cell"
      >
        <v-skeleton-loader
          :type="column === 1 ? 'avatar' : 'text'"
          :width="column === 1 ? undefined : `${55 + ((row + column) % 4) * 12}%`"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    columns?: number
    rows?: number
  }>(),
  {
    columns: 6,
    rows: 1,
  }
)
</script>

<style scoped>
.app-table-skeleton {
  width: 100%;
  overflow: hidden;
}

.app-table-skeleton__head,
.app-table-skeleton__row {
  display: grid;
    grid-template-columns: repeat(v-bind(columns), minmax(0, 1fr));
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  align-items: center;
}

.app-table-skeleton__head {
  background: rgba(var(--v-theme-on-surface), 0.025);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.45);
}

.app-table-skeleton__row:nth-child(even) {
  background: rgba(var(--v-theme-on-surface), 0.018);
}

.app-table-skeleton__row:not(:last-child) {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.28);
}

.app-table-skeleton__cell :deep(.v-skeleton-loader__bone) {
  border-radius: 0.5rem;
}

.app-table-skeleton__cell--head :deep(.v-skeleton-loader__text) {
  height: 0.75rem;
}
</style>
