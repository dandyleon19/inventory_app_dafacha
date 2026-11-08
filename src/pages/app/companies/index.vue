<template>
  <AppTable
    title="Empresas"
    subtitle="Empresas que usan el sistema y su suscripción"
    :headers="headers"
    :row-options="rowOptions"
    :items="items"
    :chip-columns="chipColumns"
    :loading="companyAdminStore.loading"
    :page="currentPage"
    :items-per-page="itemsPerPage"
    :total-items="totalItems"
    :show-export-button="false"
    server-search
    @update:pagination="handlePagination"
    @handle-create-button="handleCreateButton"
    @handle-row-action-button="handleRowActionButton"
    @handle-update-search="handleApplySearch"
  >
    <template #summary>
      <span class="subscription-summary__label">Estado de suscripción</span>
      <v-chip
        v-for="option in summaryOptions"
        :key="option.key"
        :color="option.color"
        :variant="statusFilter === option.key ? 'flat' : 'tonal'"
        size="small"
        class="subscription-summary__chip"
        @click="statusFilter = statusFilter === option.key ? 'ALL' : option.key"
      >
        {{ option.label }}
        <span class="subscription-summary__count">{{ option.count }}</span>
      </v-chip>
      <v-btn
        v-if="statusFilter !== 'ALL'"
        variant="text"
        size="x-small"
        class="text-none"
        @click="statusFilter = 'ALL'"
      >
        Quitar filtro
      </v-btn>
    </template>
  </AppTable>

  <AppDrawer
    v-model="openDrawer"
    :title="formAction === 'create' ? 'Nueva empresa' : 'Editar empresa'"
    :loading="saving"
    size="large"
    location="end"
    :temporary="true"
    @close="closeDrawer"
  >
    <CompanyForm
      :key="`${formAction}-${selectedCompany?.id ?? 'new'}`"
      :action="formAction"
      :company="selectedCompany"
      @submit="handleSubmit"
    />
  </AppDrawer>

  <AppDrawer
    v-model="openSubscriptionDrawer"
    title="Suscripción de la empresa"
    size="large"
    location="end"
    :temporary="true"
    @close="closeSubscriptionDrawer"
  >
    <CompanySubscriptionManager
      v-if="selectedCompany"
      :company-id="Number(selectedCompany.id)"
      :company-name="selectedCompany.name"
    />
  </AppDrawer>

  <ConfirmationModal
    v-model="showDeleteDialog"
    title="Eliminar empresa"
    :message="`Se borrarán la empresa «${companyToRemove?.name ?? ''}» y TODOS sus datos: usuarios, productos, almacenes, stock y órdenes. No se puede deshacer. Si solo quieres bloquear su acceso, suspéndela desde Suscripción.`"
    :require-text="true"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import type { TableChipColumn, TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"
import type { Company, CompanyRequest } from "~/interfaces/companyInterfaces"
import {
  SUBSCRIPTION_STATUS_COLORS,
  subscriptionStatusText,
  type SubscriptionInfo,
  type SubscriptionStatus,
} from "~/interfaces/subscriptionInterfaces"
import type { CompanyAdminRequest } from "~/store/modules/companyAdmin"
import { formatDateDisplay } from "~/helpers/formatHelpers"
import { describeLastSession } from "~/helpers/lastSessionHelpers"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"
import { APP_ICONS } from "~/constants/appIcons"
import { useCompanyAdminStore } from "~/store/modules/companyAdmin"
import { useSubscriptionStore } from "~/store/modules/subscription"
import { useAuthStore } from "~/store/modules/auth"

definePageMeta({
  layout: "app",
  middleware: "role",
  allowedRoles: ["SUPER_ADMIN"],
})

useHead({ title: "Empresas" })

const companyAdminStore = useCompanyAdminStore()
const subscriptionStore = useSubscriptionStore()
const authStore = useAuthStore()
const { notifyCreated, notifyUpdated, notifyDeleted, notifyError } = useApiNotification()

const saving = ref(false)
const openDrawer = ref(false)
const openSubscriptionDrawer = ref(false)
const formAction = ref<"create" | "update">("create")
const selectedCompany = ref<Company | null>(null)
const showDeleteDialog = ref(false)
const companyToRemove = ref<Company | null>(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeSearch = ref("")

const headers: TableHeader[] = [
  { title: "#", key: "id" },
  { title: "Empresa", key: "name" },
  { title: "RUC", key: "rucNumber" },
  { title: "Teléfono", key: "phone" },
  { title: "Plan", key: "planName" },
  { title: "Estado", key: "subscriptionStatusLabel" },
  { title: "Vence", key: "subscriptionEnd" },
  { title: "Última sesión", key: "lastSessionLabel" },
  { title: "Último en entrar", key: "lastSessionByLabel" },
  { title: "Acciones", key: "actions", sortable: false },
]

const rowOptions: TableRowOption[] = [
  { action: "update", color: "primary", icon: APP_ICONS.edit },
  { action: "subscription", color: "primary", icon: APP_ICONS.subscription },
  { action: "delete", color: "error", icon: APP_ICONS.delete },
]

const chipColumns: TableChipColumn[] = [
  {
    key: "subscriptionStatusLabel",
    color: (item) => SUBSCRIPTION_STATUS_COLORS[item.subscriptionStatus as SubscriptionStatus] ?? "default",
  },
  { key: "lastSessionLabel", color: (item) => item.lastSessionTone ?? "default" },
]

// Summary chips above the table: how many companies are in each state (all of them, not only this page).
// A chip also filters the rows of the page; click it again to clear the filter.
type StatusFilter = "ALL" | "TRIAL" | "ACTIVE" | "EXPIRING" | "BLOCKED"
const statusFilter = ref<StatusFilter>("ALL")

const EXPIRING_SOON_DAYS = 7

const isExpiringSoon = (item: SubscriptionInfo) =>
  item.status === "PAST_DUE" ||
  (item.status === "ACTIVE" && item.daysRemaining !== null && item.daysRemaining <= EXPIRING_SOON_DAYS)

const matchesFilter = (item: SubscriptionInfo | undefined, filter: StatusFilter): boolean => {
  if (filter === "ALL") return true
  if (!item) return false
  switch (filter) {
    case "TRIAL":
      return item.status === "TRIAL"
    case "ACTIVE":
      return item.status === "ACTIVE"
    case "EXPIRING":
      return isExpiringSoon(item)
    case "BLOCKED":
      return item.blocked
  }
}

const summaryOptions = computed(() => {
  const count = (filter: StatusFilter) => subscriptionStore.all.filter((item) => matchesFilter(item, filter)).length
  return [
    { key: "TRIAL" as const, label: "En prueba", color: "info", count: count("TRIAL") },
    { key: "ACTIVE" as const, label: "Activas", color: "success", count: count("ACTIVE") },
    { key: "EXPIRING" as const, label: "Por vencer", color: "warning", count: count("EXPIRING") },
    { key: "BLOCKED" as const, label: "Bloqueadas", color: "error", count: count("BLOCKED") },
  ]
})

const endLabel = (item?: SubscriptionInfo): string => {
  if (!item) return "—"
  const endDate =
    item.status === "TRIAL"
      ? item.trialEndsAt
      : item.status === "ACTIVE" || item.status === "PAST_DUE"
        ? item.currentPeriodEnd
        : null
  if (endDate) return formatDateDisplay(endDate)
  if (item.status === "ACTIVE") return "Sin vencimiento"
  if (item.status === "TRIAL" && item.trialPending) return "Empieza al primer ingreso"
  return "—"
}

const items = computed(() =>
  (companyAdminStore.data?.content ?? [])
    .map((company) => ({
      company,
      subscription: subscriptionStore.all.find((item) => item.companyId === Number(company.id)),
    }))
    .filter(({ subscription }) => matchesFilter(subscription, statusFilter.value))
    .map(({ company, subscription }) => ({
      ...company,
      lastSessionLabel: describeLastSession(company.lastSessionAt).label,
      lastSessionTone: describeLastSession(company.lastSessionAt).tone,
      lastSessionByLabel: company.lastSessionBy || "—",
      planName: subscription?.planName ?? "—",
      subscriptionStatus: subscription?.status,
      subscriptionStatusLabel: subscription ? subscriptionStatusText(subscription) : "",
      subscriptionEnd: endLabel(subscription),
    }))
)

const totalItems = computed(() => companyAdminStore.data?.totalElements ?? 0)

const fetchCompanies = () =>
  companyAdminStore.fetchCompanies(currentPage.value - 1, itemsPerPage.value, activeSearch.value)

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchCompanies()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchCompanies()
}

const handleCreateButton = () => {
  formAction.value = "create"
  selectedCompany.value = null
  openDrawer.value = true
}

const handleRowActionButton = (company: Company, action: string) => {
  switch (action) {
    case "update":
      formAction.value = "update"
      selectedCompany.value = company
      openDrawer.value = true
      break
    case "subscription":
      selectedCompany.value = company
      openSubscriptionDrawer.value = true
      break
    case "delete":
      if (Number(company.id) === authStore.user?.companyId) {
        notifyError(new Error("own company"), "eliminar la empresa", "No puedes eliminar tu propia empresa.")
        return
      }
      companyToRemove.value = company
      showDeleteDialog.value = true
      break
  }
}

const closeDrawer = () => {
  openDrawer.value = false
}

const closeSubscriptionDrawer = () => {
  openSubscriptionDrawer.value = false
  selectedCompany.value = null
  subscriptionStore.fetchAll()
}

const handleSubmit = async (payload: { company: CompanyRequest; admin: CompanyAdminRequest | null }) => {
  saving.value = true
  try {
    if (formAction.value === "create" && payload.admin) {
      await companyAdminStore.createCompany(payload.company, payload.admin)
      notifyCreated("empresa")
    } else {
      await companyAdminStore.updateCompany(Number(selectedCompany.value!.id), payload.company)
      notifyUpdated("empresa")
    }
    closeDrawer()
    await fetchCompanies()
    subscriptionStore.fetchAll()
  } catch (err) {
    notifyError(err, formAction.value === "create" ? "crear la empresa" : "actualizar la empresa")
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!companyToRemove.value?.id) return

  try {
    await companyAdminStore.deleteCompany(Number(companyToRemove.value.id))
    notifyDeleted("empresa")

    // Deleting the last row of a page leaves it empty: step back one page.
    if (items.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1
    }
    await fetchCompanies()
    subscriptionStore.fetchAll()
  } catch (err) {
    notifyError(err, "eliminar la empresa")
  }
}

onMounted(() => {
  subscriptionStore.fetchAll()
  fetchCompanies()
})
</script>

<style scoped>
.subscription-summary__label {
  margin-right: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.70);
}

.subscription-summary__chip {
  font-weight: 600;
  cursor: pointer;
}

/* The number sits in a small pill next to the label. */
.subscription-summary__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.5rem;
  padding-inline: 0.3rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  background: rgba(var(--v-theme-on-surface), 0.1);
}
</style>
