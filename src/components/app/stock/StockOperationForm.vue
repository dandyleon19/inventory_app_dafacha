<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection :title="sectionTitle" :subtitle="sectionSubtitle">
      <v-row dense>
        <v-col cols="12">
          <ProductPicker
            v-model="form.productId"
            :initial="product"
            :rules="[rules.required]"
            @select="selectedProduct = $event"
          />
        </v-col>

        <template v-if="mode === 'transfer'">
          <v-col cols="12" sm="6">
            <v-select
              v-model="form.warehouseId"
              v-bind="select"
              :items="warehouses"
              item-title="name"
              item-value="id"
              label="Almacén de origen"
              :rules="[rules.required]"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="form.toWarehouseId"
              v-bind="select"
              :items="destinationWarehouses"
              item-title="name"
              item-value="id"
              label="Almacén de destino"
              :rules="[rules.required, differentWarehouse]"
            />
          </v-col>
        </template>
        <v-col v-else cols="12">
          <v-select
            v-model="form.warehouseId"
            v-bind="select"
            :items="warehouses"
            item-title="name"
            item-value="id"
            label="Almacén"
            :rules="[rules.required]"
          />
        </v-col>

        <v-col v-if="showCurrentStock" cols="12">
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            rounded="lg"
            :icon="APP_ICONS.info"
          >
            {{ mode === "transfer" ? "Disponible en el origen" : "Stock actual" }}:
            <strong>{{ currentStockLabel }}</strong>
          </v-alert>
        </v-col>

        <v-col cols="12">
          <v-text-field
            v-model="form.quantity"
            v-bind="field"
            :label="quantityLabel"
            type="number"
            min="0"
            step="any"
            :suffix="unitShortLabel"
            :rules="quantityRules"
            :readonly="countByLots"
            :hint="countByLots ? 'Es la suma de los lotes de abajo' : undefined"
            :persistent-hint="countByLots"
            @update:model-value="onQuantityInput"
          />
        </v-col>

        <v-col v-if="mode === 'entry'" cols="12">
          <v-text-field
            v-model="form.unitCost"
            v-bind="field"
            label="Costo unitario"
            type="number"
            min="0"
            step="any"
            prefix="S/"
            hint="Lo que costó cada unidad de este ingreso. Por defecto, el costo actual del producto: cámbialo si esta mercadería costó otra cosa."
            persistent-hint
            :rules="unitCostRules"
          />
        </v-col>

        <v-col v-if="mode === 'adjustment' && differenceLabel" cols="12">
          <v-chip :color="differenceColor" variant="tonal" size="large" rounded="lg">
            Diferencia: {{ differenceLabel }}
          </v-chip>
        </v-col>

        <!-- Products that control expiry: the lot being added needs a date. -->
        <template v-if="needsLot">
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.expiryDate"
              v-bind="field"
              label="Fecha de vencimiento"
              type="date"
              :min="today"
              :rules="[rules.required, notInThePast]"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.lotNumber"
              v-bind="field"
              label="Lote (opcional)"
              :rules="[rules.maxLength(50)]"
            />
          </v-col>
        </template>

        <!-- Automatic mode: nothing to choose, unless the user wants to for this operation. -->
        <v-col v-else-if="showAutoNotice" cols="12">
          <div class="auto-notice">
            <span class="text-body-2">
              {{ isTracked ? "Sale automáticamente el lote que vence primero." : "Sale automáticamente la compra más antigua." }}
            </span>
            <v-btn size="small" variant="text" class="text-none" @click="manualPick = true">
              Elegir manualmente
            </v-btn>
          </div>
        </v-col>

        <!-- The user sees, and can change, which lot (or which purchase) it comes from. -->
        <v-col v-else-if="showPicker" cols="12">
          <div class="lot-picker">
            <div class="lot-picker__head">
              <div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ isLayerMode ? "¿De qué compra sale?" : isCount ? "¿Cuánto contaste en cada lote?" : "¿De qué lote sale?" }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  <template v-if="isCount">
                    Cada lote empieza con lo que dice el sistema. Cambia solo los que no coinciden: la diferencia se
                    ajusta en ese lote.
                  </template>
                  <template v-else-if="isLayerMode">
                    Elige de qué compra sale lo que registras: cada una tiene su propio costo. Por defecto se propone la más
                    antigua.
                  </template>
                  <template v-else>
                    Por defecto sale primero el que vence antes. Cambia las cantidades si quieres sacar de otro lote.
                  </template>
                </div>
              </div>
              <div class="lot-picker__actions">
                <v-btn v-if="lotsTouched && !isCount" size="small" variant="text" class="text-none" @click="resetLots">
                  {{ isLayerMode ? "Usar la más antigua" : "Usar el que vence primero" }}
                </v-btn>
                <v-btn
                  v-if="manualPick && !isCount"
                  size="small"
                  variant="text"
                  class="text-none"
                  @click="manualPick = false"
                >
                  Volver a automático
                </v-btn>
              </div>
            </div>

            <div v-if="lotsLoading" class="text-caption text-medium-emphasis">Cargando lotes…</div>
            <div v-else-if="!lotRows.length" class="text-caption text-medium-emphasis">
              {{ isLayerMode ? "Este producto no tiene compras con stock en este almacén." : "Este producto no tiene stock en este almacén." }}
            </div>

            <div v-for="row in lotRows" :key="row.key" class="lot-row">
              <div class="lot-row__info">
                <div v-if="row.layerId !== undefined" class="font-weight-medium">
                  Compra del {{ formatDateOnly((row.receivedAt ?? "").slice(0, 10)) }}
                  <span class="text-medium-emphasis"> · {{ formatMoney(row.unitCost ?? 0) }} c/u</span>
                </div>
                <div v-else class="font-weight-medium">
                  {{ row.expiryDate ? `Vence ${formatDateOnly(row.expiryDate)}` : "Sin fecha de vencimiento" }}
                  <span v-if="row.lotNumber" class="text-medium-emphasis"> · Lote {{ row.lotNumber }}</span>
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ isCount ? "En el sistema" : "Disponible" }} {{ formatQuantity(row.available) }} {{ unitShortLabel }}
                  <template v-if="row.daysToExpiry !== null">
                    ·
                    <span :class="row.daysToExpiry < 0 ? 'text-error font-weight-medium' : ''">
                      {{ describeDaysToExpiry(row.daysToExpiry) }}
                    </span>
                  </template>
                </div>
                <!-- A warning, not an error: taking out an expired lot is allowed (to throw it away), just not by accident. -->
                <div
                  v-if="!isCount && row.daysToExpiry !== null && row.daysToExpiry < 0 && Number(row.take) > 0"
                  class="lot-row__warn"
                >
                  <v-icon size="14">{{ APP_ICONS.warning }}</v-icon>
                  Este lote ya venció. Solo sácalo si es para desecharlo.
                </div>
              </div>
              <v-text-field
                v-model="row.take"
                v-bind="field"
                class="lot-row__input"
                :label="isCount ? 'Contado' : 'Sacar'"
                type="number"
                min="0"
                step="any"
                :suffix="unitShortLabel"
                :rules="lotTakeRules(row)"
                @update:model-value="onTakeInput"
              />
              <v-chip
                v-if="isCount && rowDifference(row) !== 0"
                class="lot-row__diff"
                size="small"
                variant="tonal"
                :color="rowDifference(row) > 0 ? 'success' : 'error'"
              >
                {{ rowDifference(row) > 0 ? "+" : "" }}{{ formatQuantity(rowDifference(row)) }}
              </v-chip>
            </div>

            <v-alert
              v-if="overflow > 0"
              type="warning"
              variant="tonal"
              density="compact"
              rounded="lg"
              :icon="APP_ICONS.warning"
            >
              <template v-if="isLayerMode">
                Pides {{ formatQuantity(overflow) }} {{ unitShortLabel }} más de las que hay en las compras. Como tu empresa
                permite stock negativo, saldrán al costo actual del producto y el stock quedará en negativo.
              </template>
              <template v-else>
                Pides {{ formatQuantity(overflow) }} {{ unitShortLabel }} más de las que hay en los lotes. Como tu empresa permite
                stock negativo, saldrán sin lote y el stock quedará en negativo.
              </template>
            </v-alert>

            <!-- A count can also find a lot the system doesn't have. -->
            <template v-if="isCount">
              <div v-for="lot in newLots" :key="lot.key" class="lot-new">
                <v-text-field
                  v-model="lot.expiryDate"
                  v-bind="field"
                  label="Vence"
                  type="date"
                  :min="today"
                  :rules="[rules.required, notInThePast]"
                />
                <v-text-field
                  v-model="lot.lotNumber"
                  v-bind="field"
                  label="Lote (opcional)"
                  :rules="[rules.maxLength(50)]"
                />
                <v-text-field
                  v-model="lot.quantity"
                  v-bind="field"
                  label="Cantidad"
                  type="number"
                  min="0"
                  step="any"
                  :suffix="unitShortLabel"
                  :rules="newLotQuantityRules"
                />
                <v-btn icon variant="text" size="small" aria-label="Quitar lote" @click="removeNewLot(lot.key)">
                  <v-icon>{{ APP_ICONS.close }}</v-icon>
                </v-btn>
              </div>
              <div>
                <v-btn size="small" variant="tonal" class="text-none" :prepend-icon="APP_ICONS.plus" @click="addNewLot">
                  Agregar un lote que no está en la lista
                </v-btn>
              </div>
            </template>
          </div>
        </v-col>

        <v-col cols="12">
          <v-textarea
            v-model="form.notes"
            v-bind="textarea"
            label="Notas (opcional)"
            rows="2"
            :rules="[rules.maxLength(500)]"
          />
        </v-col>
      </v-row>
    </AppFormSection>

    <AppFormActions>
      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        rounded="lg"
        class="app-form-btn--primary"
      >
        {{ submitLabel }}
      </v-btn>
    </AppFormActions>
  </v-form>
