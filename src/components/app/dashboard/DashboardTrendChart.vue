<template>
  <div class="sales-chart">
    <DashboardEmpty
      v-if="!hasData"
      icon="tabler:chart-line"
      :title="hasSales ? 'La gráfica aparece desde el segundo día con salidas' : 'Aún no hay salidas para graficar'"
      :hint="
        hasSales
          ? 'Ya hay salidas registradas: necesitamos al menos dos días para dibujar la evolución.'
          : 'Cuando registres salidas de stock verás aquí su evolución día a día.'
      "
    />

    <div v-else class="sales-chart__layout">
      <div class="sales-chart__axis" aria-hidden="true">
        <span v-for="tick in yTicks" :key="tick.value" class="sales-chart__axis-label" :style="{ bottom: `${tick.percent}%` }">
          {{ tick.label }}
        </span>
      </div>

      <div class="sales-chart__main">
        <div class="sales-chart__plot" @mouseleave="activeIndex = null">
          <svg class="sales-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="sales-chart__stop sales-chart__stop--top" />
                <stop offset="1" class="sales-chart__stop sales-chart__stop--bottom" />
              </linearGradient>
            </defs>

            <line
              v-for="tick in yTicks"
              :key="tick.value"
              class="sales-chart__grid"
              x1="0"
              x2="100"
              :y1="100 - tick.percent"
              :y2="100 - tick.percent"
              vector-effect="non-scaling-stroke"
            />

            <path :d="areaPath" :fill="`url(#${gradientId})`" />
            <path :d="linePath" class="sales-chart__line" vector-effect="non-scaling-stroke" />
          </svg>

          <!-- One invisible column per day: hovering it shows the guide, the dot and the amount. -->
          <div class="sales-chart__columns">
            <div
              v-for="(point, index) in plotted"
              :key="point.date"
              class="sales-chart__column"
              @mouseenter="activeIndex = index"
            />
          </div>

          <template v-if="activePoint">
            <div class="sales-chart__guide" :style="{ left: `${activePoint.x}%` }" />
            <div class="sales-chart__dot" :style="{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }" />
            <div
              class="sales-chart__tooltip"
              :class="{
                'sales-chart__tooltip--left': activePoint.x > 78,
                'sales-chart__tooltip--right': activePoint.x < 22,
              }"
              :style="{ left: `${activePoint.x}%`, top: `${Math.max(activePoint.y, 14)}%` }"
            >
              <span class="sales-chart__tooltip-date">{{ formatDateDisplay(activePoint.date) }}</span>
              <span class="sales-chart__tooltip-value">{{ formatMoney(activePoint.revenue) }}</span>
              <span v-if="activePoint.count !== undefined" class="sales-chart__tooltip-date">
                {{ activePoint.count }} salida{{ activePoint.count === 1 ? "" : "s" }}
              </span>
            </div>
          </template>
        </div>

        <div class="sales-chart__x" aria-hidden="true">
          <span
            v-for="label in xLabels"
            :key="label.date"
            class="sales-chart__x-label"
            :style="{ left: `${label.x}%` }"
          >
            {{ label.text }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { formatDateDisplay, formatMoney } from "~/helpers/formatHelpers"

interface DailyPoint {
  date: string
  revenue: number
  /** Number of exits that day; shown in the tooltip when given. */
  count?: number
}

const props = defineProps<{
  /** One entry per day of the month so far (days without sales have revenue 0). */
  points: DailyPoint[]
}>()

const gradientId = `sales-chart-${Math.random().toString(36).slice(2, 9)}`
const activeIndex = ref<number | null>(null)

const moneyShort = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
})

// Round the top of the scale up to 1, 2, 5 or 10 times a power of ten, so the grid lines read as round amounts.
const niceCeil = (value: number) => {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const fraction = value / power
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return step * power
}

const hasSales = computed(() => props.points.some((point) => point.revenue > 0))
const hasData = computed(() => props.points.length > 1 && hasSales.value)

const yMax = computed(() => niceCeil(Math.max(...props.points.map((point) => point.revenue), 1) * 1.05))

const yTicks = computed(() =>
  [0, 1, 2, 3, 4].map((step) => {
    const value = (yMax.value / 4) * step
    return { value, percent: (step / 4) * 100, label: moneyShort.format(value) }
  })
)

// x and y are percentages of the plot area (y counts from the top).
const plotted = computed(() => {
  const count = props.points.length
  return props.points.map((point, index) => ({
    ...point,
    x: count > 1 ? (index / (count - 1)) * 100 : 50,
    y: 100 - (point.revenue / yMax.value) * 100,
  }))
})

const linePath = computed(() =>
  plotted.value.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
)

const areaPath = computed(() => {
  const list = plotted.value
  if (!list.length) return ""
  return `${linePath.value} L ${list[list.length - 1].x} 100 L ${list[0].x} 100 Z`
})

const activePoint = computed(() => (activeIndex.value === null ? null : plotted.value[activeIndex.value] ?? null))

// About eight day numbers along the bottom; the last one (today) is always shown.
const xLabels = computed(() => {
  const list = plotted.value
  const every = Math.max(1, Math.ceil(list.length / 8))
  return list
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % every === 0 || index === list.length - 1)
    .filter(({ index }) => index === list.length - 1 || list.length - 1 - index >= every / 2)
    .map(({ point }) => ({
      date: point.date,
      x: point.x,
      text: String(Number(point.date.slice(8, 10))),
    }))
})
</script>

<style scoped>
.sales-chart__layout {
  display: flex;
  gap: 0.5rem;
}

.sales-chart__axis {
  position: relative;
  flex: 0 0 3.75rem;
  height: 220px;
}

.sales-chart__axis-label {
  position: absolute;
  right: 0;
  transform: translateY(50%);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;
}

.sales-chart__main {
  flex: 1 1 auto;
  min-width: 0;
}

.sales-chart__plot {
  position: relative;
  height: 220px;
}

.sales-chart__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.sales-chart__grid {
  stroke: rgba(var(--v-theme-on-surface), 0.08);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.sales-chart__stop--top {
  stop-color: rgb(var(--v-theme-primary));
  stop-opacity: 0.3;
}

.sales-chart__stop--bottom {
  stop-color: rgb(var(--v-theme-primary));
  stop-opacity: 0;
}

.sales-chart__line {
  fill: none;
  /* A step deeper than the brand orange so the stroke keeps 3:1 against white. */
  stroke: #e86a00;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sales-chart__columns {
  position: absolute;
  inset: 0;
  display: flex;
}

.sales-chart__column {
  flex: 1 1 0;
}

.sales-chart__guide {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed rgba(var(--v-theme-on-surface), 0.28);
  pointer-events: none;
}

.sales-chart__dot {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #e86a00;
  box-shadow: 0 2px 6px rgba(11, 11, 12, 0.25);
  pointer-events: none;
}

.sales-chart__tooltip {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  background: #0e0e10;
  color: #fff;
  box-shadow: 0 8px 20px rgba(11, 11, 12, 0.25);
  transform: translate(-50%, calc(-100% - 14px));
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
}

.sales-chart__tooltip--left {
  transform: translate(calc(-100% + 18px), calc(-100% - 14px));
}

.sales-chart__tooltip--right {
  transform: translate(-18px, calc(-100% - 14px));
}

.sales-chart__tooltip-date {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.78);
}

.sales-chart__tooltip-value {
  font-size: 0.9375rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.sales-chart__x {
  position: relative;
  height: 1.5rem;
  margin-top: 0.5rem;
}

.sales-chart__x-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
</style>
