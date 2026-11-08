<template>
  <v-autocomplete
    v-bind="bindings"
    :model-value="modelValue"
    :items="items"
    item-title="label"
    item-value="id"
    :label="label"
    :loading="searching"
    :rules="rules"
    no-filter
    no-data-text="Sin coincidencias"
    placeholder="Busca por nombre, SKU o código de barras"
    @update:model-value="onModelValue"
    @update:search="onSearch"
  >
    <!-- Scrolling to the end of the list asks for the next page. -->
    <template v-if="hasMore" #append-item>
      <InfiniteSentinel :key="items.length" @visible="loadMore" />
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import type { PageResponse } from "~/interfaces/PageResponse"
import type { Product, ProductOption } from "~/interfaces/productInterfaces"

/**
 * Autocomplete that searches active products on the server as the user types (debounced), so it works with
 * large catalogs. `v-model` is the product id; `select` also hands the parent the whole option (unit, cost...).
 */
const props = withDefaults(
  defineProps<{
    modelValue: number | null
    /** Pre-selected product, so its label shows before any search runs. */
    initial?: ProductOption | null
    label?: string
    rules?: Array<(value: any) => true | string>
    density?: "default" | "comfortable" | "compact"
  }>(),
  {
    initial: null,
    label: "Producto",
    rules: () => [],
    density: undefined,
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", value: number | null): void
  (e: "select", value: ProductOption | null): void
}>()

const { autocomplete } = useFormFields()

const bindings = computed(() => ({
  ...autocomplete,
  ...(props.density ? { density: props.density } : {}),
}))

interface Item extends ProductOption {
  label: string
}

const toItem = (product: ProductOption): Item => ({
  ...product,
  label: product.sku ? `${product.sku} — ${product.name}` : product.name,
})

// Everything seen so far, so the selected product keeps its label (and data) across searches.
const known = new Map<number, Item>()
const items = ref<Item[]>([])
const searching = ref(false)
const hasMore = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let currentTerm = ""
let currentPage = 0
let requestId = 0

if (props.initial) {
  const item = toItem(props.initial)
  known.set(item.id, item)
  items.value = [item]
}

const requestPage = (page: number, term: string) => {
  const { $api } = useNuxtApp()
  return $api<PageResponse<Product>>("/api/products", {
    method: "GET",
    query: { page, size: 20, isActive: true, ...(term ? { search: term } : {}) },
  })
}

const toItems = (products: Product[]) =>
  products.map((p) =>
    toItem({
      id: p.id!,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      costPrice: p.costPrice,
      tracksExpiry: p.tracksExpiry,
    })
  )

/** First page of a (new) search: replaces the list. */
const load = async (term: string) => {
  const id = ++requestId
  currentTerm = term
  currentPage = 0
  searching.value = true
  try {
    const res = await requestPage(0, term)
    if (id !== requestId) return // a newer search took over

    const found = toItems(res.content ?? [])
    found.forEach((item) => known.set(item.id, item))
    hasMore.value = currentPage + 1 < (res.totalPages ?? 1)

    // Keep the current selection in the list even when it isn't in this result page.
    const selected = props.modelValue ? known.get(props.modelValue) : undefined
    items.value = selected && !found.some((i) => i.id === selected.id) ? [selected, ...found] : found
  } catch (err) {
    console.error("Error al buscar productos:", err)
  } finally {
    if (id === requestId) searching.value = false
  }
}

/** Next 20 of the same search: appended to the list when the user scrolls to the end. */
const loadMore = async () => {
  if (searching.value || !hasMore.value) return

  const id = ++requestId
  searching.value = true
  try {
    const res = await requestPage(currentPage + 1, currentTerm)
    if (id !== requestId) return

    currentPage += 1
    const found = toItems(res.content ?? [])
    found.forEach((item) => known.set(item.id, item))
    hasMore.value = currentPage + 1 < (res.totalPages ?? 1)

    const already = new Set(items.value.map((item) => item.id))
    items.value = [...items.value, ...found.filter((item) => !already.has(item.id))]
  } catch (err) {
    console.error("Error al cargar más productos:", err)
  } finally {
    if (id === requestId) searching.value = false
  }
}

defineExpose({ loadMore })

const onSearch = (term: string) => {
  // The autocomplete echoes the selected label as its search text: that isn't a new search.
  if (props.modelValue && known.get(props.modelValue)?.label === term) return

  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load((term ?? "").trim()), 300)
}

const onModelValue = (id: number | null) => {
  emit("update:modelValue", id ?? null)
  emit("select", id ? known.get(id) ?? null : null)
}

onMounted(() => load(""))
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>