</template>

<script setup lang="ts">
import type { Warehouse } from "~/interfaces/warehouseInterfaces"
import type {
  StockLayerPick,
  StockLotPick,
  StockOperationKind,
  StockOperationPayload,
  StockProductOption,
} from "~/interfaces/stockInterfaces"
import { describeDaysToExpiry } from "~/interfaces/stockInterfaces"
import type { ProductOption } from "~/interfaces/productInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { validationRules as rules } from "~/helpers/validationFormRules"
import { formatDateOnly, formatMoney, formatQuantity } from "~/helpers/formatHelpers"
import { useCompanyStore, useStockStore } from "~/store"

const props = defineProps<{
  mode: StockOperationKind
  warehouses: Warehouse[]
  /** Pre-selected product (e.g. when started from a table row). */
  product?: StockProductOption | null
  /** Pre-selected warehouse (e.g. the one the table is filtered by). */
  warehouseId?: number | null
}>()

const emit = defineEmits<{
  (e: "submit", payload: StockOperationPayload): void
}>()

const { field, textarea, select } = useFormFields()
const stockStore = useStockStore()
const companyStore = useCompanyStore()

const isValid = ref(false)
const formRef = ref<any>(null)

const form = reactive({
  productId: (props.product?.id ?? null) as number | null,
  warehouseId: (props.warehouseId ?? (props.warehouses.length === 1 ? props.warehouses[0].id : null)) as number | null,
  toWarehouseId: null as number | null,
  quantity: "" as number | string,
  /** Entries: what each unit cost. Starts as the product's current cost. */
  unitCost: "" as number | string,
  expiryDate: "",
  lotNumber: "",
  notes: "",
})

