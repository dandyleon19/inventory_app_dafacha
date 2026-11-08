<template>
  <div class="dashboard">
    <!-- Welcome card: who you are and today's date on the left; the main actions on the right. -->
    <v-card class="dashboard-welcome" rounded="xl" elevation="0">
      <v-card-text class="dashboard-welcome__body">
        <div class="dashboard-welcome__identity">
          <v-avatar size="64" color="primary" class="dashboard-welcome__avatar">
            <span class="text-h6 font-weight-bold text-on-primary">{{ userInitials }}</span>
          </v-avatar>

          <div class="dashboard-welcome__text">
            <p class="dashboard-welcome__eyebrow">{{ roleLabel }}</p>
            <h1 class="dashboard-welcome__title">{{ greeting }}, {{ firstName }}</h1>
            <p v-if="companyName" class="dashboard-welcome__salon">
              <v-icon :icon="APP_ICONS.building" size="16" />
              {{ companyName }}
            </p>
            <p class="dashboard-welcome__date">{{ dateLabel }}</p>
          </div>
        </div>

        <div class="dashboard-welcome__tools">
          <v-btn
            v-if="authStore.canOperateStock"
            to="/app/inventory"
            color="primary"
            :prepend-icon="APP_ICONS.movements"
            class="dashboard-welcome__action"
          >
            Registrar movimiento
          </v-btn>
          <v-btn
            v-else
            to="/app/inventory"
            color="primary"
            :prepend-icon="APP_ICONS.stock"
            class="dashboard-welcome__action"
          >
            Ver inventario
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- KPIs -->
    <section class="dashboard-kpis" aria-label="Indicadores principales">
      <DashboardStatCard
        v-for="kpi in kpis"
        :key="kpi.key"
        :label="kpi.label"
        :value="kpi.value"
        :icon="kpi.icon"
        :color="kpi.color"
        :caption="kpi.caption"
        :to="kpi.to"
        :loading="loading"
      />
    </section>

    <div class="dashboard-split dashboard-split--main">
      <DashboardPanel
        title="Salidas de stock"
        subtitle="Valor de lo que salió de los almacenes, últimos 30 días"
        to="/app/stock-movements"
        action-label="Ver movimientos"
      >
        <div class="dashboard-sales-summary">
          <div class="dashboard-sales-summary__item">
            <span class="dashboard-sales-summary__label">Total del periodo</span>
            <span class="dashboard-sales-summary__value">{{ formatMoney(outflowTotal) }}</span>
          </div>
          <div class="dashboard-sales-summary__item">
            <span class="dashboard-sales-summary__label">Mejor día</span>
            <span class="dashboard-sales-summary__value">{{ bestDay ? formatDateDisplay(bestDay.date) : "—" }}</span>
            <span v-if="bestDay" class="dashboard-sales-summary__hint">{{ formatMoney(bestDay.value) }}</span>
          </div>
          <div class="dashboard-sales-summary__item">
            <span class="dashboard-sales-summary__label">Promedio diario</span>
            <span class="dashboard-sales-summary__value">{{ formatMoney(outflowTotal / 30) }}</span>
          </div>
        </div>

        <DashboardTrendChart :points="outflowPoints" />
      </DashboardPanel>
      <DashboardPanel
        title="Valor por almacén"
        subtitle="Cuánto stock hay valorizado en cada almacén"
        to="/app/inventory"
        action-label="Ver inventario"
      >
        <DashboardEmpty
          v-if="!warehouseSegments.length"
          title="Aún no hay stock"
          hint="Registra un ingreso o recibe una orden de compra para ver el valor aquí."
          :icon="APP_ICONS.warehouse"
        />
        <DashboardDonut
          v-else
          :segments="warehouseSegments"
          center-label="valor total"
          :format="formatMoney"
        />
      </DashboardPanel>
    </div>

    <div class="dashboard-split dashboard-split--halves">
      <DashboardPanel
        title="Stock bajo"
        subtitle="Productos en o bajo su stock mínimo"
        to="/app/inventory?lowStock=1"
        action-label="Ver todos"
      >
        <DashboardEmpty
          v-if="!lowStockItems.length"
          title="Todo en orden"
          hint="Ningún producto está en su stock mínimo."
          :icon="APP_ICONS.lowStock"
        />
        <DashboardRankList v-else :items="lowStockItems" />
      </DashboardPanel>
      <DashboardPanel
        title="Próximos vencimientos"
        :subtitle="expirySubtitle"
        to="/app/expirations"
        action-label="Ver vencimientos"
        flush
      >
        <DashboardEmpty
          v-if="!summary?.expiringLots.length"
          title="Sin lotes por vencer"
          :hint="`Ningún lote vence en los próximos ${summary?.expiryAlertDays ?? 30} días.`"
          :icon="APP_ICONS.expiry"
        />
        <ul v-else class="dashboard-rows">
          <li v-for="lot in summary.expiringLots" :key="lot.id">
            <NuxtLink to="/app/expirations" class="dashboard-row">
              <span class="dashboard-row__text">
                <span class="dashboard-row__title">
                  {{ lot.productSku ? `${lot.productSku} — ${lot.productName}` : lot.productName }}
                </span>
                <span class="dashboard-row__sub">{{ lotSubtitle(lot) }}</span>
              </span>
              <v-chip size="small" variant="tonal" :color="expiryColor(lot.daysToExpiry, summary.expiryAlertDays)">
                {{ describeDaysToExpiry(lot.daysToExpiry) }}
              </v-chip>
            </NuxtLink>
          </li>
        </ul>
      </DashboardPanel>
    </div>

    <div class="dashboard-split dashboard-split--halves">
      <DashboardPanel
        title="Órdenes de compra por llegar"
        :subtitle="`Se esperan en los próximos ${summary?.purchaseArrivalAlertDays ?? 7} días`"
        to="/app/purchase-orders"
        action-label="Ver órdenes"
        flush
      >
        <DashboardEmpty
          v-if="!summary?.arrivingOrders.length"
          title="Sin órdenes en camino"
          hint="Cuando pidas mercadería, aparecerá aquí con su fecha de entrega."
          :icon="APP_ICONS.purchaseOrder"
        />
        <ul v-else class="dashboard-rows">
          <li v-for="order in summary.arrivingOrders" :key="order.id">
            <NuxtLink :to="`/app/purchase-orders/${order.id}`" class="dashboard-row">
              <span class="dashboard-row__text">
                <span class="dashboard-row__title">{{ order.number }} · {{ order.supplierName }}</span>
                <span class="dashboard-row__sub">
                  Entrega {{ formatDateOnly(order.expectedDate) }} · {{ order.warehouseName }}
                </span>
              </span>
              <v-chip size="small" variant="tonal" :color="arrivalChip(order.expectedDate).color">
                {{ arrivalChip(order.expectedDate).label }}
              </v-chip>
            </NuxtLink>
          </li>
        </ul>
      </DashboardPanel>
      <DashboardPanel
        title="Últimos movimientos"
        subtitle="Lo que entró, salió o se ajustó hace poco"
        to="/app/stock-movements"
        action-label="Ver movimientos"
        flush
      >
        <DashboardEmpty
          v-if="!summary?.recentMovements.length"
          title="Aún no hay movimientos"
          hint="Los ingresos, salidas, ajustes y transferencias aparecerán aquí."
          :icon="APP_ICONS.movements"
        />
        <ul v-else class="dashboard-rows">
          <li v-for="movement in summary.recentMovements" :key="movement.id">
            <NuxtLink to="/app/stock-movements" class="dashboard-row">
              <span class="dashboard-row__text">
                <span class="dashboard-row__title">
                  {{ movement.productSku ? `${movement.productSku} — ${movement.productName}` : movement.productName }}
                </span>
                <span class="dashboard-row__sub">
                  {{ getMovementTypeLabel(movement.type) }} · {{ movement.warehouseName }} ·
                  {{ formatDateTime(movement.createdAt) }}
                </span>
              </span>
              <span class="dashboard-row__amount" :class="movement.quantity < 0 ? 'text-error' : 'text-success'">
                {{ movement.quantity > 0 ? "+" : "" }}{{ formatQuantity(movement.quantity) }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </DashboardPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StockLot } from "~/interfaces/stockInterfaces"
