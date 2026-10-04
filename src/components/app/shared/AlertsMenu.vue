<template>
  <v-menu location="bottom end" offset="8">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        icon
        variant="text"
        class="alerts-btn"
        aria-label="Alertas"
        @click="dashboardStore.fetchSummary(true)"
      >
        <v-badge
          :model-value="counts.total > 0"
          :content="counts.total > 99 ? '99+' : counts.total"
          color="error"
          floating
        >
          <v-icon :icon="APP_ICONS.bell" />
        </v-badge>
      </v-btn>
    </template>

    <v-list min-width="320" max-width="380" rounded="lg">
      <v-list-subheader>Alertas</v-list-subheader>

      <template v-if="alerts.length">
        <v-list-item
          v-for="alert in alerts"
          :key="alert.key"
          :to="alert.to"
          :title="alert.title"
          :subtitle="alert.subtitle"
        >
          <template #prepend>
            <v-avatar :color="alert.color" variant="tonal" size="36" class="mr-3">
              <v-icon :icon="alert.icon" size="20" />
            </v-avatar>
          </template>
        </v-list-item>
      </template>

      <v-list-item
        v-else
        title="Todo en orden"
        subtitle="No hay alertas por ahora"
        :prepend-icon="APP_ICONS.checkCircle"
      />
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import { useDashboardStore } from "~/store"

const dashboardStore = useDashboardStore()

const counts = computed(() => dashboardStore.alertCounts)

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** One entry per kind of alert that has something to show; each links to where it can be dealt with. */
const alerts = computed(() => {
  const s = dashboardStore.summary
  if (!s) return []

  const list: Array<{ key: string; title: string; subtitle: string; to: string; icon: string; color: string }> = []

  if (s.lowStockCount > 0) {
    list.push({
      key: "low-stock",
      title: plural(s.lowStockCount, "producto con stock bajo", "productos con stock bajo"),
      subtitle: "En o por debajo de su stock mínimo",
      to: "/app/inventory?lowStock=1",
      icon: APP_ICONS.lowStock,
      color: "warning",
    })
  }

  if (s.expiredLotCount > 0) {
    list.push({
      key: "expired",
      title: plural(s.expiredLotCount, "lote vencido", "lotes vencidos"),
      subtitle: "Aún figuran con stock",
      to: "/app/expirations?scope=EXPIRED",
      icon: APP_ICONS.expiry,
      color: "error",
    })
  }

  if (s.expiringLotCount > 0) {
    list.push({
      key: "expiring",
      title: plural(s.expiringLotCount, "lote por vencer", "lotes por vencer"),
      subtitle: `Vencen en los próximos ${s.expiryAlertDays} días`,
      to: "/app/expirations?scope=EXPIRING",
      icon: APP_ICONS.expiry,
      color: "warning",
    })
  }

  if (s.overdueOrderCount > 0) {
    list.push({
      key: "overdue",
      title: plural(s.overdueOrderCount, "orden de compra atrasada", "órdenes de compra atrasadas"),
      subtitle: "Ya pasó su fecha de entrega esperada",
      to: "/app/purchase-orders",
      icon: APP_ICONS.purchaseOrder,
      color: "error",
    })
  }

  const arrivingSoon = s.arrivingOrderCount - s.overdueOrderCount
  if (arrivingSoon > 0) {
    list.push({
      key: "arriving",
      title: plural(arrivingSoon, "orden de compra por llegar", "órdenes de compra por llegar"),
      subtitle: `Se esperan en los próximos ${s.purchaseArrivalAlertDays} días`,
      to: "/app/purchase-orders",
      icon: APP_ICONS.receive,
      color: "info",
    })
  }

  return list
})
</script>

<style scoped>
.alerts-btn.v-btn--variant-text,
.alerts-btn.v-btn--variant-text .v-icon {
  color: #fff !important;
}
</style>