// ------------------------------------------------------------------ derived state

// Set by the product picker; its unit decides the quantity rules and suffix.
const selectedProduct = ref<ProductOption | null>(props.product ?? null)
const unitShortLabel = computed(() => (selectedProduct.value ? getUnitShortLabel(selectedProduct.value.unit) : ""))

const isTracked = computed(() => selectedProduct.value?.tracksExpiry === true)

// The cost of an entry starts as the product's current cost, until the user types another.
const unitCostTouched = ref(false)
watch(
  selectedProduct,
  (product) => {
    if (props.mode !== "entry" || unitCostTouched.value) return
    form.unitCost = product?.costPrice ?? ""
  },
  { immediate: true }
)
watch(
  () => form.unitCost,
  (value) => {
    if (value !== (selectedProduct.value?.costPrice ?? "")) unitCostTouched.value = true
  }
)

const unitCostRules = [
  (v: number | string | null) => v === "" || v === null || Number(v) >= 0 || "No puede ser negativo",
  (v: number | string | null) => v === "" || v === null || /^\d+(\.\d{1,4})?$/.test(String(v)) || "Máximo 4 decimales",
]

/** Local "today" as yyyy-mm-dd (toISOString would give the UTC day, which can be tomorrow in the evening). */
const today = (() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})()

const notInThePast = (value: string) => !value || value >= today || "La fecha de vencimiento no puede estar en el pasado"

