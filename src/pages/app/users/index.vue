<template>
  <AppTable
    title="Usuarios"
    subtitle="Quién puede entrar y qué puede hacer"
    :headers="headers"
    :row-options="rowOptions"
    :get-row-options="getRowOptions"
    :filters="tableFilters"
    :items="items"
    :chip-columns="chipColumns"
    :loading="usersStore.loading"
    :page="currentPage"
    :items-per-page="itemsPerPage"
    :total-items="totalItems"
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
    :title="formAction === 'create' ? 'Nuevo usuario' : 'Editar usuario'"
    :loading="saving"
    size="large"
    location="end"
    :temporary="true"
    @close="closeDrawer"
  >
    <UserForm
      :action="formAction"
      :user="selectedUser"
      :warehouses="warehousesStore.activeOptions"
      @submit="handleSubmit"
    />
  </AppDrawer>

  <UserPasswordDialog
    v-model="showPasswordDialog"
    :user-name="selectedUser?.fullName ?? ''"
    :loading="resettingPassword"
    @submit="handleResetPassword"
  />
</template>

<script setup lang="ts">
import type { FilterOption, TableChipColumn, TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"
import type { User, UserRequest, UserRole } from "~/interfaces/userInterfaces"
import { USER_ROLE_COLORS, USER_ROLE_OPTIONS, getUserRoleLabel } from "~/interfaces/userInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore, useUsersStore, useWarehousesStore } from "~/store"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"
import { formatDateOnly } from "~/helpers/formatHelpers"

definePageMeta({
  layout: "app",
  middleware: "role",
  allowedRoles: ["ADMIN_USER", "SUPER_ADMIN"],
})

useHead({ title: "Usuarios" })

const authStore = useAuthStore()
const usersStore = useUsersStore()
const warehousesStore = useWarehousesStore()
const { success } = useNotification()
const { notifyCreated, notifyUpdated, notifyError } = useApiNotification()

const saving = ref(false)
const openDrawer = ref(false)
const formAction = ref<"create" | "update">("create")
const selectedUser = ref<User | null>(null)
const showPasswordDialog = ref(false)
const resettingPassword = ref(false)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeSearch = ref("")
const activeFilters = reactive<{ role?: UserRole; isActive?: boolean }>({})

const headers: TableHeader[] = [
  { title: "Usuario", key: "fullName" },
  { title: "Correo", key: "email" },
  { title: "Rol", key: "roleLabel" },
  { title: "Almacenes", key: "warehousesLabel" },
  { title: "Estado", key: "statusLabel" },
  { title: "Desde", key: "createdLabel" },
  { title: "Acciones", key: "actions", sortable: false },
]

const chipColumns: TableChipColumn[] = [
  { key: "roleLabel", color: (item) => USER_ROLE_COLORS[item.role as UserRole] ?? "default" },
  { key: "statusLabel", color: (item) => (item.isActive ? "success" : "error") },
]

const rowOptions: TableRowOption[] = [
  { action: "update", title: "Editar", color: "primary", icon: APP_ICONS.edit },
  { action: "password", title: "Restablecer contraseña", color: "warning", icon: APP_ICONS.key },
]

// Only the owner account (super admin) can touch its own row; everyone else's rows are open to any admin.
const getRowOptions = (user: Record<string, unknown>): TableRowOption[] =>
  user.role === "SUPER_ADMIN" && !authStore.isSuperAdmin ? [] : rowOptions

const tableFilters = computed<FilterOption[]>(() => [
  { type: "select", label: "Rol", key: "role", items: USER_ROLE_OPTIONS },
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

const warehouseNames = (user: User) => {
  const ids = user.warehouseIds ?? []
  if (user.role === "ADMIN_USER" || user.role === "SUPER_ADMIN" || ids.length === 0) return "Todos"
  return ids
    .map((id) => warehousesStore.options.find((warehouse) => warehouse.id === id)?.name ?? `#${id}`)
    .join(", ")
}

const items = computed(() =>
  (usersStore.data?.content ?? []).map((user) => ({
    ...user,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
    roleLabel: getUserRoleLabel(user.role),
    warehousesLabel: warehouseNames(user),
    statusLabel: user.isActive ? "Activo" : "Inactivo",
    createdLabel: user.createdAt ? formatDateOnly(user.createdAt.slice(0, 10)) : "—",
  }))
)
const totalItems = computed(() => usersStore.data?.totalElements ?? 0)

const fetchUsers = () =>
  usersStore.fetchUsers({
    page: currentPage.value - 1,
    size: itemsPerPage.value,
    search: activeSearch.value,
    role: activeFilters.role,
    isActive: activeFilters.isActive,
  })

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchUsers()
}

const handleUpdateFilters = (values: Record<string, any>) => {
  activeFilters.role = values.role ?? undefined
  activeFilters.isActive = values.isActive ?? undefined
  currentPage.value = 1
  fetchUsers()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchUsers()
}

const handleCreateButton = () => {
  formAction.value = "create"
  selectedUser.value = null
  openDrawer.value = true
}

const handleRowActionButton = (user: User, action: string) => {
  selectedUser.value = user
  if (action === "update") {
    formAction.value = "update"
    openDrawer.value = true
  } else if (action === "password") {
    showPasswordDialog.value = true
  }
}

const closeDrawer = () => {
  openDrawer.value = false
}

const handleSubmit = async (payload: UserRequest) => {
  saving.value = true
  try {
    if (formAction.value === "create") {
      await usersStore.createUser(payload)
      notifyCreated("usuario")
    } else {
      await usersStore.updateUser(selectedUser.value!.id!, payload)
      notifyUpdated("usuario")
    }
    closeDrawer()
    await fetchUsers()
  } catch (err) {
    notifyError(err, formAction.value === "create" ? "crear el usuario" : "actualizar el usuario")
  } finally {
    saving.value = false
  }
}

const handleResetPassword = async (password: string) => {
  if (!selectedUser.value?.id) return

  resettingPassword.value = true
  try {
    await usersStore.resetPassword(selectedUser.value.id, password)
    success("La contraseña se restableció. Sus sesiones abiertas se cerraron.", "Contraseña restablecida")
    showPasswordDialog.value = false
  } catch (err) {
    notifyError(err, "restablecer la contraseña")
  } finally {
    resettingPassword.value = false
  }
}

onMounted(async () => {
  warehousesStore.fetchOptions()

  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!usersStore.data && !usersStore.loading) {
    fetchUsers()
  }
})
</script>