import type { UnitOfMeasure } from "~/interfaces/productInterfaces"
import { describeDaysToExpiry, expiryColor, getMovementTypeLabel } from "~/interfaces/stockInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { USER_ROLE_LABELS, type UserRole } from "~/interfaces/userInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore, useDashboardStore } from "~/store"
import {
  daysFromToday,
  formatDateDisplay,
  formatDateOnly,
  formatDateTime,
  formatMoney,
  formatQuantity,
} from "~/helpers/formatHelpers"

const authStore = useAuthStore()
const dashboardStore = useDashboardStore()

const summary = computed(() => dashboardStore.summary)
const loading = computed(() => dashboardStore.loading && !summary.value)

// ---------------------------------------------------------------- welcome card
const firstName = computed(() => authStore.user?.firstName?.trim() || "bienvenido")
const companyName = computed(() => authStore.user?.companyName ?? "")
const roleLabel = computed(() => USER_ROLE_LABELS[(authStore.role ?? "VIEWER") as UserRole] ?? "")

const userInitials = computed(() => {
  const user = authStore.user
  const letters = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase()
  return letters || "DF"
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
})

const dateLabel = computed(() => {
  const text = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  return text.charAt(0).toUpperCase() + text.slice(1)
})

// ---------------------------------------------------------------- helpers
const unitOf = (unit: UnitOfMeasure) => getUnitShortLabel(unit)