const destinationWarehouses = computed(() =>
  props.warehouses.filter((warehouse) => warehouse.id !== form.warehouseId)
)

const differentWarehouse = (value: number | null) =>
  value === null || value !== form.warehouseId || "El destino debe ser distinto del origen"

const WHOLE_UNITS = ["UNIT", "BOX", "PACK", "DOZEN"]

const quantityRules = computed(() => {
  const checks: Array<(value: string | number | null) => true | string> = [
    (v) => (v !== "" && v !== null) || "Este campo es requerido",
    (v) => Number.isFinite(Number(v)) || "Debe ser un número válido",
    (v) =>
      props.mode === "adjustment"
        ? Number(v) >= 0 || "Debe ser mayor o igual a 0"
        : Number(v) > 0 || "Debe ser mayor a 0",
    (v) => /^\d+(\.\d{1,3})?$/.test(String(v)) || "Máximo 3 decimales",
    (v) =>
      !(selectedProduct.value && WHOLE_UNITS.includes(selectedProduct.value.unit)) ||
      Number.isInteger(Number(v)) ||
      "Este producto se cuenta en unidades enteras",
  ]
  return checks
})

// Current stock of the chosen product, to guide adjustments and transfers.
const currentStock = ref<number | null>(null)
const showCurrentStock = computed(
  () => (props.mode === "adjustment" || props.mode === "transfer" || props.mode === "exit") &&
    !!form.productId && !!form.warehouseId
)

watch(
  () => [form.productId, form.warehouseId] as const,
  async ([productId, warehouseId]) => {
    currentStock.value = null
    if (!productId || !warehouseId) return
    const quantity = await stockStore.fetchQuantity(productId, warehouseId)
    // Ignore a late answer for a selection the user has already changed.
    if (form.productId === productId && form.warehouseId === warehouseId) {
      currentStock.value = quantity
    }
  },
  { immediate: true }
)

const currentStockLabel = computed(() => {
  if (currentStock.value === null) return "…"
  return `${formatQuantity(currentStock.value)} ${unitShortLabel.value}`.trim()
})

const difference = computed<number | null>(() => {
  if (props.mode !== "adjustment" || currentStock.value === null || form.quantity === "") return null
  const counted = Number(form.quantity)
  return Number.isFinite(counted) ? counted - currentStock.value : null
})

const differenceLabel = computed(() => {
  if (difference.value === null) return ""
  const sign = difference.value > 0 ? "+" : ""
  return `${sign}${formatQuantity(difference.value)} ${unitShortLabel.value}`.trim()
})

const differenceColor = computed(() => {
  if (difference.value === null || difference.value === 0) return "default"
  return difference.value > 0 ? "success" : "error"
})

/**
 * A lot (date + number) is asked for when stock comes in for a product that controls expiry. Counts of such a
 * product are made lot by lot (see the lot picker), so they don't use these fields.
 */
const needsLot = computed(() => isTracked.value && props.mode === "entry")

// The company may allow stock to go below zero (setting). Then a quantity above what the lots hold is accepted:
// the excess leaves without a lot and the stock ends up negative.
const allowNegative = computed(() => companyStore.settings.allowNegativeStock === true)
onMounted(() => {
  companyStore.fetchSettings()
})

// ------------------------------------------------------------------ lots (exits and transfers of tracked products)

interface LotRow {
  key: string
  /** Set when the row is a purchase (cost layer) instead of a lot. */
  layerId?: number
  unitCost?: number
  receivedAt?: string
  /** null = the units without an expiry date */
  lotId: number | null
  lotNumber: string
  expiryDate: string | null
  daysToExpiry: number | null
  available: number
  take: number | string
}

const lotRows = ref<LotRow[]>([])
const lotsLoading = ref(false)
/** Once the user edits a lot, the lots decide the quantity; until then the quantity decides the split. */
const lotsTouched = ref(false)

const isCount = computed(() => props.mode === "adjustment")

/**
 * Who decides what leaves on an exit or a transfer. With the company setting on "Lo elijo yo" the user always picks (the
 * lot of a product with expiry, the purchase of one without). With "Automático" nothing is asked: the lot that expires
 * first / the oldest purchase leaves, unless the user opens the picker for this one operation ("Elegir manualmente").
 * A count is different: it is lot-by-lot because that is what is being counted, not a choice of what leaves.
 */
