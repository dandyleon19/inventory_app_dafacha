<template>
  <AppTable
    wide-first-column
    title="Auditoría"
    subtitle="Quién hizo qué, y cuándo"
    :headers="headers"
    :row-options="[]"
    :filters="tableFilters"
    :items="items"
    :chip-columns="chipColumns"
    :loading="auditStore.loading"
    :page="currentPage"
    :items-per-page="itemsPerPage"
    :total-items="totalItems"
    :show-create-button="false"
    :show-export-button="false"
    empty-title="Sin registros"
    empty-text="Aún no hay actividad que coincida con los filtros."
    server-search
    @update:pagination="handlePagination"
    @handle-update-search="handleApplySearch"
    @handle-update-filters="handleUpdateFilters"
  >
    <template #item.details="{ item }">
      <div v-if="item.details" class="audit-details">{{ item.details }}</div>
      <span v-else class="text-medium-emphasis">—</span>
    </template>
  </AppTable>
</template>

<script setup lang="ts">
import type { FilterOption, TableChipColumn, TableHeader } from "~/interfaces/tableInterfaces"
import type { AuditAction, AuditEntity } from "~/interfaces/auditInterfaces"
import {
  AUDIT_ACTION_COLORS,
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_OPTIONS,
  getAuditActionLabel,
  getAuditEntityLabel,
} from "~/interfaces/auditInterfaces"
import { useAuditStore, useUsersStore } from "~/store"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"
import { formatDateTime } from "~/helpers/formatHelpers"

definePageMeta({
  layout: "app",
  middleware: "role",
  allowedRoles: ["ADMIN_USER", "SUPER_ADMIN"],
})

useHead({ title: "Auditoría" })

const auditStore = useAuditStore()
const usersStore = useUsersStore()

const currentPage = ref(1)
const itemsPerPage = ref(20)
const activeSearch = ref("")
const activeFilters = reactive<{
  entityType?: AuditEntity
  action?: AuditAction
  userId?: number
  from?: string
  to?: string
}>({})

// "Detalle" is last on purpose: the last column isn't width-capped, so the change lines have room.
const headers: TableHeader[] = [
  { title: "Fecha", key: "createdAtLabel" },
  { title: "Usuario", key: "userName" },
  { title: "Acción", key: "actionLabel" },
  { title: "Sobre", key: "entityLabelText" },
  { title: "Elemento", key: "entityName" },
  { title: "Detalle", key: "details" },
]

const chipColumns: TableChipColumn[] = [
  { key: "actionLabel", color: (item) => AUDIT_ACTION_COLORS[item.action as AuditAction] ?? "default" },
]

const tableFilters = computed<FilterOption[]>(() => [
  { type: "select", label: "Sobre", key: "entityType", items: AUDIT_ENTITY_OPTIONS },
  { type: "select", label: "Acción", key: "action", items: AUDIT_ACTION_OPTIONS },
  {
    type: "searchable-select",
    label: "Usuario",
    key: "userId",
    items: usersStore.options.map((user) => ({
      title: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
      value: user.id,
    })),
  },
  { type: "date", label: "Desde", key: "from", items: [] },
  { type: "date", label: "Hasta", key: "to", items: [] },
])

const items = computed(() =>
  (auditStore.data?.content ?? []).map((entry) => ({
    ...entry,
    createdAtLabel: formatDateTime(entry.createdAt),
    userName: entry.userName || "—",
    actionLabel: getAuditActionLabel(entry.action),
    entityLabelText: getAuditEntityLabel(entry.entityType),
    entityName: entry.entityLabel || "—",
  }))
)
const totalItems = computed(() => auditStore.data?.totalElements ?? 0)

const fetchLogs = () =>
  auditStore.fetchLogs({
    page: currentPage.value - 1,
    size: itemsPerPage.value,
    search: activeSearch.value,
    entityType: activeFilters.entityType,
    action: activeFilters.action,
    userId: activeFilters.userId,
    from: activeFilters.from,
    to: activeFilters.to,
  })

const handleApplySearch = (value: string) => {
  const next = normalizeTableSearch(value)
  if (areTableSearchEqual(activeSearch.value, next)) return

  activeSearch.value = next
  currentPage.value = 1
  fetchLogs()
}

const handleUpdateFilters = (values: Record<string, any>) => {
  activeFilters.entityType = values.entityType ?? undefined
  activeFilters.action = values.action ?? undefined
  activeFilters.userId = values.userId ?? undefined
  activeFilters.from = values.from || undefined
  activeFilters.to = values.to || undefined
  currentPage.value = 1
  fetchLogs()
}

const handlePagination = async ({ page, itemsPerPage: size }: { page: number; itemsPerPage: number }) => {
  currentPage.value = page
  itemsPerPage.value = size
  await fetchLogs()
}

onMounted(async () => {
  usersStore.fetchOptions()

  // The table normally triggers the first load through its pagination event; this is only a fallback.
  await nextTick()
  if (!auditStore.data && !auditStore.loading) {
    fetchLogs()
  }
})
</script>

<style scoped>
/* Each change on its own line ("Campo: antes → después"); wraps inside a readable width. */
.audit-details {
  max-width: 520px;
  padding: 0.25rem 0;
  white-space: pre-line;
  line-height: 1.45;
}
</style>
