<template>
  <v-autocomplete
    :model-value="modelValue"
    v-bind="autocomplete"
    :label="label"
    :items="items"
    item-title="title"
    item-value="value"
    :loading="loading"
    :disabled="disabled"
    :rules="rules"
    clearable
    no-filter
    no-data-text="Sin coincidencias"
    @update:model-value="onPick"
    @update:search="onSearch"
  >
    <!-- Scrolling to the end of the list asks for the next page. -->
    <template v-if="hasMore" #append-item>
      <InfiniteSentinel :key="items.length" @visible="loadMore" />
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
/**
 * Select for a list that can be long (suppliers, product categories, companies). It never loads them all: it shows the first
 * 20, loads the next 20 each time the user scrolls to the end, and searches on the server as the user types (so any
 * record can be found). `v-model` is the record's id; `select` hands the parent the whole record once it is known,
 * also when the id was set from code.
 */
type Kind = "supplier" | "category" | "company"

interface RemoteRecord {
  id: number | string
  name?: string
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    modelValue: number | string | null
    kind: Kind
    label?: string
    /** Extra filters sent with every request, e.g. `{ isActive: true }`. */
    query?: Record<string, string | number | boolean>
    rules?: Array<(value: any) => true | string>
    /** A disabled select does not list anything: it only shows the record it holds. */
    disabled?: boolean
  }>(),
  { label: "", query: () => ({}), rules: () => [], disabled: false }
)

const emit = defineEmits<{
  (e: "update:modelValue", value: number | string | null): void
  (e: "select", value: RemoteRecord | null): void
}>()

const { autocomplete } = useFormFields()

const ENDPOINTS: Record<Kind, string> = {
  supplier: "/api/suppliers",
  category: "/api/product-categories",
  company: "/api/companies",
}
const PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

const titleOf = (record: RemoteRecord) => record.name ?? ""
const toOption = (record: RemoteRecord) => ({ title: titleOf(record), value: record.id })

// Everything seen so far, so the chosen record keeps its name (and data) across searches.
const known = new Map<string, RemoteRecord>()
const items = ref<Array<{ title: string; value: number | string }>>([])
const loading = ref(false)
const hasMore = ref(false)

let currentTerm = ""
let currentPage = 0
let requestId = 0
let searchTimer: ReturnType<typeof setTimeout> | null = null

const remember = (records: RemoteRecord[]) => records.forEach((record) => known.set(String(record.id), record))

const requestPage = async (page: number, term: string) => {
  const { $api } = useNuxtApp()
  return await $api<{ content?: RemoteRecord[]; totalPages?: number }>(ENDPOINTS[props.kind], {
    method: "GET",
    query: { ...props.query, page, size: PAGE_SIZE, ...(term ? { search: term } : {}) },
  })
}

const selectedRecord = () => (props.modelValue != null ? known.get(String(props.modelValue)) : undefined)

/** First page of a (new) search: replaces the list. */
const load = async (term: string) => {
  if (props.disabled) return

  const id = ++requestId
  currentTerm = term
  currentPage = 0
  loading.value = true
  try {
    const response = await requestPage(0, term)
    if (id !== requestId) return // a newer search took over

    const found = response?.content ?? []
    remember(found)
    hasMore.value = currentPage + 1 < (response?.totalPages ?? 1)

    // Keep the current choice in the list even when it is not in this page of results.
    const selected = selectedRecord()
    const list =
      selected && !found.some((record) => String(record.id) === String(selected.id)) ? [selected, ...found] : found
    items.value = list.map(toOption)
  } catch (err) {
    console.error("Error al buscar:", err)
  } finally {
    if (id === requestId) loading.value = false
  }
}

/** Next 20 of the same search: appended to the list. */
const loadMore = async () => {
  if (props.disabled || loading.value || !hasMore.value) return

  const id = ++requestId
  loading.value = true
  try {
    const response = await requestPage(currentPage + 1, currentTerm)
    if (id !== requestId) return

    currentPage += 1
    const found = response?.content ?? []
    remember(found)
    hasMore.value = currentPage + 1 < (response?.totalPages ?? 1)

    const already = new Set(items.value.map((option) => String(option.value)))
    items.value = [...items.value, ...found.filter((record) => !already.has(String(record.id))).map(toOption)]
  } catch (err) {
    console.error("Error al cargar más:", err)
  } finally {
    if (id === requestId) loading.value = false
  }
}

/** The record behind the current id: from what was already seen, or asked to the server by id. */
const resolveSelected = async (id: number | string | null) => {
  if (id === null || id === undefined || id === "") {
    emit("select", null)
    return
  }

  let record = known.get(String(id))
  if (!record) {
    try {
      const { $api } = useNuxtApp()
      record = await $api<RemoteRecord>(`${ENDPOINTS[props.kind]}/${id}`, { method: "GET" })
      if (record) remember([record])
    } catch (err) {
      console.error("Error al obtener el registro:", err)
    }
  }

  // The answer of an id the user has already replaced is ignored.
  if (!record || String(props.modelValue) !== String(id)) return

  if (!items.value.some((option) => String(option.value) === String(id))) {
    items.value = [toOption(record), ...items.value]
  }
  emit("select", record)
}

const onPick = (id: number | string | null) => emit("update:modelValue", id ?? null)

const onSearch = (term: string | null) => {
  const text = (term ?? "").trim()

  // The select echoes the chosen name as its search text: that is not a new search.
  const selected = selectedRecord()
  if (selected && titleOf(selected) === text) return

  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(text), SEARCH_DELAY_MS)
}

watch(() => props.modelValue, (id) => resolveSelected(id), { immediate: true })

onMounted(() => load(""))
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

defineExpose({ loadMore })
</script>
