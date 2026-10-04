<template>
  <AppTableWrapper>
    <AppPageTitle :title="order?.number ?? 'Orden de compra'" subtitle="Orden de compra">
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

    <v-card v-if="loading" class="po-card pa-6 text-center" rounded="xl" elevation="0">
      <v-progress-circular indeterminate color="primary" />
    </v-card>

    <v-card v-else-if="notFound || !order" class="po-card pa-6 text-center" rounded="xl" elevation="0">
      <p class="text-body-1 mb-3">No se encontró la orden de compra.</p>
      <v-btn color="primary" variant="flat" rounded="lg" class="text-none" @click="navigateTo('/app/purchase-orders')">
        Ver órdenes de compra
      </v-btn>
    </v-card>

    <template v-else>
      <v-alert
        v-if="status === 'DRAFT'"
        type="info"
        variant="tonal"
        rounded="lg"
        density="comfortable"
        class="mb-4"
        title="Esto es un borrador"
      >
        Aún no se ha pedido al proveedor y no se puede recibir mercadería. Revisa las líneas y, cuando hagas el pedido,
        pulsa «Marcar como pedida».
      </v-alert>

      <!-- Summary + actions -->
      <v-card class="po-card mb-4" rounded="xl" elevation="0">
        <v-card-text class="pa-5 pa-md-6">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
            <v-chip
              :color="PURCHASE_ORDER_STATUS_COLORS[order.status]"
              variant="tonal"
              size="large"
              rounded="lg"
            >
              {{ getPurchaseOrderStatusLabel(order.status) }}
            </v-chip>

            <div class="d-flex flex-wrap ga-2">
              <v-btn
                v-if="canReceive && authStore.canReceiveGoods"
                color="success"
                variant="flat"
                rounded="lg"
                class="text-none"
                :prepend-icon="APP_ICONS.receive"
                @click="openReceive = true"
              >
                Recibir mercadería
              </v-btn>
              <v-btn
                v-if="canEdit"
                color="primary"
                variant="tonal"
                rounded="lg"
                class="text-none"
                :prepend-icon="APP_ICONS.edit"
                @click="editing = !editing"
              >
                {{ editing ? "Cancelar edición" : "Editar" }}
              </v-btn>
              <v-btn
                v-if="canEdit && !editing"
                color="primary"
                variant="flat"
                rounded="lg"
                class="text-none"
                :prepend-icon="APP_ICONS.send"
                @click="showOrderDialog = true"
              >
                Marcar como pedida
              </v-btn>
              <v-btn
                v-if="canEdit && !editing"
                color="error"
                variant="text"
                rounded="lg"
                class="text-none"
                :prepend-icon="APP_ICONS.delete"
                @click="showDeleteDialog = true"
              >
                Eliminar
              </v-btn>
              <v-btn
                v-if="canCancel"
                color="warning"
                variant="text"
                rounded="lg"
                class="text-none"
                :prepend-icon="APP_ICONS.cancel"
                @click="showCancelDialog = true"
              >
                Cancelar orden
              </v-btn>
            </div>
          </div>

          <v-row dense>
            <v-col v-for="info in summaryItems" :key="info.label" cols="12" sm="6" md="3">
              <p class="text-overline text-medium-emphasis mb-0">{{ info.label }}</p>
              <p class="text-body-1 mb-2">{{ info.value }}</p>
            </v-col>
            <v-col v-if="order.notes" cols="12">
              <p class="text-overline text-medium-emphasis mb-0">Notas</p>
              <p class="text-body-2 mb-0">{{ order.notes }}</p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Edit (drafts only) or read-only lines -->
      <v-card v-if="editing" class="po-card mb-4" rounded="xl" elevation="0">
        <v-card-text class="pa-5 pa-md-6">
          <PurchaseOrderForm
            :order="order"
            :suppliers="editableSuppliers"
            :warehouses="warehousesStore.activeOptions"
            submit-label="Guardar cambios"
            @submit="handleUpdate"
          />
        </v-card-text>
      </v-card>

      <v-card v-else class="po-card mb-4" rounded="xl" elevation="0">
        <v-card-text class="pa-0">
          <v-table density="comfortable" class="po-lines">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-right">Pedido</th>
                <th class="text-right">Recibido</th>
                <th class="text-right">Pendiente</th>
                <th class="text-right">Costo unit.</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in order.lines" :key="line.id">
                <td>
                  {{ line.productSku ? `${line.productSku} — ` : "" }}{{ line.productName }}
                  <div v-if="line.packaging" class="text-caption text-medium-emphasis">{{ line.packaging }}</div>
                </td>
                <td class="text-right">{{ formatQuantity(line.quantity) }} {{ unitLabel(line) }}</td>
                <td class="text-right">{{ formatQuantity(line.receivedQuantity ?? 0) }}</td>
                <td class="text-right">{{ formatQuantity(line.pendingQuantity ?? 0) }}</td>
                <td class="text-right">{{ formatMoney(line.unitCost) }}</td>
                <td class="text-right">{{ formatMoney(line.lineTotal) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="text-right font-weight-bold">Total</td>
                <td class="text-right font-weight-bold">{{ formatMoney(order.total) }}</td>
              </tr>
            </tfoot>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- Receipts: the stock movements this order generated -->
      <div v-if="order.status !== 'DRAFT'" class="mt-6">
        <h2 class="text-h6 app-font-heading mb-1">Recepciones de esta orden</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Cada vez que recibes mercadería contra esta orden queda un registro aquí.
          Todas las recepciones de todas las órdenes están en el menú «Recepciones».
        </p>
        <StockMovementsTable :key="receiptsKey" :purchase-order-id="order.id" />
      </div>
    </template>
  </AppTableWrapper>

  <AppDrawer
    v-model="openReceive"
    title="Recibir mercadería"
    :loading="saving"
    size="large"
    location="end"
    :temporary="true"
    @close="openReceive = false"
  >
    <ReceiveGoodsForm v-if="order" :order="order" @submit="handleReceive" />
  </AppDrawer>

  <ConfirmationModal
    v-model="showOrderDialog"
    title="Marcar como pedida"
    message="La orden pasará a 'Pedida' y ya no se podrá editar. Podrás recibir la mercadería cuando llegue."
    confirm-label="Marcar como pedida"
    :icon="APP_ICONS.send"
    color="primary"
    :require-text="false"
    @confirm="handleMarkOrdered"
  />

  <ConfirmationModal
    v-model="showCancelDialog"
    title="Cancelar orden"
    message="Se cancelará lo que esté pendiente de recibir. El stock que ya se haya recibido se conserva."
    confirm-label="Cancelar orden"
    :icon="APP_ICONS.cancel"
    color="warning"
    :require-text="false"
    @confirm="handleCancel"
  />

  <ConfirmationModal
    v-model="showDeleteDialog"
    title="Eliminar borrador"
    message="¿Deseas eliminar este borrador? Esta acción no se puede deshacer."
    :require-text="false"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderRequest,
  ReceiveRequest,
} from "~/interfaces/purchaseOrderInterfaces"
import {
  PURCHASE_ORDER_STATUS_COLORS,
  getPurchaseOrderStatusLabel,
} from "~/interfaces/purchaseOrderInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore, usePurchaseOrdersStore, useSuppliersStore, useWarehousesStore } from "~/store"
import { formatDateTime, formatMoney, formatQuantity } from "~/helpers/formatHelpers"

definePageMeta({ layout: "app" })

useHead({ title: "Orden de compra" })

const route = useRoute()
const authStore = useAuthStore()
const ordersStore = usePurchaseOrdersStore()
const suppliersStore = useSuppliersStore()
const warehousesStore = useWarehousesStore()
const { success } = useNotification()
const { notifyError } = useApiNotification()

const orderId = computed(() => Number(route.params.id))
const order = ref<PurchaseOrder | null>(null)
const loading = ref(true)
const notFound = ref(false)
const saving = ref(false)
const editing = ref(false)
const openReceive = ref(false)
const showOrderDialog = ref(false)
const showCancelDialog = ref(false)
const showDeleteDialog = ref(false)
// Bumped after each receipt so the movements table below reloads.
const receiptsKey = ref(0)

// Admins and purchasing edit / order / cancel; receiving goods is also open to the warehouse role.
const canManage = computed(() => authStore.canManagePurchases)
const status = computed(() => order.value?.status)
const canEdit = computed(() => canManage.value && status.value === "DRAFT")
const canReceive = computed(() => status.value === "ORDERED" || status.value === "PARTIALLY_RECEIVED")
const canCancel = computed(() => canManage.value && canReceive.value)

/** The supplier picker only lists active ones, but an inactive supplier already on the draft must stay selectable. */
const editableSuppliers = computed(() => {
  const active = suppliersStore.activeOptions
  const current = suppliersStore.options.find((supplier) => supplier.id === order.value?.supplierId)
  return current && !active.some((supplier) => supplier.id === current.id) ? [current, ...active] : active
})

const formatDateOnly = (value?: string | null) => {
  if (!value) return "—"
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}

const summaryItems = computed(() => {
  const o = order.value
  if (!o) return []

  return [
    { label: "Proveedor", value: o.supplierName ?? "—" },
    { label: "Almacén de destino", value: o.warehouseName ?? "—" },
    { label: "Entrega esperada", value: formatDateOnly(o.expectedDate) },
    { label: "Total", value: formatMoney(o.total) },
    { label: "Creada", value: formatDateTime(o.createdAt) },
    { label: "Creada por", value: o.createdByName || "—" },
    { label: "Pedida", value: formatDateTime(o.orderedAt) },
    ...(o.cancelledAt ? [{ label: "Cancelada", value: formatDateTime(o.cancelledAt) }] : []),
  ]
})

const unitLabel = (line: PurchaseOrderLine) => (line.unit ? getUnitShortLabel(line.unit) : "")

const load = async () => {
  loading.value = true
  try {
    order.value = await ordersStore.fetchOrder(orderId.value)
    notFound.value = false
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

/** Runs an action that returns the updated order; shows its result or the error. */
const runAction = async (
  action: () => Promise<PurchaseOrder>,
  message: [string, string],
  failure: string
) => {
  saving.value = true
  try {
    order.value = await action()
    success(message[0], message[1])
    return true
  } catch (err) {
    notifyError(err, failure)
    return false
  } finally {
    saving.value = false
  }
}

const handleUpdate = async (payload: PurchaseOrderRequest) => {
  const ok = await runAction(
    () => ordersStore.updateOrder(orderId.value, payload),
    ["La orden se actualizó correctamente.", "Orden actualizada"],
    "actualizar la orden"
  )
  if (ok) editing.value = false
}

const handleMarkOrdered = () =>
  runAction(
    () => ordersStore.markOrdered(orderId.value),
    ["La orden quedó como pedida.", "Orden pedida"],
    "marcar la orden como pedida"
  )

const handleCancel = () =>
  runAction(
    () => ordersStore.cancelOrder(orderId.value),
    ["La orden se canceló.", "Orden cancelada"],
    "cancelar la orden"
  )

const handleReceive = async (payload: ReceiveRequest) => {
  const ok = await runAction(
    () => ordersStore.receive(orderId.value, payload),
    ["La mercadería se recibió y el stock se actualizó.", "Recepción registrada"],
    "registrar la recepción"
  )
  if (ok) {
    openReceive.value = false
    receiptsKey.value += 1
  }
}

const handleDelete = async () => {
  try {
    await ordersStore.deleteOrder(orderId.value)
    success("El borrador se eliminó correctamente.", "Borrador eliminado")
    await navigateTo("/app/purchase-orders")
  } catch (err) {
    notifyError(err, "eliminar el borrador")
  }
}

onMounted(() => {
  suppliersStore.fetchOptions()
  warehousesStore.fetchOptions()
  load()
})
</script>

<style scoped>
.po-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.po-lines :deep(th) {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