const manualPick = ref(false)
const pickerEnabled = computed(() => companyStore.settings.costMethod === "MANUAL" || manualPick.value)

const isOutflow = computed(() => props.mode === "exit" || props.mode === "transfer")

const showLotPicker = computed(
  () =>
    isTracked.value &&
    !!form.productId &&
    !!form.warehouseId &&
    (isCount.value || (isOutflow.value && pickerEnabled.value))
)

/**
 * A product WITHOUT expiry control, when the company chooses the purchase of every exit (cost method MANUAL): the
 * rows are the purchases still in the warehouse, each with what it cost.
 */
const isLayerMode = computed(
  () =>
    !isTracked.value &&
    isOutflow.value &&
    pickerEnabled.value &&
    !!form.productId &&
    !!form.warehouseId
)

/** Automatic mode, nothing picked: a line says what will leave and offers to choose by hand. */
const showAutoNotice = computed(
  () => isOutflow.value && !pickerEnabled.value && !!form.productId && !!form.warehouseId
)

// A manual choice belongs to one product: start automatic again when the product changes.
watch(
  () => form.productId,
  () => {
    manualPick.value = false
  }
)

/** Either way the user sees a list of what the quantity comes from, and can change it. */
const showPicker = computed(() => showLotPicker.value || isLayerMode.value)

/** A count of a tracked product: what was counted in each lot, and the total is their sum. */
const countByLots = computed(() => isCount.value && showLotPicker.value)

// Lots found in the count that the system didn't have.
interface NewLotRow {
  key: string
  expiryDate: string
  lotNumber: string
  quantity: number | string
}
const newLots = ref<NewLotRow[]>([])
let newLotSeq = 0
const addNewLot = () => {
  newLots.value.push({ key: `new-${++newLotSeq}`, expiryDate: "", lotNumber: "", quantity: "" })
}
const removeNewLot = (key: string) => {
  newLots.value = newLots.value.filter((lot) => lot.key !== key)
}
const newLotQuantityRules = [
  (v: number | string | null) => (v !== "" && v !== null) || "Este campo es requerido",
  (v: number | string | null) => Number(v) > 0 || "Debe ser mayor a 0",
  (v: number | string | null) => /^\d+(\.\d{1,3})?$/.test(String(v)) || "Máximo 3 decimales",
  (v: number | string | null) =>
    !(selectedProduct.value && WHOLE_UNITS.includes(selectedProduct.value.unit)) ||
    Number.isInteger(Number(v)) ||
    "Este producto se cuenta en unidades enteras",
]

const round3 = (n: number) => Math.round(n * 1000) / 1000

/** The quantity split over the lots, earliest expiry first (the rows already come in that order). */
const autoDistribute = () => {
  let remaining = Number(form.quantity)
  if (!Number.isFinite(remaining) || remaining < 0) remaining = 0

  lotRows.value.forEach((row) => {
    const take = Math.min(remaining, row.available)
    row.take = take > 0 ? round3(take) : ""
    remaining = round3(remaining - take)
  })
}

const sumOfTakes = () => round3(lotRows.value.reduce((sum, row) => sum + (Number(row.take) || 0), 0))

/** Units asked for beyond what the lots hold, when the company allows negative stock (only while the split is automatic). */
const overflow = computed(() => {
  if (!allowNegative.value || isCount.value || lotsTouched.value || !showPicker.value) return 0
  const quantity = Number(form.quantity)
  if (!Number.isFinite(quantity)) return 0
  return Math.max(0, round3(quantity - sumOfTakes()))
})

const onQuantityInput = () => {
  // The user typed a quantity: back to "the ones that expire first", shown in the rows.
  // (In a count the quantity is the sum of the lots, never typed.)
  if (!showPicker.value || isCount.value) return
  lotsTouched.value = false
  autoDistribute()
}

const onTakeInput = () => {
  // In a count the total follows the lots by itself (see countedTotal).
  if (isCount.value) return

  // The user edited a lot: from now on the lots add up to the quantity.
  lotsTouched.value = true
  const total = sumOfTakes()
  form.quantity = total > 0 ? total : ""
}

const resetLots = () => {
  lotsTouched.value = false
  autoDistribute()
}

/** How much a count changes the lot: counted minus what the system has. */
const rowDifference = (row: LotRow) => round3((Number(row.take) || 0) - row.available)

