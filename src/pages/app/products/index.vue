<template>
  <AppTable
    title="Productos"
    subtitle="Catálogo con costo, precio de venta y margen"
    :headers="headers"
    :row-options="rowOptions"
    :filters="tableFilters"
    :items="items"
    :chip-columns="chipColumns"
    :loading="productsStore.loading"
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

  <AppDrawer
    v-model="openDrawer"
    :title="formAction === 'create' ? 'Nuevo producto' : 'Editar producto'"
    :loading="saving"
    size="large"
    location="end"
    :temporary="true"
    @close="closeDrawer"
  >
    <ProductForm
      :action="formAction"
      :product="selectedProduct"
      :categories="categoriesStore.options"
      :settings="companyStore.settings"
      @submit="handleSubmit"
    />
  </AppDrawer>

  <ConfirmationModal
    v-model="showDeleteDialog"
    title="Eliminar producto"
    message="¿Deseas eliminar este producto? Si ya tiene movimientos de stock no se podrá eliminar; en ese caso desactívalo."
    :require-text="false"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import type { FilterOption, TableChipColumn, TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"
import type { Product, ProductRequest } from "~/interfaces/productInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore, useCompanyStore, useProductCategoriesStore, useProductsStore } from "~/store"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"
import { formatMoney, formatPercent } from "~/helpers/formatHelpers"

definePageMeta({ layout: "app" })

useHead({ title: "Productos" })

const authStore = useAuthStore()
const productsStore = useProductsStore()
const categoriesStore = useProductCategoriesStore()
const companyStore = useCompanyStore()
const { notifyCreated, notifyUpdated, notifyDeleted, notifyError } = useApiNotification()

// Staff can browse the catalog; only admins can change it.
const canManage = computed(() => authStore.canManage)

const saving = ref(false)
const openDrawer = ref(false)
const formAction = ref<"create" | "update">("create")
const selectedProduct = ref<Product | null>(null)
const showDeleteDialog = ref(false)
const productToRemove = ref<Product | null>(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeSearch = ref("")
const activeFilters = reactive<{ categoryId?: number; isActive?: boolean }>({})

const headers = computed<TableHeader[]>(() => [
  { title: "#", key: "id" },
  { title: "SKU", key: "sku" },
  { title: "Producto", key: "name" },
  { title: "Categoría", key: "categoryName" },
  { title: "Unidad", key: "unitLabel" },
  { title: "Costo", key: "costPriceLabel" },
  { title: "Precio venta", key: "salePriceLabel" },
  { title: "Margen", key: "marginLabel" },
  { title: "Estado", key: "statusLabel" },
  ...(canManage.value ? [{ title: "Acciones", key: "actions", sortable: false }] : []),
])

const rowOptions = computed<TableRowOption[]>(() =>
  canManage.value
    ? [
        { action: "update", color: "primary", icon: APP_ICONS.edit },
        { action: "delete", color: "error", icon: APP_ICONS.delete },
      ]
    : []
)

const marginColor = (item: Record<string, any>) => {
  const percent = item.marginPercent as number | null | undefined
  if (percent === null || percent === undefined) return "default"
  if (percent < 0) return "error"
  if (percent < 20) return "warning"
  return "success"
}

const chipColumns: TableChipColumn[] = [
  { key: "marginLabel", color: marginColor },
  { key: "statusLabel", color: (item) => (item.isActive ? "success" : "error") },
]

const tableFilters = computed<FilterOption[]>(() => [
  {
    type: "searchable-select",
    label: "Categoría",
    key: "categoryId",
    items: categoriesStore.options.map((category) => ({ title: category.name, value: category.id })),
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

const items = computed(() =>
  (productsStore.data?.content ?? []).map((product) => ({
    ...product,
    unitLabel: getUnitShortLabel(product.unit),
    costPriceLabel: formatMoney(product.costPrice),
    salePriceLabel: formatMoney(product.salePrice),
    marginLabel: formatPercent(product.marginPercent),
    statusLabel: product.isActive ? "Activo" : "Inactivo",
  }))
)

const totalItems = computed(() => productsStore.data?.totalElements ?? 0)

const fetchProducts = () =>
  productsStore.fetchProducts({
    page: currentPage.value - 1,
    size: itemsPerPage.value,
    search: activeSearch.value,
    categoryId: activeFilters.categoryId,
    isActive: activeFilters.isActive,
  })

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchProducts()
}

const handleUpdateFilters = (values: Record<string, any>) => {
  // A cleared select reports null; the API expects the param to be absent.
  activeFilters.categoryId = values.categoryId ?? undefined
  activeFilters.isActive = values.isActive ?? undefined
  currentPage.value = 1
  fetchProducts()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchProducts()
}

const handleCreateButton = () => {
  companyStore.fetchSettings() // pick up rule changes made since the page loaded
  formAction.value = "create"
  selectedProduct.value = null
  openDrawer.value = true
}

const handleRowActionButton = (product: Product, action: string) => {
  if (action === "update") {
    companyStore.fetchSettings()
    formAction.value = "update"
    selectedProduct.value = product
    openDrawer.value = true
  } else if (action === "delete") {
    productToRemove.value = product
    showDeleteDialog.value = true
  }
}

const closeDrawer = () => {
  openDrawer.value = false
}

const handleSubmit = async (payload: ProductRequest) => {
  saving.value = true
  try {
    if (formAction.value === "create") {
      await productsStore.createProduct(payload)
      notifyCreated("producto")
    } else {
      await productsStore.updateProduct(selectedProduct.value!.id!, payload)
      notifyUpdated("producto")
    }
    closeDrawer()
    await fetchProducts()
  } catch (err) {
    notifyError(err, formAction.value === "create" ? "crear el producto" : "actualizar el producto")
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!productToRemove.value?.id) return

  try {
    await productsStore.deleteProduct(productToRemove.value.id)
    notifyDeleted("producto")

    // Deleting the last row of a page leaves it empty: step back one page.
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1
    }
    await fetchProducts()
  } catch (err) {
    notifyError(err, "eliminar el producto")
  }
}

onMounted(async () => {
  categoriesStore.fetchOptions()
  companyStore.fetchSettings()

  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!productsStore.data && !productsStore.loading) {
    fetchProducts()
  }
})
</script>
