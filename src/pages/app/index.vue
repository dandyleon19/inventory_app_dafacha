<template>
  <AppTableWrapper>
    <AppPageTitle title="Dashboard" :subtitle="authStore.user?.companyName ?? ''" />

    <v-progress-linear v-if="dashboardStore.loading && !summary" indeterminate color="primary" class="mb-4" />

    <template v-if="summary">
      <!-- Headline numbers; each one opens the screen where it can be dealt with -->
      <v-row dense class="mb-2">
        <v-col v-for="kpi in kpis" :key="kpi.key" cols="12" sm="6" md="4" lg>
          <v-card :to="kpi.to" class="kpi-card" rounded="xl" elevation="0">
            <div class="kpi-card__icon" :class="`kpi-card__icon--${kpi.color}`">
              <v-icon :icon="kpi.icon" size="24" />
            </div>
            <div class="kpi-card__body">
              <p class="text-caption text-medium-emphasis mb-0">{{ kpi.label }}</p>
              <p class="text-h5 font-weight-bold app-font-heading mb-0">{{ kpi.value }}</p>
              <p class="text-caption text-medium-emphasis mb-0">{{ kpi.hint }}</p>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Alerts -->
      <v-row dense class="mb-2">
        <v-col cols="12" md="6">
          <DashboardCard
            title="Stock bajo"
            :icon="APP_ICONS.lowStock"
            color="warning"
            :count="summary.lowStockCount"
            to="/app/inventory?lowStock=1"
            :empty="!summary.lowStock.length"
            empty-text="Ningún producto está en su stock mínimo"
          >
            <v-list-item
              v-for="row in summary.lowStock"
              :key="row.productId"
              :title="row.sku ? `${row.sku} — ${row.productName}` : row.productName"
              :subtitle="`Stock ${formatQuantity(row.quantity)} ${unitOf(row.unit)} · mínimo ${formatQuantity(row.minStock)}`"
              to="/app/inventory?lowStock=1"
            >
              <template #append>
                <v-chip size="small" variant="tonal" :color="row.quantity <= 0 ? 'error' : 'warning'">
                  {{ row.quantity <= 0 ? "Sin stock" : "Bajo" }}
                </v-chip>
              </template>
            </v-list-item>
          </DashboardCard>
        </v-col>

        <v-col cols="12" md="6">
          <DashboardCard
            title="Próximos vencimientos"
            :icon="APP_ICONS.expiry"
            color="error"
            :count="summary.expiredLotCount + summary.expiringLotCount"
            to="/app/expirations"
            :empty="!summary.expiringLots.length"
            :empty-text="`Ningún lote vence en los próximos ${summary.expiryAlertDays} días`"
          >
            <v-list-item
              v-for="lot in summary.expiringLots"
              :key="lot.id"
              :title="lot.productSku ? `${lot.productSku} — ${lot.productName}` : lot.productName ?? ''"
              :subtitle="lotSubtitle(lot)"
              to="/app/expirations"
            >
              <template #append>
                <v-chip size="small" variant="tonal" :color="expiryColor(lot.daysToExpiry, summary.expiryAlertDays)">
                  {{ describeDaysToExpiry(lot.daysToExpiry) }}
                </v-chip>
              </template>
            </v-list-item>
          </DashboardCard>
        </v-col>

        <v-col cols="12" md="6">
          <DashboardCard
            title="Órdenes de compra por llegar"
            :icon="APP_ICONS.purchaseOrder"
            color="info"
            :count="summary.arrivingOrderCount"
            to="/app/purchase-orders"
            :empty="!summary.arrivingOrders.length"
            :empty-text="`Ninguna orden se espera en los próximos ${summary.purchaseArrivalAlertDays} días`"
          >
            <v-list-item
              v-for="order in summary.arrivingOrders"
              :key="order.id"
              :title="`${order.number} · ${order.supplierName ?? ''}`"
              :subtitle="`Entrega ${formatDateOnly(order.expectedDate)} · ${order.warehouseName ?? ''}`"
              :to="`/app/purchase-orders/${order.id}`"
            >
              <template #append>
                <v-chip size="small" variant="tonal" :color="arrivalChip(order.expectedDate).color">
                  {{ arrivalChip(order.expectedDate).label }}
                </v-chip>
              </template>
            </v-list-item>
          </DashboardCard>
        </v-col>

        <v-col cols="12" md="6">
          <DashboardCard
            title="Últimos movimientos"
            :icon="APP_ICONS.movements"
            color="primary"
            to="/app/stock-movements"
            :empty="!summary.recentMovements.length"
            empty-text="Aún no hay movimientos de stock"
          >
            <v-list-item
              v-for="movement in summary.recentMovements"
              :key="movement.id"
              :title="movement.productSku ? `${movement.productSku} — ${movement.productName}` : movement.productName ?? ''"
              :subtitle="`${getMovementTypeLabel(movement.type)} · ${movement.warehouseName ?? ''} · ${formatDateTime(movement.createdAt)}`"
              to="/app/stock-movements"
            >
              <template #append>
                <span :class="movement.quantity < 0 ? 'text-error' : 'text-success'" class="font-weight-medium">
                  {{ movement.quantity > 0 ? "+" : "" }}{{ formatQuantity(movement.quantity) }}
                </span>
              </template>
            </v-list-item>
          </DashboardCard>
        </v-col>
      </v-row>

      <!-- Value by warehouse -->
      <v-card class="kpi-warehouses" rounded="xl" elevation="0">
        <p class="text-overline text-medium-emphasis mb-2">Valor del inventario por almacén</p>
        <div v-if="summary.warehouses.length" class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="warehouse in summary.warehouses"
            :key="warehouse.warehouseId"
            color="primary"
            variant="tonal"
            :prepend-icon="APP_ICONS.warehouse"
          >
            {{ warehouse.warehouseName }}: {{ formatMoney(warehouse.value) }} · {{ warehouse.productCount }} prod.
          </v-chip>
        </div>
        <p v-else class="text-body-2 text-medium-emphasis mb-0">Aún no hay almacenes con stock.</p>
      </v-card>
    </template>
  </AppTableWrapper>