/** The total of a count: every lot as counted plus the lots found. */
const countedTotal = computed(() =>
  round3(
    lotRows.value.reduce((sum, row) => sum + (Number(row.take) || 0), 0) +
      newLots.value.reduce((sum, lot) => sum + (Number(lot.quantity) || 0), 0)
  )
)

watch(countedTotal, (total) => {
  if (countByLots.value) form.quantity = total
})

const lotTakeRules = (row: LotRow) => [
  (v: number | string | null) => !isCount.value || (v !== "" && v !== null) || "Indica lo que contaste",
  (v: number | string | null) => v === "" || v === null || Number(v) >= 0 || "No puede ser negativo",
  (v: number | string | null) => v === "" || v === null || /^\d+(\.\d{1,3})?$/.test(String(v)) || "Máximo 3 decimales",
  (v: number | string | null) =>
    isCount.value || v === "" || v === null || Number(v) <= row.available || (allowNegative.value
      ? `Un lote no puede quedar en negativo (tiene ${formatQuantity(row.available)}). Escribe el total arriba y el resto saldrá sin lote.`
      : `Este lote solo tiene ${formatQuantity(row.available)}`),
  (v: number | string | null) =>
    v === "" ||
    v === null ||
    !(selectedProduct.value && WHOLE_UNITS.includes(selectedProduct.value.unit)) ||
    Number.isInteger(Number(v)) ||
    "Este producto se cuenta en unidades enteras",
]

// Load the lots when the product and the (origin) warehouse are known, and whenever they change.
watch(
  () => [showPicker.value, isLayerMode.value, form.productId, form.warehouseId] as const,
  async ([visible, layerMode, productId, warehouseId]) => {
    lotRows.value = []
    newLots.value = []
    lotsTouched.value = false
    lotsLoading.value = false
    if (!visible || !productId || !warehouseId) return

    lotsLoading.value = true

    if (layerMode) {
      const layers = await stockStore.fetchCostLayers(productId, warehouseId)
      if (form.productId !== productId || form.warehouseId !== warehouseId) return
      lotsLoading.value = false
      lotRows.value = layers.map((layer) => ({
        key: `layer-${layer.id}`,
        layerId: layer.id,
        unitCost: layer.unitCost,
        receivedAt: layer.receivedAt,
        lotId: null,
        lotNumber: "",
        expiryDate: null,
        daysToExpiry: null,
        available: layer.quantity,
        take: "",
      }))
      autoDistribute()
      return
    }

    const [lots, stock] = await Promise.all([
      stockStore.fetchLotsOf(productId, warehouseId),
      stockStore.fetchQuantity(productId, warehouseId),
    ])
    // Ignore a late answer for a selection the user has already changed.
    if (form.productId !== productId || form.warehouseId !== warehouseId) return
    lotsLoading.value = false

    const rows: LotRow[] = lots.map((lot) => ({
      key: `lot-${lot.id}`,
      lotId: lot.id,
      lotNumber: lot.lotNumber ?? "",
      expiryDate: lot.expiryDate,
      daysToExpiry: lot.daysToExpiry,
      available: lot.quantity,
      take: isCount.value ? lot.quantity : "",
    }))

    // Stock that predates expiry control has no lot: it still exists and can be taken, last.
    const withoutDate = round3(stock - lots.reduce((sum, lot) => sum + lot.quantity, 0))
    if (withoutDate > 0) {
      rows.push({
        key: "no-date",
        lotId: null,
        lotNumber: "",
        expiryDate: null,
        daysToExpiry: null,
        available: withoutDate,
        take: isCount.value ? withoutDate : "",
      })
    }

    lotRows.value = rows
    if (isCount.value) form.quantity = countedTotal.value
    else autoDistribute()
  },
  { immediate: true }
)

/**
 * The lots to send. Only when they add up to the quantity: if the user asks for more than there is, the lots are left
 * out and the server answers with its own "stock insuficiente" instead of a confusing sum error.
 */
/** The purchases to send (cost method MANUAL): what the user assigned, never more than the quantity. */
const layerPicks = (quantity: number): StockLayerPick[] | undefined => {
  if (!isLayerMode.value) return undefined
  const picks = lotRows.value
    .filter((row) => row.layerId !== undefined && Number(row.take) > 0)
    .map((row) => ({ layerId: row.layerId as number, quantity: Number(row.take) }))
  const total = round3(picks.reduce((sum, pick) => sum + pick.quantity, 0))
  return picks.length > 0 && total <= round3(quantity) ? picks : undefined
}

