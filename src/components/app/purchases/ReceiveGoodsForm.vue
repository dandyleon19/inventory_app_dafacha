<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection
      title="Recepción de mercadería"
      :subtitle="`Se ingresará al almacén ${order.warehouseName ?? ''}`"
    >
      <v-alert
        type="info"
        variant="tonal"
        density="comfortable"
        rounded="lg"
        :icon="APP_ICONS.info"
      >
        Indica cuánto llegó de cada producto (puede ser menos de lo pedido: el resto queda pendiente).
        Al recibir, el costo de cada producto se recalcula por promedio ponderado.
      </v-alert>

      <v-text-field
        v-if="rows.length"
        v-model="receivedDate"
        v-bind="field"
        label="Fecha de recepción"
        type="date"
        :min="minReceivedDate"
        :max="today"
        hint="Hoy por defecto. Cámbiala solo si la mercadería llegó otro día."
        persistent-hint
        :rules="receivedDateRules"
      />

      <div v-if="!rows.length" class="text-body-2 text-medium-emphasis">
        Esta orden no tiene nada pendiente de recibir.
      </div>

      <div v-for="row in rows" :key="row.line.id" class="receive-line">
        <div class="receive-line__info">
          <div class="font-weight-medium">
            {{ row.line.productSku ? `${row.line.productSku} — ` : "" }}{{ row.line.productName }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Pedido {{ formatQuantity(row.line.quantity) }} {{ unitLabel(row.line) }}
            · Recibido {{ formatQuantity(row.line.receivedQuantity ?? 0) }}
            · <strong>Pendiente {{ formatQuantity(row.line.pendingQuantity ?? 0) }}</strong>
            · Costo {{ formatMoney(row.line.unitCost) }}
          </div>
        </div>

        <v-text-field
          v-model="row.quantity"
          v-bind="field"
          class="receive-line__input"
          label="Recibido ahora"
          type="number"
          min="0"
          step="any"
          :suffix="unitLabel(row.line)"
          :rules="quantityRules(row.line)"
        />

        <!-- Products that control expiry: the lot that arrived needs a date (only if something is received). -->
        <div v-if="row.line.tracksExpiry" class="receive-line__lot">
          <v-text-field
            v-model="row.expiryDate"
            v-bind="field"
            label="Fecha de vencimiento"
            type="date"
            :min="today"
            :rules="expiryRules(row)"
          />
          <v-text-field
            v-model="row.lotNumber"
            v-bind="field"
            label="Lote (opcional)"
            :rules="[rules.maxLength(50)]"
          />
        </div>
      </div>

      <v-alert
        v-if="showNothingError"
        type="error"
        variant="tonal"
        density="compact"
        rounded="lg"
        :icon="APP_ICONS.error"
      >
        Indica una cantidad mayor a 0 en al menos un producto.
      </v-alert>

      <div v-if="rows.length" class="d-flex justify-end">
        <v-btn variant="text" size="small" class="text-none" @click="fillAll">
          Recibir todo lo pendiente
        </v-btn>
      </div>
    </AppFormSection>

    <AppFormActions>
      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        rounded="lg"
        class="app-form-btn--primary"
        :disabled="!rows.length"
      >
        Registrar recepción
      </v-btn>
    </AppFormActions>
  </v-form>
</template>

<script setup lang="ts">
import type { PurchaseOrder, PurchaseOrderLine, ReceiveRequest } from "~/interfaces/purchaseOrderInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { formatMoney, formatQuantity, todayIso } from "~/helpers/formatHelpers"
import { validationRules as rules } from "~/helpers/validationFormRules"

const props = defineProps<{
  order: PurchaseOrder
}>()

const emit = defineEmits<{
  (e: "submit", payload: ReceiveRequest): void
}>()

const { field } = useFormFields()

const isValid = ref(false)
const formRef = ref<any>(null)
const showNothingError = ref(false)

// One row per line that still has something pending; the quantity starts at "everything pending".
const rows = reactive(
  (props.order.lines ?? [])
    .filter((line) => (line.pendingQuantity ?? 0) > 0)
    .map((line) => ({
      line,
      quantity: (line.pendingQuantity ?? 0) as number | string,
      expiryDate: "",
      lotNumber: "",
    }))
)

const today = todayIso()

// The goods arrive today unless the user says otherwise; they can't have arrived in the future, nor before the order
// was placed.
const receivedDate = ref(today)
const minReceivedDate = computed(() => props.order.orderedAt?.slice(0, 10) ?? undefined)
const receivedDateRules = [
  (v: string) => !!v || "Indica la fecha en que llegó la mercadería",
  (v: string) => !v || v <= today || "La fecha no puede ser futura",
  (v: string) =>
    !v || !minReceivedDate.value || v >= minReceivedDate.value || "No puede ser anterior al día en que se hizo el pedido",
]

/** The expiry date is mandatory only for a tracked line that is actually receiving something. */
const expiryRules = (row: { quantity: number | string; expiryDate: string }) => [
  (v: string) => Number(row.quantity) <= 0 || !!v || "Indica la fecha de vencimiento del lote recibido",
  (v: string) => !v || v >= today || "La fecha de vencimiento no puede estar en el pasado",
]

const unitLabel = (line: PurchaseOrderLine) => (line.unit ? getUnitShortLabel(line.unit) : "")

const WHOLE_UNITS = ["UNIT", "BOX", "PACK", "DOZEN"]

const quantityRules = (line: PurchaseOrderLine) => [
  (v: number | string | null) => (v !== "" && v !== null) || "Este campo es requerido",
  (v: number | string | null) => Number(v) >= 0 || "No puede ser negativo",
  (v: number | string | null) =>
    Number(v) <= (line.pendingQuantity ?? 0) || `No puede superar lo pendiente (${line.pendingQuantity})`,
  (v: number | string | null) => /^\d+(\.\d{1,3})?$/.test(String(v)) || "Máximo 3 decimales",
  (v: number | string | null) =>
    !(line.unit && WHOLE_UNITS.includes(line.unit)) ||
    Number.isInteger(Number(v)) ||
    "Este producto se cuenta en unidades enteras",
]

const fillAll = () => {
  rows.forEach((row) => {
    row.quantity = row.line.pendingQuantity ?? 0
  })
}

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  const items = rows
    .filter((row) => Number(row.quantity) > 0)
    .map((row) => ({
      lineId: row.line.id as number,
      quantity: Number(row.quantity),
      expiryDate: row.line.tracksExpiry ? row.expiryDate || null : null,
      lotNumber: row.line.tracksExpiry ? row.lotNumber.trim() || null : null,
    }))

  showNothingError.value = items.length === 0
  if (items.length === 0) return

  emit("submit", { receivedDate: receivedDate.value, items })
}
</script>

<style scoped>
.receive-line {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.6);
}

.receive-line__info {
  flex: 1 1 220px;
  min-width: 0;
}

.receive-line__input {
  flex: 0 0 180px;
}

.receive-line__lot {
  display: flex;
  flex: 1 1 100%;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.receive-line__lot > * {
  flex: 1 1 180px;
}
</style>