const lotSubtitle = (lot: StockLot) =>
  [
    lot.lotNumber ? `Lote ${lot.lotNumber}` : "",
    `vence ${formatDateOnly(lot.expiryDate)}`,
    `${formatQuantity(lot.quantity)} ${unitOf(lot.unit)}`,
    lot.warehouseName ?? "",
  ]
    .filter(Boolean)
    .join(" · ")

/** How an open order's expected date reads: overdue, today, or in N days. */
const arrivalChip = (expectedDate?: string | null) => {
  const days = daysFromToday(expectedDate)
  if (days === null) return { label: "Sin fecha", color: "default" }
  if (days < 0) return { label: `Atrasada ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`, color: "error" }
  if (days === 0) return { label: "Llega hoy", color: "warning" }
  return { label: `En ${days} día${days === 1 ? "" : "s"}`, color: "info" }
}

const expirySubtitle = computed(() => {
  const s = summary.value
  if (!s) return ""
  return `${s.expiredLotCount} vencido${s.expiredLotCount === 1 ? "" : "s"} · ${s.expiringLotCount} por vencer`
})

// ---------------------------------------------------------------- KPIs
const kpis = computed(() => {
  const s = summary.value
  const expiryTotal = s ? s.expiredLotCount + s.expiringLotCount : 0
  const expiryColorName = !s ? "primary" : s.expiredLotCount > 0 ? "error" : s.expiringLotCount > 0 ? "warning" : "success"

  return [
    {
      key: "value",
      label: "Valor del inventario",
      value: s ? formatMoney(s.totalValue) : "—",
      caption: s ? `${s.warehouseCount} almacén${s.warehouseCount === 1 ? "" : "es"} activo${s.warehouseCount === 1 ? "" : "s"}` : "",
      icon: APP_ICONS.stock,
      color: "primary",
      to: "/app/inventory",
    },
    {
      key: "products",
      label: "Productos activos",
      value: s ? String(s.activeProductCount) : "—",
      caption: "en el catálogo",
      icon: APP_ICONS.package,
      color: "info",
      to: "/app/products",
    },
    {
      key: "low-stock",
      label: "Stock bajo",
      value: s ? String(s.lowStockCount) : "—",
      caption: "en o bajo su mínimo",
      icon: APP_ICONS.lowStock,
      color: s && s.lowStockCount > 0 ? "warning" : "success",
      to: "/app/inventory?lowStock=1",
    },
    {
      key: "expiry",
      label: "Vencimientos",
      value: s ? String(expiryTotal) : "—",
      caption: s ? `${s.expiredLotCount} vencido${s.expiredLotCount === 1 ? "" : "s"}` : "",
      icon: APP_ICONS.expiry,
      color: expiryColorName,
      to: "/app/expirations",
    },
    {
      key: "arrivals",
      label: "Órdenes por llegar",
      value: s ? String(s.arrivingOrderCount) : "—",
      caption: s ? `${s.overdueOrderCount} atrasada${s.overdueOrderCount === 1 ? "" : "s"}` : "",
      icon: APP_ICONS.receive,
      color: s && s.overdueOrderCount > 0 ? "error" : s && s.arrivingOrderCount > 0 ? "info" : "success",
      to: "/app/purchase-orders",
    },
  ]
})

