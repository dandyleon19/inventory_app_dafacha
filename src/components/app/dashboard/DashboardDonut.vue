<template>
  <div class="dashboard-donut">
    <div class="dashboard-donut__chart">
      <svg viewBox="0 0 120 120" class="dashboard-donut__svg" role="img" :aria-label="`${centerLabel}: ${total}`">
        <circle class="dashboard-donut__ring" cx="60" cy="60" :r="RADIUS" />

        <template v-if="total > 0">
          <circle
            v-for="arc in arcs"
            :key="arc.key"
            class="dashboard-donut__arc"
            :class="{ 'dashboard-donut__arc--dim': hovered !== null && hovered !== arc.key }"
            cx="60"
            cy="60"
            :r="RADIUS"
            :stroke="arc.color"
            :stroke-dasharray="`${arc.length} ${CIRCUMFERENCE - arc.length}`"
            :stroke-dashoffset="-arc.offset"
            @mouseenter="hovered = arc.key"
            @mouseleave="hovered = null"
          >
            <title>{{ arc.label }}: {{ format(arc.value) }}</title>
          </circle>
        </template>
      </svg>

      <div class="dashboard-donut__center">
        <span class="dashboard-donut__total" :style="{ fontSize: centerFontSize }">{{ centerValue }}</span>
        <span class="dashboard-donut__caption">{{ centerCaption }}</span>
      </div>
    </div>

    <ul class="dashboard-donut__legend">
      <li
        v-for="segment in segments"
        :key="segment.key"
        class="dashboard-donut__item"
        :class="{ 'dashboard-donut__item--dim': hovered !== null && hovered !== segment.key }"
        @mouseenter="hovered = segment.key"
        @mouseleave="hovered = null"
      >
        <span class="dashboard-donut__dot" :style="{ background: segment.color }" />
        <span class="dashboard-donut__label">{{ segment.label }}</span>
        <span class="dashboard-donut__value">{{ format(segment.value) }}</span>
        <span class="dashboard-donut__percent">{{ percentOf(segment.value) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

interface DonutSegment {
  key: string
  label: string
  value: number
  /** Any CSS color. */
  color: string
}

const props = withDefaults(
  defineProps<{
    segments: DonutSegment[]
    /** Text under the total in the middle of the ring. */
    centerLabel?: string
    /** How amounts are written (counts by default; pass a currency formatter for money). */
    format?: (value: number) => string
  }>(),
  {
    centerLabel: "citas",
    format: (value: number) => String(value),
  }
)

const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
// A small gap between neighbouring arcs, drawn only when there are two or more.
const GAP = 2.4

const hovered = ref<string | null>(null)

const total = computed(() => props.segments.reduce((sum, segment) => sum + segment.value, 0))

const centerValue = computed(() => props.format(total.value))

// Long amounts ("S/ 8,420.00") need a smaller number than a count to fit inside the ring.
const centerFontSize = computed(() => {
  const length = centerValue.value.length
  return length > 8 ? "1.125rem" : length > 5 ? "1.5rem" : "2rem"
})
const centerCaption = computed(() => (total.value === 1 ? props.centerLabel.replace(/s$/, "") : props.centerLabel))

const arcs = computed(() => {
  const visible = props.segments.filter((segment) => segment.value > 0)
  const gap = visible.length > 1 ? GAP : 0
  let offset = 0

  return visible.map((segment) => {
    const share = (segment.value / total.value) * CIRCUMFERENCE
    const arc = { ...segment, length: Math.max(share - gap, 0.5), offset }
    offset += share
    return arc
  })
})

const percentOf = (value: number) => (total.value > 0 ? `${Math.round((value / total.value) * 100)}%` : "0%")
</script>

<style scoped>
.dashboard-donut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.dashboard-donut__chart {
  position: relative;
  width: 176px;
  height: 176px;
  flex-shrink: 0;
}

.dashboard-donut__svg {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.dashboard-donut__ring,
.dashboard-donut__arc {
  fill: none;
  stroke-width: 11;
}

.dashboard-donut__ring {
  stroke: rgba(var(--v-theme-on-surface), 0.07);
}

.dashboard-donut__arc {
  stroke-linecap: butt;
  cursor: default;
  transition: opacity 0.2s ease;
}

.dashboard-donut__arc--dim {
  opacity: 0.28;
}

.dashboard-donut__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.dashboard-donut__total {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.dashboard-donut__caption {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.dashboard-donut__legend {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard-donut__item {
  display: grid;
  grid-template-columns: 10px 1fr auto 3rem;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem;
  border-radius: 10px;
  font-size: 0.875rem;
  transition: background-color 0.15s ease, opacity 0.2s ease;
}

.dashboard-donut__item:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.dashboard-donut__item--dim {
  opacity: 0.45;
}

.dashboard-donut__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dashboard-donut__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.dashboard-donut__value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.dashboard-donut__percent {
  text-align: right;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
</style>
