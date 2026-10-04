<template>
  <AppTableWrapper>
    <AppPageTitle title="Nueva orden de compra" subtitle="Órdenes de compra">
      <template #actions>
        <v-btn
          variant="tonal"
          rounded="lg"
          size="large"
          class="text-none"
          :prepend-icon="APP_ICONS.arrowLeft"
          @click="navigateTo('/app/purchase-orders')"
        >
          Volver
        </v-btn>
      </template>
    </AppPageTitle>

    <v-card class="po-card" rounded="xl" elevation="0">
      <v-card-text class="pa-5 pa-md-6">
        <v-overlay
          :model-value="saving"
          contained
          persistent
          class="align-center justify-center"
          scrim="rgba(255, 255, 255, 0.8)"
        >
          <v-progress-circular indeterminate color="primary" size="44" width="3" />
        </v-overlay>

        <PurchaseOrderForm
          :suppliers="suppliersStore.activeOptions"
          :warehouses="warehousesStore.activeOptions"
          submit-label="Crear orden (borrador)"
          @submit="handleSubmit"
        />
      </v-card-text>
    </v-card>
  </AppTableWrapper>
</template>

<script setup lang="ts">
import type { PurchaseOrderRequest } from "~/interfaces/purchaseOrderInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { usePurchaseOrdersStore, useSuppliersStore, useWarehousesStore } from "~/store"

definePageMeta({
  layout: "app",
  middleware: "role",
  allowedRoles: ["ADMIN_USER", "SUPER_ADMIN", "PURCHASING_USER"],
})

useHead({ title: "Nueva orden de compra" })

const ordersStore = usePurchaseOrdersStore()
const suppliersStore = useSuppliersStore()
const warehousesStore = useWarehousesStore()
const { notifyError } = useApiNotification()

const saving = ref(false)

const handleSubmit = async (payload: PurchaseOrderRequest) => {
  saving.value = true
  try {
    // No toast: a draft is not a placed order yet. The detail page shows a "borrador" banner instead.
    const order = await ordersStore.createOrder(payload)
    await navigateTo(`/app/purchase-orders/${order.id}`)
  } catch (err) {
    notifyError(err, "crear la orden de compra")
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  suppliersStore.fetchOptions()
  warehousesStore.fetchOptions()
})
</script>

<style scoped>
.po-card {
  position: relative;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
