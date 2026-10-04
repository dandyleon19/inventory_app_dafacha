<template>
  <AppTable
    title="Almacenes"
    subtitle="Ubicaciones donde se guarda el stock"
    :headers="headers"
    :row-options="rowOptions"
    :items="items"
    :chip-columns="chipColumns"
    :loading="warehousesStore.loading"
    :page="currentPage"
    :items-per-page="itemsPerPage"
    :total-items="totalItems"
    :show-export-button="false"
    server-search
    @update:pagination="handlePagination"
    @handle-create-button="handleCreateButton"
    @handle-row-action-button="handleRowActionButton"
    @handle-update-search="handleApplySearch"
  />

  <AppDrawer
    v-model="openDrawer"
    :title="formAction === 'create' ? 'Nuevo almacén' : 'Editar almacén'"
    :loading="saving"
    size="medium"
    location="end"
    :temporary="true"
    @close="closeDrawer"
  >
    <WarehouseForm
      :action="formAction"
      :warehouse="selectedWarehouse"
      @submit="handleSubmit"
    />
  </AppDrawer>

  <ConfirmationModal
    v-model="showDeleteDialog"
    title="Eliminar almacén"
    message="¿Deseas eliminar este almacén? Si ya tiene movimientos de stock no se podrá eliminar; en ese caso desactívalo."
    :require-text="false"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import type { TableChipColumn, TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"
import type { Warehouse, WarehouseRequest } from "~/interfaces/warehouseInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useWarehousesStore } from "~/store"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"

definePageMeta({
  layout: "app",
  middleware: "role",
  allowedRoles: ["ADMIN_USER", "SUPER_ADMIN"],
})

useHead({ title: "Almacenes" })

const warehousesStore = useWarehousesStore()
const { notifyCreated, notifyUpdated, notifyDeleted, notifyError } = useApiNotification()

const saving = ref(false)
const openDrawer = ref(false)
const formAction = ref<"create" | "update">("create")
const selectedWarehouse = ref<Warehouse | null>(null)
const showDeleteDialog = ref(false)
const warehouseToRemove = ref<Warehouse | null>(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeSearch = ref("")

const headers: TableHeader[] = [
  { title: "#", key: "id" },
  { title: "Nombre", key: "name" },
  { title: "Dirección", key: "address" },
  { title: "Estado", key: "statusLabel" },
  { title: "Acciones", key: "actions", sortable: false },
]

const chipColumns: TableChipColumn[] = [
  { key: "statusLabel", color: (item) => (item.isActive ? "success" : "error") },
]

const rowOptions: TableRowOption[] = [
  { action: "update", color: "primary", icon: APP_ICONS.edit },
  { action: "delete", color: "error", icon: APP_ICONS.delete },
]

const items = computed(() =>
  (warehousesStore.data?.content ?? []).map((warehouse) => ({
    ...warehouse,
    statusLabel: warehouse.isActive ? "Activo" : "Inactivo",
  }))
)
const totalItems = computed(() => warehousesStore.data?.totalElements ?? 0)

const fetchWarehouses = () =>
  warehousesStore.fetchWarehouses(currentPage.value - 1, itemsPerPage.value, activeSearch.value)

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchWarehouses()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchWarehouses()
}

const handleCreateButton = () => {
  formAction.value = "create"
  selectedWarehouse.value = null
  openDrawer.value = true
}

const handleRowActionButton = (warehouse: Warehouse, action: string) => {
  if (action === "update") {
    formAction.value = "update"
    selectedWarehouse.value = warehouse
    openDrawer.value = true
  } else if (action === "delete") {
    warehouseToRemove.value = warehouse
    showDeleteDialog.value = true
  }
}

const closeDrawer = () => {
  openDrawer.value = false
}

const handleSubmit = async (payload: WarehouseRequest) => {
  saving.value = true
  try {
    if (formAction.value === "create") {
      await warehousesStore.createWarehouse(payload)
      notifyCreated("almacén")
    } else {
      await warehousesStore.updateWarehouse(selectedWarehouse.value!.id!, payload)
      notifyUpdated("almacén")
    }
    closeDrawer()
    await fetchWarehouses()
    warehousesStore.fetchOptions()
  } catch (err) {
    notifyError(err, formAction.value === "create" ? "crear el almacén" : "actualizar el almacén")
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!warehouseToRemove.value?.id) return

  try {
    await warehousesStore.deleteWarehouse(warehouseToRemove.value.id)
    notifyDeleted("almacén")

    // Deleting the last row of a page leaves it empty: step back one page.
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1
    }
    await fetchWarehouses()
    warehousesStore.fetchOptions()
  } catch (err) {
    notifyError(err, "eliminar el almacén")
  }
}

onMounted(async () => {
  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!warehousesStore.data && !warehousesStore.loading) {
    fetchWarehouses()
  }
})
</script>
