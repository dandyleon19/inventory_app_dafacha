<template>
  <AppTableWrapper>
    <AppPageTitle
      title="Inventario"
      subtitle="Stock por producto y valorización"
      :total-items="totalItems"
    >
      <template #actions>
        <v-btn
          v-for="action in operationButtons"
          :key="action.kind"
          :color="action.color"
          variant="tonal"
          rounded="lg"
          size="large"
          class="inventory-action"
          :prepend-icon="action.icon"
          @click="openOperation(action.kind)"
        >
          {{ action.label }}
        </v-btn>
      </template>
    </AppPageTitle>

    <v-row dense class="mb-2">
      <v-col cols="12" md="4">
        <v-card rounded="xl" elevation="0" class="inventory-card pa-5 h-100">
          <p class="text-overline text-medium-emphasis mb-1">Valor del inventario</p>
          <p class="text-h4 font-weight-bold app-font-heading mb-1">
            {{ formatMoney(stockStore.valuation?.totalValue) }}
          </p>
          <p class="text-caption text-medium-emphasis mb-0">Lo que realmente costó cada compra, no un promedio</p>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card rounded="xl" elevation="0" class="inventory-card pa-5 h-100">
          <p class="text-overline text-medium-emphasis mb-2">Por almacén</p>
          <div v-if="stockStore.valuation?.warehouses?.length" class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="warehouse in stockStore.valuation.warehouses"
              :key="warehouse.warehouseId"
              color="primary"
              variant="tonal"
              :prepend-icon="APP_ICONS.warehouse"
            >
              {{ warehouse.warehouseName }}: {{ formatMoney(warehouse.value) }}
              · {{ warehouse.productCount }} prod.
            </v-chip>
          </div>
          <p v-else class="text-body-2 text-medium-emphasis mb-0">Aún no hay almacenes con stock.</p>
        </v-card>
      </v-col>
    </v-row>

    <AppTable
      hide-page-title
      title="Inventario"
      :headers="headers"
      :row-options="rowOptions"
      :filters="tableFilters"
      :initial-filters="initialFilters"
      :items="items"
      :chip-columns="chipColumns"
      :loading="stockStore.loading"
      :page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalItems"
      :show-create-button="false"
      :show-export-button="false"
      server-search
      @update:pagination="handlePagination"
      @handle-row-action-button="handleRowActionButton"
      @handle-update-search="handleApplySearch"
      @handle-update-filters="handleUpdateFilters"
    />
  </AppTableWrapper>

  <AppDrawer
    v-model="openDrawerModel"
    :title="operationMode ? STOCK_OPERATION_TITLES[operationMode] : ''"
    :loading="saving"
    size="medium"
    location="end"
    :temporary="true"
    @close="closeOperation"
  >
    <StockOperationForm
      v-if="operationMode"
      :mode="operationMode"
      :warehouses="warehousesStore.activeOptions"
      :product="selectedProduct"
      :warehouse-id="activeFilters.warehouseId ?? null"
      @submit="handleSubmit"
    />
  </AppDrawer>

  <AppDrawer
    v-model="openHistoryModel"
    :title="historyProduct ? `Historial de movimientos — ${historyProduct.sku ? historyProduct.sku + ' — ' : ''}${historyProduct.name}` : ''"
    size="full"
    location="end"
    :temporary="true"
    @close="closeHistory"
  >
    <StockMovementsTable
      v-if="historyProduct"
      :product-id="historyProduct.id"
      hide-product-column
    />
  </AppDrawer>
</template>

