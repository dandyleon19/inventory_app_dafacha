<template>
  <AppTable
    title="Proveedores"
    subtitle="A quién le compras mercadería"
    :headers="headers"
    :row-options="rowOptions"
    :items="items"
    :chip-columns="chipColumns"
    :loading="suppliersStore.loading"
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
    :title="formAction === 'create' ? 'Nuevo proveedor' : 'Editar proveedor'"
    :loading="saving"
    size="large"
    location="end"
    :temporary="true"
    @close="closeDrawer"
  >
    <SupplierForm
      :action="formAction"
      :supplier="selectedSupplier"
      @submit="handleSubmit"
    />
  </AppDrawer>

  <ConfirmationModal
    v-model="showDeleteDialog"
    title="Eliminar proveedor"
    message="¿Deseas eliminar este proveedor? Si ya tiene órdenes de compra no se podrá eliminar; en ese caso desactívalo."
    :require-text="false"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import type { TableChipColumn, TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"
import type { Supplier, SupplierRequest } from "~/interfaces/supplierInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useSuppliersStore } from "~/store"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"

definePageMeta({
  layout: "app",
  middleware: "role",
  allowedRoles: ["ADMIN_USER", "SUPER_ADMIN", "PURCHASING_USER"],
})

useHead({ title: "Proveedores" })

const suppliersStore = useSuppliersStore()
const { notifyCreated, notifyUpdated, notifyDeleted, notifyError } = useApiNotification()

const saving = ref(false)
const openDrawer = ref(false)
const formAction = ref<"create" | "update">("create")
const selectedSupplier = ref<Supplier | null>(null)
const showDeleteDialog = ref(false)
const supplierToRemove = ref<Supplier | null>(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeSearch = ref("")

const headers: TableHeader[] = [
  { title: "#", key: "id" },
  { title: "Proveedor", key: "name" },
  { title: "RUC", key: "rucNumber" },
  { title: "Contacto", key: "contactName" },
  { title: "Teléfono", key: "phone" },
  { title: "Correo", key: "email" },
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
  (suppliersStore.data?.content ?? []).map((supplier) => ({
    ...supplier,
    statusLabel: supplier.isActive ? "Activo" : "Inactivo",
  }))
)
const totalItems = computed(() => suppliersStore.data?.totalElements ?? 0)

const fetchSuppliers = () =>
  suppliersStore.fetchSuppliers(currentPage.value - 1, itemsPerPage.value, activeSearch.value)

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchSuppliers()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchSuppliers()
}

const handleCreateButton = () => {
  formAction.value = "create"
  selectedSupplier.value = null
  openDrawer.value = true
}

const handleRowActionButton = (supplier: Supplier, action: string) => {
  if (action === "update") {
    formAction.value = "update"
    selectedSupplier.value = supplier
    openDrawer.value = true
  } else if (action === "delete") {
    supplierToRemove.value = supplier
    showDeleteDialog.value = true
  }
}

const closeDrawer = () => {
  openDrawer.value = false
}

const handleSubmit = async (payload: SupplierRequest) => {
  saving.value = true
  try {
    if (formAction.value === "create") {
      await suppliersStore.createSupplier(payload)
      notifyCreated("proveedor")
    } else {
      await suppliersStore.updateSupplier(selectedSupplier.value!.id!, payload)
      notifyUpdated("proveedor")
    }
    closeDrawer()
    await fetchSuppliers()
    suppliersStore.fetchOptions()
  } catch (err) {
    notifyError(err, formAction.value === "create" ? "crear el proveedor" : "actualizar el proveedor")
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!supplierToRemove.value?.id) return

  try {
    await suppliersStore.deleteSupplier(supplierToRemove.value.id)
    notifyDeleted("proveedor")

    // Deleting the last row of a page leaves it empty: step back one page.
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1
    }
    await fetchSuppliers()
    suppliersStore.fetchOptions()
  } catch (err) {
    notifyError(err, "eliminar el proveedor")
  }
}

onMounted(async () => {
  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!suppliersStore.data && !suppliersStore.loading) {
    fetchSuppliers()
  }
})
</script>
