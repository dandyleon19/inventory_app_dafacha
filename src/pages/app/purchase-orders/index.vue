<template>
  <AppTable
    wide-first-column
    title="Órdenes de compra"
    subtitle="Pedidos a proveedores y recepción de mercadería"
    :headers="headers"
    :row-options="rowOptions"
    :filters="tableFilters"
    :items="items"
    :chip-columns="chipColumns"
    :loading="ordersStore.loading"
    :page="currentPage"
    :items-per-page="itemsPerPage"
    :total-items="totalItems"
    :show-create-button="canManage"
    :show-export-button="false"
    server-search
    @update:pagination="handlePagination"
    @handle-create-button="handleCreateButton"
    @handle-row-action-button="handleRowActionButton"
    @handle-update-search="handleApplySearch"
    @handle-update-filters="handleUpdateFilters"
  />
</template>

<script setup lang="ts">
import type { FilterOption, TableChipColumn, TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"
import type { PurchaseOrder, PurchaseOrderStatus } from "~/interfaces/purchaseOrderInterfaces"
import {
  PURCHASE_ORDER_STATUS_COLORS,
  PURCHASE_ORDER_STATUS_OPTIONS,
  getPurchaseOrderStatusLabel,
} from "~/interfaces/purchaseOrderInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore, usePurchaseOrdersStore, useSuppliersStore } from "~/store"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"
import { formatDateTime, formatMoney } from "~/helpers/formatHelpers"

definePageMeta({ layout: "app" })

useHead({ title: "Órdenes de compra" })

const authStore = useAuthStore()
const ordersStore = usePurchaseOrdersStore()
const suppliersStore = useSuppliersStore()

// Anyone can open an order (and receive goods); only admins create them.
const canManage = computed(() => authStore.canManagePurchases)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeSearch = ref("")
const activeFilters = reactive<{ status?: PurchaseOrderStatus; supplierId?: number }>({})

const headers: TableHeader[] = [
  { title: "Orden", key: "number" },
  { title: "Proveedor", key: "supplierName" },
  { title: "Almacén destino", key: "warehouseName" },
  { title: "Estado", key: "statusLabel" },
  { title: "Líneas", key: "lineCount" },
  { title: "Total", key: "totalLabel" },
  { title: "Entrega esperada", key: "expectedDateLabel" },
  { title: "Creada", key: "createdAtLabel" },
  { title: "Acciones", key: "actions", sortable: false },
]

const chipColumns: TableChipColumn[] = [
  {
    key: "statusLabel",
    color: (item) => PURCHASE_ORDER_STATUS_COLORS[item.status as PurchaseOrderStatus] ?? "default",
  },
]

const rowOptions: TableRowOption[] = [
  { action: "view", title: "Ver orden", color: "primary", icon: APP_ICONS.view },
]

const tableFilters = computed<FilterOption[]>(() => [
  {
    type: "select",
    label: "Estado",
    key: "status",
    items: PURCHASE_ORDER_STATUS_OPTIONS,
  },
  {
    type: "searchable-select",
    label: "Proveedor",
    key: "supplierId",
    items: suppliersStore.options.map((supplier) => ({ title: supplier.name, value: supplier.id })),
  },
])

/** "2026-10-02" -> "02/10/2026" without going through Date (which would shift the day by timezone). */
const formatDateOnly = (value?: string | null) => {
  if (!value) return "—"
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}

const items = computed(() =>
  (ordersStore.data?.content ?? []).map((order) => ({
    ...order,
    statusLabel: getPurchaseOrderStatusLabel(order.status),
    totalLabel: formatMoney(order.total),
    expectedDateLabel: formatDateOnly(order.expectedDate),
    createdAtLabel: formatDateTime(order.createdAt),
  }))
)

const totalItems = computed(() => ordersStore.data?.totalElements ?? 0)

const fetchOrders = () =>
  ordersStore.fetchOrders({
    page: currentPage.value - 1,
    size: itemsPerPage.value,
    search: activeSearch.value,
    status: activeFilters.status,
    supplierId: activeFilters.supplierId,
  })

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchOrders()
}

const handleUpdateFilters = (values: Record<string, any>) => {
  activeFilters.status = values.status ?? undefined
  activeFilters.supplierId = values.supplierId ?? undefined
  currentPage.value = 1
  fetchOrders()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchOrders()
}

const handleCreateButton = () => {
  navigateTo("/app/purchase-orders/new")
}

const handleRowActionButton = (order: PurchaseOrder, action: string) => {
  if (action === "view") {
    navigateTo(`/app/purchase-orders/${order.id}`)
  }
}

onMounted(async () => {
  suppliersStore.fetchOptions()

  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!ordersStore.data && !ordersStore.loading) {
    fetchOrders()
  }
})
</script>
