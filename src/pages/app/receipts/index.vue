<template>
  <AppTableWrapper>
    <AppPageTitle
      title="Recepciones"
      subtitle="Mercadería recibida de tus órdenes de compra"
      :total-items="stockStore.movements?.totalElements ?? 0"
    />

    <StockMovementsTable receipts-only />
  </AppTableWrapper>
</template>

<script setup lang="ts">
import { useStockStore } from "~/store"

definePageMeta({ layout: "app" })

useHead({ title: "Recepciones" })

const stockStore = useStockStore()
</script>