</template>

<script setup lang="ts">
import type { StockLot } from "~/interfaces/stockInterfaces"
import type { UnitOfMeasure } from "~/interfaces/productInterfaces"
import { describeDaysToExpiry, expiryColor, getMovementTypeLabel } from "~/interfaces/stockInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore, useDashboardStore } from "~/store"
import {
  daysFromToday,
  formatDateOnly,
  formatDateTime,
  formatMoney,
  formatQuantity,
} from "~/helpers/formatHelpers"

definePageMeta({ layout: "app" })
useHead({ title: "Dashboard" })

const authStore = useAuthStore()
const dashboardStore = useDashboardStore()

const summary = computed(() => dashboardStore.summary)

const unitOf = (unit: UnitOfMeasure) => getUnitShortLabel(unit)

const lotSubtitle = (lot: StockLot) => {
  const parts = [
    lot.lotNumber ? `Lote ${lot.lotNumber}` : "",
    `vence ${formatDateOnly(lot.expiryDate)}`,
    `${formatQuantity(lot.quantity)} ${unitOf(lot.unit)}`,
    lot.warehouseName ?? "",
  ]
  return parts.filter(Boolean).join(" · ")
}

/** How an open order's expected date reads: overdue, today, or in N days. */
const arrivalChip = (expectedDate?: string | null) => {
  const days = daysFromToday(expectedDate)
  if (days === null) return { label: "Sin fecha", color: "default" }
  if (days < 0) return { label: `Atrasada ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`, color: "error" }
  if (days === 0) return { label: "Llega hoy", color: "warning" }
  return { label: `En ${days} día${days === 1 ? "" : "s"}`, color: "info" }
}

const kpis = computed(() => {
  const s = summary.value
  if (!s) return []

  const expiryTotal = s.expiredLotCount + s.expiringLotCount
  const expiryColorName = s.expiredLotCount > 0 ? "error" : s.expiringLotCount > 0 ? "warning" : "success"

  return [
    {
      key: "value",
      label: "Valor del inventario",
      value: formatMoney(s.totalValue),
      hint: `${s.warehouseCount} almacén${s.warehouseCount === 1 ? "" : "es"} activo${s.warehouseCount === 1 ? "" : "s"}`,
      icon: APP_ICONS.stock,
      color: "primary",
      to: "/app/inventory",
    },
    {
      key: "products",
      label: "Productos activos",
      value: String(s.activeProductCount),
      hint: "en el catálogo",
      icon: APP_ICONS.package,
      color: "primary",
      to: "/app/products",
    },
    {
      key: "low-stock",
      label: "Stock bajo",
      value: String(s.lowStockCount),
      hint: "en o bajo su stock mínimo",
      icon: APP_ICONS.lowStock,
      color: s.lowStockCount > 0 ? "warning" : "success",
      to: "/app/inventory?lowStock=1",
    },
    {
      key: "expiry",
      label: "Vencimientos",
      value: String(expiryTotal),
      hint: `${s.expiredLotCount} vencido${s.expiredLotCount === 1 ? "" : "s"} · ${s.expiringLotCount} por vencer`,
      icon: APP_ICONS.expiry,
      color: expiryColorName,
      to: "/app/expirations",
    },
    {
      key: "arrivals",
      label: "Órdenes por llegar",
      value: String(s.arrivingOrderCount),
      hint: `${s.overdueOrderCount} atrasada${s.overdueOrderCount === 1 ? "" : "s"}`,
      icon: APP_ICONS.receive,
      color: s.overdueOrderCount > 0 ? "error" : s.arrivingOrderCount > 0 ? "info" : "success",
      to: "/app/purchase-orders",
    },
  ]
})

onMounted(() => {
  // Always fresh here: this is the screen people open to see how things stand.
  dashboardStore.fetchSummary(true)
})
</script>

<style scoped>
.kpi-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  height: 100%;
  padding: 1rem 1.125rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.kpi-card__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
}

.kpi-card__icon--primary {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.kpi-card__icon--success {
  background: rgba(var(--v-theme-success), 0.16);
  color: rgb(var(--v-theme-success));
}

.kpi-card__icon--warning {
  background: rgba(var(--v-theme-warning), 0.16);
  color: rgb(var(--v-theme-warning));
}

.kpi-card__icon--error {
  background: rgba(var(--v-theme-error), 0.14);
  color: rgb(var(--v-theme-error));
}

.kpi-card__icon--info {
  background: rgba(var(--v-theme-info), 0.18);
  color: rgb(var(--v-theme-info));
}

.kpi-card__body {
  min-width: 0;
}

.kpi-warehouses {
  padding: 1.25rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
