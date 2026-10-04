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
  />
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
let searchTimer: ReturnType<typeof setTimeout> | null = null

if (props.initial) {
  const item = toItem(props.initial)
  known.set(item.id, item)
  items.value = [item]
}

const load = async (term: string) => {
  searching.value = true
  try {
    const { $api } = useNuxtApp()
    const res = await $api<PageResponse<Product>>("/api/products", {
      method: "GET",
      query: { page: 0, size: 20, isActive: true, ...(term ? { search: term } : {}) },
    })

    const found = (res.content ?? []).map((p) =>
      toItem({
        id: p.id!,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        costPrice: p.costPrice,
        tracksExpiry: p.tracksExpiry,
      })
    )
    found.forEach((item) => known.set(item.id, item))

    // Keep the current selection in the list even when it isn't in this result page.
    const selected = props.modelValue ? known.get(props.modelValue) : undefined
    items.value = selected && !found.some((i) => i.id === selected.id) ? [selected, ...found] : found
  } catch (err) {
    console.error("Error al buscar productos:", err)
  } finally {
    searching.value = false
  }
}

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
