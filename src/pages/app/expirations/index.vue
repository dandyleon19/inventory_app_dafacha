<template>
  <AppTable
    title="Vencimientos"
    subtitle="Lotes de productos con control de fecha de vencimiento"
    :headers="headers"
    :row-options="[]"
    :filters="tableFilters"
    :initial-filters="{ scope: activeFilters.scope }"
    :items="items"
    :chip-columns="chipColumns"
    :loading="stockStore.lotsLoading"
    :page="currentPage"
    :items-per-page="itemsPerPage"
    :total-items="totalItems"
    :show-create-button="false"
    :show-export-button="false"
    :show-search="false"
    @update:pagination="handlePagination"
    @handle-update-filters="handleUpdateFilters"
  />
</template>

<script setup lang="ts">
import type { FilterOption, TableChipColumn, TableHeader } from "~/interfaces/tableInterfaces"
import type { LotScope } from "~/interfaces/stockInterfaces"
import { LOT_SCOPE_OPTIONS, describeDaysToExpiry, expiryColor } from "~/interfaces/stockInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { useDashboardStore, useStockStore, useWarehousesStore } from "~/store"
import { formatDateOnly, formatQuantity } from "~/helpers/formatHelpers"

definePageMeta({ layout: "app" })

useHead({ title: "Vencimientos" })

const route = useRoute()
const stockStore = useStockStore()
const warehousesStore = useWarehousesStore()
const dashboardStore = useDashboardStore()

const currentPage = ref(1)
const itemsPerPage = ref(10)

// The dashboard links here with ?scope=EXPIRED|EXPIRING|ATTENTION; by default everything that needs attention.
const initialScope = (): LotScope => {
  const raw = Array.isArray(route.query.scope) ? route.query.scope[0] : route.query.scope
  return LOT_SCOPE_OPTIONS.some((option) => option.value === raw) ? (raw as LotScope) : "ATTENTION"
}

const activeFilters = reactive<{ warehouseId?: number; scope: LotScope }>({ scope: initialScope() })

/** The company's alert window, to colour "expiring soon". Falls back to 30 until the dashboard has loaded. */
const alertDays = computed(() => dashboardStore.summary?.expiryAlertDays ?? 30)

const headers: TableHeader[] = [
  { title: "Producto", key: "productLabel" },
  { title: "Almacén", key: "warehouseName" },
  { title: "Lote", key: "lotLabel" },
  { title: "Vence", key: "expiryLabel" },
  { title: "Estado", key: "statusLabel" },
  { title: "Cantidad", key: "quantityLabel" },
]

const chipColumns: TableChipColumn[] = [
  { key: "statusLabel", color: (item) => expiryColor(item.daysToExpiry as number, alertDays.value) },
]

// The scope is a filter like the others; it starts on ATTENTION (or the one in the URL) and the user can switch it.
const tableFilters = computed<FilterOption[]>(() => [
  {
    type: "select",
    label: "Mostrar",
    key: "scope",
    items: LOT_SCOPE_OPTIONS,
  },
  {
    type: "select",
    label: "Almacén",
    key: "warehouseId",
    items: warehousesStore.options.map((warehouse) => ({ title: warehouse.name, value: warehouse.id })),
  },
])

const items = computed(() =>
  (stockStore.lots?.content ?? []).map((lot) => ({
    ...lot,
    productLabel: lot.productSku ? `${lot.productSku} — ${lot.productName}` : lot.productName ?? "—",
    lotLabel: lot.lotNumber || "—",
    expiryLabel: formatDateOnly(lot.expiryDate),
    statusLabel: describeDaysToExpiry(lot.daysToExpiry),
    quantityLabel: `${formatQuantity(lot.quantity)} ${getUnitShortLabel(lot.unit)}`,
  }))
)

const totalItems = computed(() => stockStore.lots?.totalElements ?? 0)

const fetchLots = () =>
  stockStore.fetchLots({
    page: currentPage.value - 1,
    size: itemsPerPage.value,
    warehouseId: activeFilters.warehouseId,
    scope: activeFilters.scope,
  })

const handleUpdateFilters = (values: Record<string, any>) => {
  // A cleared "Mostrar" goes back to the default view rather than to "no filter".
  activeFilters.scope = (values.scope as LotScope | null) ?? "ATTENTION"
  activeFilters.warehouseId = values.warehouseId ?? undefined
  currentPage.value = 1
  fetchLots()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchLots()
}

onMounted(async () => {
  warehousesStore.fetchOptions()
  if (!dashboardStore.summary) dashboardStore.fetchSummary()

  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!stockStore.lots && !stockStore.lotsLoading) {
    fetchLots()
  }
})
</script>
