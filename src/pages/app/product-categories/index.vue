<template>
  <AppTable
    title="Categorías de producto"
    subtitle="Organiza el catálogo en categorías"
    :headers="headers"
    :row-options="rowOptions"
    :items="items"
    :loading="categoriesStore.loading"
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
    :title="formAction === 'create' ? 'Nueva categoría' : 'Editar categoría'"
    :loading="saving"
    size="medium"
    location="end"
    :temporary="true"
    @close="closeDrawer"
  >
    <ProductCategoryForm
      :action="formAction"
      :category="selectedCategory"
      @submit="handleSubmit"
    />
  </AppDrawer>

  <ConfirmationModal
    v-model="showDeleteDialog"
    title="Eliminar categoría"
    message="¿Deseas eliminar esta categoría? Solo se puede eliminar si no tiene productos."
    :require-text="false"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import type { TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"
import type { ProductCategory, ProductCategoryRequest } from "~/interfaces/productCategoryInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useProductCategoriesStore } from "~/store"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"

definePageMeta({
  layout: "app",
  middleware: "role",
  allowedRoles: ["ADMIN_USER", "SUPER_ADMIN"],
})

useHead({ title: "Categorías de producto" })

const categoriesStore = useProductCategoriesStore()
const { notifyCreated, notifyUpdated, notifyDeleted, notifyError } = useApiNotification()

const saving = ref(false)
const openDrawer = ref(false)
const formAction = ref<"create" | "update">("create")
const selectedCategory = ref<ProductCategory | null>(null)
const showDeleteDialog = ref(false)
const categoryToRemove = ref<ProductCategory | null>(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeSearch = ref("")

const headers: TableHeader[] = [
  { title: "#", key: "id" },
  { title: "Nombre", key: "name" },
  { title: "Descripción", key: "description" },
  { title: "Acciones", key: "actions", sortable: false },
]

const rowOptions: TableRowOption[] = [
  { action: "update", color: "primary", icon: APP_ICONS.edit },
  { action: "delete", color: "error", icon: APP_ICONS.delete },
]

const items = computed(() => categoriesStore.data?.content ?? [])
const totalItems = computed(() => categoriesStore.data?.totalElements ?? 0)

const fetchCategories = () =>
  categoriesStore.fetchProductCategories(currentPage.value - 1, itemsPerPage.value, activeSearch.value)

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchCategories()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchCategories()
}

const handleCreateButton = () => {
  formAction.value = "create"
  selectedCategory.value = null
  openDrawer.value = true
}

const handleRowActionButton = (category: ProductCategory, action: string) => {
  if (action === "update") {
    formAction.value = "update"
    selectedCategory.value = category
    openDrawer.value = true
  } else if (action === "delete") {
    categoryToRemove.value = category
    showDeleteDialog.value = true
  }
}

const closeDrawer = () => {
  openDrawer.value = false
}

const handleSubmit = async (payload: ProductCategoryRequest) => {
  saving.value = true
  try {
    if (formAction.value === "create") {
      await categoriesStore.createProductCategory(payload)
      notifyCreated("categoría")
    } else {
      await categoriesStore.updateProductCategory(selectedCategory.value!.id!, payload)
      notifyUpdated("categoría")
    }
    closeDrawer()
    await fetchCategories()
  } catch (err) {
    notifyError(err, formAction.value === "create" ? "crear la categoría" : "actualizar la categoría")
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!categoriesStore.data && !categoriesStore.loading) {
    fetchCategories()
  }
})

const handleDelete = async () => {
  if (!categoryToRemove.value?.id) return

  try {
    await categoriesStore.deleteProductCategory(categoryToRemove.value.id)
    notifyDeleted("categoría")

    // Deleting the last row of a page leaves it empty: step back one page.
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1
    }
    await fetchCategories()
  } catch (err) {
    notifyError(err, "eliminar la categoría")
  }
}
</script>