const lotPicks = (quantity: number): StockLotPick[] | undefined => {
  if (!showLotPicker.value) return undefined
  const picks: StockLotPick[] = lotRows.value
    .filter((row) => Number(row.take) > 0)
    .map((row) => ({ lotId: row.lotId, quantity: Number(row.take) }))
  // With negative stock allowed, what the lots can't cover leaves without a lot (the stock goes below zero).
  if (overflow.value > 0) picks.push({ lotId: null, quantity: overflow.value })
  const total = round3(picks.reduce((sum, pick) => sum + pick.quantity, 0))
  return picks.length > 0 && total === round3(quantity) ? picks : undefined
}

const sectionTitle = computed(() => {
  switch (props.mode) {
    case "entry": return "Ingreso de stock"
    case "exit": return "Salida de stock"
    case "adjustment": return "Conteo físico"
    case "transfer": return "Transferencia"
  }
})

const sectionSubtitle = computed(() => {
  switch (props.mode) {
    case "entry": return "Suma unidades al almacén elegido"
    case "exit": return "Resta unidades del almacén (consumo, merma, venta...)"
    case "adjustment": return "Indica lo que contaste: el stock se ajusta a ese valor y queda registrada la diferencia"
    case "transfer": return "Mueve stock de un almacén a otro en una sola operación"
  }
})

const quantityLabel = computed(() => (props.mode === "adjustment" ? "Cantidad contada" : "Cantidad"))

const submitLabel = computed(() => {
  switch (props.mode) {
    case "entry": return "Registrar ingreso"
    case "exit": return "Registrar salida"
    case "adjustment": return "Aplicar ajuste"
    case "transfer": return "Transferir"
  }
})

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  const notes = form.notes.trim() || null
  const productId = form.productId as number
  const warehouseId = form.warehouseId as number
  const quantity = Number(form.quantity)
  const expiryDate = needsLot.value ? form.expiryDate || null : null
  const lotNumber = needsLot.value ? form.lotNumber.trim() || null : null

  switch (props.mode) {
    case "entry":
      emit("submit", {
        kind: "entry",
        body: {
          warehouseId,
          productId,
          quantity,
          expiryDate,
          lotNumber,
          unitCost: form.unitCost === "" ? null : Number(form.unitCost),
          notes,
        },
      })
      break
    case "exit":
      emit("submit", {
        kind: "exit",
        body: { warehouseId, productId, quantity, lots: lotPicks(quantity), layers: layerPicks(quantity), notes },
      })
      break
    case "adjustment":
      emit("submit", {
        kind: "adjustment",
        body: countByLots.value
          ? {
              warehouseId,
              productId,
              countedQuantity: quantity,
              lotCounts: lotRows.value.map((row) => ({ lotId: row.lotId, countedQuantity: Number(row.take) || 0 })),
              newLots: newLots.value.map((lot) => ({
                expiryDate: lot.expiryDate,
                lotNumber: lot.lotNumber.trim() || null,
                quantity: Number(lot.quantity),
              })),
              notes,
            }
          : { warehouseId, productId, countedQuantity: quantity, expiryDate, lotNumber, notes },
      })
      break
    case "transfer":
      emit("submit", {
        kind: "transfer",
        body: {
          fromWarehouseId: warehouseId,
          toWarehouseId: form.toWarehouseId as number,
          productId,
          quantity,
          lots: lotPicks(quantity),
          layers: layerPicks(quantity),
          notes,
        },
      })
      break
  }
}
</script>

<style scoped>
.lot-picker {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.85rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.6);
}

.auto-notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  padding: 0.6rem 0.85rem;
  border: 1px dashed rgba(var(--v-border-color), 0.4);
  border-radius: 12px;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.lot-picker__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.lot-picker__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.lot-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
}

.lot-row__info {
  flex: 1 1 180px;
  min-width: 0;
  padding-top: 0.35rem;
}

.lot-row__input {
  flex: 0 0 160px;
}

.lot-row__warn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: rgb(var(--v-theme-warning));
}

.lot-row__diff {
  flex: none;
  margin-top: 0.7rem;
}

.lot-new {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.5rem 0.75rem;
}

.lot-new > :nth-child(-n + 3) {
  flex: 1 1 140px;
  min-width: 0;
}
</style>