// ---------------------------------------------------------------- panels

/** One point per day of the last 30 days (days without exits count as 0), oldest first. */
const outflowPoints = computed(() => {
  const byDay = new Map((summary.value?.outflowByDay ?? []).map((item) => [item.date, item]))
  const points: Array<{ date: string; revenue: number; count: number }> = []
  for (let offset = 29; offset >= 0; offset--) {
    const day = new Date()
    day.setDate(day.getDate() - offset)
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
    const item = byDay.get(iso)
    points.push({ date: iso, revenue: Number(item?.value ?? 0), count: Number(item?.movements ?? 0) })
  }
  return points
})

const outflowTotal = computed(() => outflowPoints.value.reduce((sum, point) => sum + point.revenue, 0))

const bestDay = computed(() => {
  const best = [...outflowPoints.value].sort((a, b) => b.revenue - a.revenue)[0]
  return best && best.revenue > 0 ? { date: best.date, value: best.revenue } : null
})
const SEGMENT_COLORS = ["#00A19B", "#8A9099", "#1F78C1", "#F2B100", "#1B8556", "#D32F2F"]

const warehouseSegments = computed(() =>
  (summary.value?.warehouses ?? [])
    .filter((warehouse) => Number(warehouse.value) > 0)
    .map((warehouse, index) => ({
      key: String(warehouse.warehouseId),
      label: warehouse.warehouseName,
      value: Number(warehouse.value),
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
    }))
)

/** The fuller the bar, the closer the product is to running out. */
const lowStockItems = computed(() =>
  (summary.value?.lowStock ?? []).map((row) => {
    const missing = Math.max(Number(row.minStock) - Number(row.quantity), 0)
    return {
      key: row.productId,
      label: row.sku ? `${row.sku} — ${row.productName}` : row.productName,
      value: Math.max(missing, 0.001),
      valueLabel: Number(row.quantity) <= 0 ? "Sin stock" : `${formatQuantity(row.quantity)} ${unitOf(row.unit)}`,
      caption: `Mínimo ${formatQuantity(row.minStock)} ${unitOf(row.unit)}`,
    }
  })
)

onMounted(() => {
  // Always fresh here: this is the screen people open to see how things stand.
  dashboardStore.fetchSummary(true)
})
</script>

<style scoped>
.dashboard-sales-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}

.dashboard-sales-summary__item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.125rem;
}

.dashboard-sales-summary__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.70);
}

.dashboard-sales-summary__value {
  font-family: var(--font-heading);
  font-size: 1.375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dashboard-sales-summary__hint {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.dashboard-rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard-rows li + li {
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
}

.dashboard-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.dashboard-row:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}

.dashboard-row__text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.125rem;
}

.dashboard-row__title {
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-row__sub {
  overflow: hidden;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-row__amount {
  flex-shrink: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