<script setup lang="ts">
import type { FilterOption, TableChipColumn, TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"
import type {
  StockOperationKind,
  StockOperationPayload,
  StockProductOption,
  StockSummary,
} from "~/interfaces/stockInterfaces"
import { STOCK_OPERATION_TITLES } from "~/interfaces/stockInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore, useStockStore, useWarehousesStore } from "~/store"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"
import { formatMoney, formatQuantity } from "~/helpers/formatHelpers"

definePageMeta({ layout: "app" })

useHead({ title: "Inventario" })

const authStore = useAuthStore()
const stockStore = useStockStore()
const warehousesStore = useWarehousesStore()
const { success } = useNotification()
const { notifyError } = useApiNotification()

// Adjustments rewrite the stock figure, so only admins get them (the API enforces it too).
const canAdjust = computed(() => authStore.canManage)
// Entries, exits and transfers: admins and the warehouse role. Purchasing and read-only users just look.
const canOperate = computed(() => authStore.canOperateStock)

const saving = ref(false)
const operationMode = ref<StockOperationKind | null>(null)
const selectedProduct = ref<StockProductOption | null>(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeSearch = ref("")
// Links from the dashboard / alerts bell arrive as /app/inventory?lowStock=1, with that filter already on.
const route = useRoute()
const startsOnLowStock = route.query.lowStock === "1"
const activeFilters = reactive<{ warehouseId?: number; lowStockOnly?: boolean; isActive?: boolean }>({
  lowStockOnly: startsOnLowStock ? true : undefined,
})
const initialFilters = startsOnLowStock ? { lowStockOnly: true } : {}

const openDrawerModel = computed({
  get: () => operationMode.value !== null,
  set: (open: boolean) => {
    if (!open) closeOperation()
  },
})

const operationButtons = computed(() => [
  ...(canOperate.value
    ? [
        { kind: "entry" as const, label: "Ingreso", icon: APP_ICONS.entry, color: "success" },
        { kind: "exit" as const, label: "Salida", icon: APP_ICONS.exit, color: "error" },
        { kind: "transfer" as const, label: "Transferir", icon: APP_ICONS.transfer, color: "primary" },
      ]
    : []),
  ...(canAdjust.value
    ? [{ kind: "adjustment" as const, label: "Ajuste", icon: APP_ICONS.adjustment, color: "warning" }]
    : []),
])

const headers: TableHeader[] = [
  { title: "SKU", key: "sku" },
  { title: "Producto", key: "productName" },
  { title: "Stock", key: "quantityLabel" },
  { title: "Mínimo", key: "minStockLabel" },
  { title: "Estado", key: "statusLabel" },
  { title: "Costo prom.", key: "costPriceLabel" },
  { title: "Valor real", key: "valueLabel" },
  { title: "Acciones", key: "actions", sortable: false },
]

const statusColors: Record<string, string> = {
  out: "error",
  low: "warning",
  ok: "success",
}

const chipColumns: TableChipColumn[] = [
  { key: "statusLabel", color: (item) => statusColors[item.statusKey] ?? "default" },
]

const rowOptions = computed<TableRowOption[]>(() => [
  ...(canOperate.value
    ? [
        { action: "entry", title: "Registrar ingreso", color: "success", icon: APP_ICONS.entry },
        { action: "exit", title: "Registrar salida", color: "error", icon: APP_ICONS.exit },
        { action: "transfer", title: "Transferir", color: "primary", icon: APP_ICONS.transfer },
      ]
    : []),
  ...(canAdjust.value
    ? [{ action: "adjustment", title: "Ajuste por conteo", color: "warning", icon: APP_ICONS.adjustment }]
    : []),
  { action: "history", title: "Ver historial de movimientos", color: "primary", icon: APP_ICONS.history },
])

const tableFilters = computed<FilterOption[]>(() => [
  {
    type: "select",
    label: "Almacén",
    key: "warehouseId",
    items: warehousesStore.options.map((warehouse) => ({ title: warehouse.name, value: warehouse.id })),
  },
  {
    type: "select",
    label: "Stock",
    key: "lowStockOnly",
    items: [{ title: "Solo stock bajo", value: true }],
  },
  {
    type: "select",
    label: "Estado",
    key: "isActive",
    items: [
      { title: "Activos", value: true },
      { title: "Inactivos", value: false },
    ],
  },
])

const stockStatus = (row: StockSummary) => {
  if (row.quantity <= 0) return { key: "out", label: "Sin stock" }
  if (row.lowStock) return { key: "low", label: "Stock bajo" }
  return { key: "ok", label: "En stock" }
}

const items = computed(() =>
  (stockStore.data?.content ?? []).map((row) => {
    const unit = getUnitShortLabel(row.unit)
    const status = stockStatus(row)

    return {
      ...row,
      quantityLabel: `${formatQuantity(row.quantity)} ${unit}`,
      minStockLabel: row.minStock > 0 ? `${formatQuantity(row.minStock)} ${unit}` : "—",
      statusKey: status.key,
      statusLabel: status.label,
      costPriceLabel: formatMoney(row.costPrice),
      valueLabel: formatMoney(row.value),
    }
  })
)

const totalItems = computed(() => stockStore.data?.totalElements ?? 0)

const fetchStock = () =>
  stockStore.fetchStock({
    page: currentPage.value - 1,
    size: itemsPerPage.value,
    search: activeSearch.value,
    warehouseId: activeFilters.warehouseId,
    lowStockOnly: activeFilters.lowStockOnly,
    isActive: activeFilters.isActive,
  })

const refreshAll = async () => {
  await Promise.all([fetchStock(), stockStore.fetchValuation()])
}

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchStock()
}

const handleUpdateFilters = (values: Record<string, any>) => {
  // A cleared select reports null; the API expects the param to be absent.
  activeFilters.warehouseId = values.warehouseId ?? undefined
  activeFilters.lowStockOnly = values.lowStockOnly ?? undefined
  activeFilters.isActive = values.isActive ?? undefined
  currentPage.value = 1
  fetchStock()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchStock()
}

const openOperation = (kind: StockOperationKind, product: StockProductOption | null = null) => {
  warehousesStore.fetchOptions() // pick up warehouses created or deactivated since the page loaded
  selectedProduct.value = product
  operationMode.value = kind
}

const closeOperation = () => {
  operationMode.value = null
  selectedProduct.value = null
}

// Product-history drawer (the table inside it is the same one used by the Movimientos page).
const historyProduct = ref<StockProductOption | null>(null)

const openHistoryModel = computed({
  get: () => historyProduct.value !== null,
  set: (open: boolean) => {
    if (!open) closeHistory()
  },
})

const closeHistory = () => {
  historyProduct.value = null
}

const handleRowActionButton = (row: StockSummary, action: string) => {
  if (action === "history") {
    historyProduct.value = { id: row.productId, name: row.productName, sku: row.sku, unit: row.unit }
    return
  }

  openOperation(action as StockOperationKind, {
    id: row.productId,
    name: row.productName,
    sku: row.sku,
    unit: row.unit,
    tracksExpiry: row.tracksExpiry,
  })
}

const successMessages: Record<StockOperationKind, [string, string]> = {
  entry: ["El ingreso se registró correctamente.", "Ingreso registrado"],
  exit: ["La salida se registró correctamente.", "Salida registrada"],
  adjustment: ["El stock se ajustó al conteo indicado.", "Ajuste aplicado"],
  transfer: ["La transferencia se realizó correctamente.", "Transferencia realizada"],
}

const handleSubmit = async (payload: StockOperationPayload) => {
  saving.value = true
  try {
    await stockStore.register(payload)
    const [message, title] = successMessages[payload.kind]
    success(message, title)
    closeOperation()
    await refreshAll()
  } catch (err) {
    notifyError(err, "registrar el movimiento")
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  warehousesStore.fetchOptions()
  stockStore.fetchValuation()

  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!stockStore.data && !stockStore.loading) {
    fetchStock()
  }
})
</script>

<style scoped>
.inventory-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.inventory-action {
  text-transform: none;
  letter-spacing: normal;
}
</style>
