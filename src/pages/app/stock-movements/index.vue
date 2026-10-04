<template>
  <AppTableWrapper>
    <AppPageTitle
      title="Movimientos"
      subtitle="Historial de ingresos, salidas, ajustes y transferencias"
      :total-items="stockStore.movements?.totalElements ?? 0"
    />

    <div v-if="productId" class="mb-3">
      <v-chip
        closable
        color="primary"
        variant="tonal"
        :prepend-icon="APP_ICONS.package"
        @click:close="clearProductFilter"
      >
        Producto: {{ productLabel }}
      </v-chip>
    </div>

    <StockMovementsTable :product-id="productId ?? null" />
  </AppTableWrapper>
</template>

<script setup lang="ts">
import type { Product } from "~/interfaces/productInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useStockStore } from "~/store"

definePageMeta({ layout: "app" })

useHead({ title: "Movimientos" })

const route = useRoute()
const stockStore = useStockStore()

// The product filter comes from the URL (?productId=), so a link to this page can already be filtered.
const productId = computed(() => {
  const raw = Array.isArray(route.query.productId) ? route.query.productId[0] : route.query.productId
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
})

const productLabel = ref("")

watch(
  productId,
  async (id) => {
    productLabel.value = ""
    if (!id) return

    try {
      const { $api } = useNuxtApp()
      const product = await $api<Product>(`/api/products/${id}`, { method: "GET" })
      productLabel.value = product.sku ? `${product.sku} — ${product.name}` : product.name
    } catch {
      productLabel.value = `#${id}`
    }
  },
  { immediate: true }
)

const clearProductFilter = () => {
  navigateTo({ path: "/app/stock-movements" })
}
</script>
