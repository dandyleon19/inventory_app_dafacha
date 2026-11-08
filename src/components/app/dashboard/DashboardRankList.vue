<template>
  <ol class="dashboard-rank">
    <li v-for="(item, index) in rows" :key="item.key" class="dashboard-rank__row">
      <span class="dashboard-rank__position" :class="{ 'dashboard-rank__position--first': index === 0 }">
        {{ index + 1 }}
      </span>

      <div class="dashboard-rank__main">
        <div class="dashboard-rank__line">
          <span class="dashboard-rank__label" :title="item.label">{{ item.label }}</span>
          <span class="dashboard-rank__value">{{ item.valueLabel }}</span>
        </div>
        <p v-if="item.caption" class="dashboard-rank__caption">{{ item.caption }}</p>
        <div class="dashboard-rank__track" role="presentation">
          <div
            class="dashboard-rank__fill"
            :class="{ 'dashboard-rank__fill--first': index === 0 }"
            :style="{ width: `${item.percent}%` }"
          />
        </div>
      </div>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { computed } from "vue"

interface RankItem {
  key: string | number
  label: string
  value: number
  valueLabel: string
  /** Small line under the name, e.g. "14 vendidos". */
  caption?: string
}

const props = defineProps<{
  items: RankItem[]
}>()

// The longest bar is the leader; the rest are drawn relative to it.
const rows = computed(() => {
  const max = Math.max(...props.items.map((item) => item.value), 1)
  return props.items.map((item) => ({
    ...item,
    percent: Math.max(4, Math.round((item.value / max) * 100)),
  }))
})
</script>

<style scoped>
.dashboard-rank {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard-rank__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dashboard-rank__position {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.72);
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.dashboard-rank__position--first {
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
}

.dashboard-rank__main {
  flex: 1 1 auto;
  min-width: 0;
}

.dashboard-rank__line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.375rem;
}

.dashboard-rank__label {
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), 0.88);
}

.dashboard-rank__value {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.dashboard-rank__caption {
  margin: -0.25rem 0 0.375rem;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.dashboard-rank__track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.07);
}

.dashboard-rank__fill {
  height: 100%;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.45);
  transition: width 0.4s ease;
}

.dashboard-rank__fill--first {
  background: linear-gradient(90deg, rgb(var(--v-theme-primary-light)) 0%, rgb(var(--v-theme-primary)) 100%);
}
</style>
