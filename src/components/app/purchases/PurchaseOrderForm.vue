<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection title="Datos de la orden" subtitle="A quién se le compra y dónde se recibirá">
      <v-row dense>
        <v-col cols="12" md="6">
          <v-autocomplete
            v-model="form.supplierId"
            v-bind="autocomplete"
            :items="suppliers"
            item-title="name"
            item-value="id"
            label="Proveedor"
            :rules="[rules.required]"
            no-data-text="No hay proveedores activos"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-select
            v-model="form.warehouseId"
            v-bind="select"
            :items="warehouses"
            item-title="name"
            item-value="id"
            label="Almacén de destino"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.expectedDate"
            v-bind="field"
            label="Fecha esperada de entrega (opcional)"
            type="date"
            :min="today"
            :rules="[expectedDateRule]"
          />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="form.notes"
            v-bind="textarea"
            label="Notas (opcional)"
            rows="2"
            :rules="[rules.maxLength(1000)]"
          />
        </v-col>
      </v-row>
    </AppFormSection>

    <AppFormSection
      title="Productos"
      subtitle="Pide por unidades o por paquetes, y escribe el precio como te lo den: el sistema calcula cuántas unidades entran y cuánto cuesta cada una"
    >
      <v-alert
        v-if="showEmptyError"
        type="error"
        variant="tonal"
        density="compact"
        rounded="lg"
        :icon="APP_ICONS.error"
      >
        Agrega al menos un producto a la orden.
      </v-alert>

      <div v-for="(line, index) in form.lines" :key="line.key" class="po-line">
        <v-row dense align="start">
          <v-col cols="10" md="11">
            <ProductPicker
              v-model="line.productId"
              :initial="line.product"
              :rules="[rules.required]"
              @select="onProductSelected(line, $event)"
            />
          </v-col>
          <v-col cols="2" md="1" class="d-flex justify-end">
            <v-btn
              icon
              variant="text"
              color="error"
              size="small"
              aria-label="Quitar producto"
              :disabled="form.lines.length === 1"
              @click="removeLine(index)"
            >
              <v-icon :icon="APP_ICONS.delete" />
            </v-btn>
          </v-col>
        </v-row>

        <!-- A soft notice, not an error: repeating a product is fine (another price or way of buying). -->
        <div v-if="isRepeated(line)" class="po-line__repeat">
          <v-icon size="14">{{ APP_ICONS.warning }}</v-icon>
          Este producto ya está en otra línea de la orden. Está bien si lo compras a otro precio o de otra forma; si no,
          junta las cantidades en una sola línea.
        </div>

        <!-- How much arrives: loose units, or packages (+ loose units on top). -->
        <div class="po-line__block">
          <div class="po-line__label">¿Cuánto pides?</div>
          <v-btn-toggle
            v-model="line.qtyMode"
            mandatory
            divided
            variant="outlined"
            color="primary"
            density="comfortable"
            rounded="lg"
            @update:model-value="onQtyModeChange(line)"
          >
            <v-btn value="units" class="text-none">En unidades</v-btn>
            <v-btn value="packs" class="text-none">Por paquetes</v-btn>
          </v-btn-toggle>

          <v-row dense class="mt-2">
            <template v-if="line.qtyMode === 'units'">
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="line.quantity"
                  v-bind="field"
                  label="Unidades"
                  type="number"
                  min="0"
                  step="any"
                  :suffix="line.product ? getUnitShortLabel(line.product.unit) : ''"
                  :rules="quantityRules(line)"
                />
              </v-col>
            </template>
            <template v-else>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="line.packs"
                  v-bind="field"
                  label="Paquetes"
                  type="number"
                  min="0"
                  step="1"
                  :rules="packsRules"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="line.packSize"
                  v-bind="field"
                  label="Unidades por paquete"
                  type="number"
                  min="0"
                  step="1"
                  :rules="packSizeRules"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="line.extraUnits"
                  v-bind="field"
                  label="Sueltas adicionales"
                  type="number"
                  min="0"
                  step="any"
                  hint="Las que pides además de los paquetes"
                  persistent-hint
                  :rules="extraRules(line)"
                />
              </v-col>
            </template>
          </v-row>
        </div>

        <!-- What they charge: per unit, per package or for everything. -->
        <div class="po-line__block">
          <div class="po-line__label">¿Cómo te dieron el precio?</div>
          <v-btn-toggle
            v-model="line.priceMode"
            mandatory
            divided
            variant="outlined"
            color="primary"
            density="comfortable"
            rounded="lg"
          >
            <v-btn value="unit" class="text-none">Por unidad</v-btn>
            <v-btn value="pack" class="text-none" :disabled="line.qtyMode !== 'packs'">Por paquete</v-btn>
            <v-btn value="total" class="text-none">Total pagado</v-btn>
          </v-btn-toggle>

          <v-row dense class="mt-2">
            <v-col cols="12" sm="4">
              <v-text-field
                v-if="line.priceMode === 'unit'"
                v-model="line.unitCost"
                v-bind="field"
                label="Costo por unidad"
                type="number"
                min="0"
                step="any"
                prefix="S/"
                :rules="[rules.required, rules.nonNegative, rules.maxDecimals(4)]"
              />
              <v-text-field
                v-else-if="line.priceMode === 'pack'"
                v-model="line.packPrice"
                v-bind="field"
                label="Precio por paquete"
                type="number"
                min="0"
                step="any"
                prefix="S/"
                :rules="packPriceRules"
              />
              <v-text-field
                v-else
                v-model="line.totalPaid"
                v-bind="field"
                label="Total pagado por esta línea"
                type="number"
                min="0"
                step="any"
                prefix="S/"
                :rules="[rules.required, rules.nonNegative, rules.maxDecimals(4)]"
              />
            </v-col>
          </v-row>
        </div>

        <!-- What the system will record: always in the product's unit. -->
        <div class="po-line__summary" :class="{ 'po-line__summary--error': showLineIssues && lineIssue(line) }">
          <template v-if="showLineIssues && lineIssue(line)">{{ lineIssue(line) }}</template>
          <template v-else-if="unitsOf(line) > 0">
            Entran <strong>{{ formatQuantity(unitsOf(line)) }} {{ line.product ? getUnitShortLabel(line.product.unit) : "" }}</strong>
            a <strong>{{ formatMoney(unitCostOf(line)) }}</strong> cada una ·
            Subtotal <strong>{{ formatMoney(lineTotal(line)) }}</strong>
          </template>
          <template v-else>Indica cuánto pides y el precio para ver el costo de cada unidad.</template>
        </div>
      </div>

      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <v-btn
          variant="tonal"
          rounded="lg"
          :prepend-icon="APP_ICONS.plus"
          class="text-none"
          @click="addLine"
        >
          Agregar producto
        </v-btn>

        <div class="text-h6 app-font-heading">
          Total: {{ formatMoney(orderTotal) }}
        </div>
      </div>
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
import type { Supplier } from "~/interfaces/supplierInterfaces"
import type { Warehouse } from "~/interfaces/warehouseInterfaces"
import type { ProductOption } from "~/interfaces/productInterfaces"
import type { PurchaseOrder, PurchaseOrderRequest } from "~/interfaces/purchaseOrderInterfaces"
import { getUnitShortLabel } from "~/interfaces/productInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { validationRules as rules } from "~/helpers/validationFormRules"
import { formatMoney, formatQuantity, todayIso } from "~/helpers/formatHelpers"

const props = withDefaults(
  defineProps<{
    /** The order being edited; omit to create a new one. */
    order?: PurchaseOrder | null
    suppliers: Supplier[]
    warehouses: Warehouse[]
    submitLabel?: string
  }>(),
  { order: null, submitLabel: "Guardar orden" }
)

const emit = defineEmits<{
  (e: "submit", payload: PurchaseOrderRequest): void
}>()

const { field, select, textarea, autocomplete } = useFormFields()

const isValid = ref(false)
const formRef = ref<any>(null)
const showEmptyError = ref(false)

interface LineForm {
  key: number
  productId: number | null
  product: ProductOption | null
  /** How the quantity is entered: loose units, or packages (+ loose units). */
  qtyMode: "units" | "packs"
  quantity: number | string
  packs: number | string
  packSize: number | string
  extraUnits: number | string
  /** How the price was given: per unit, per package or the total of the line. */
  priceMode: "unit" | "pack" | "total"
  unitCost: number | string
  packPrice: number | string
  totalPaid: number | string
}

// Helpers first: restoring a saved line (below) already needs them when the form is created.
const round = (n: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

const num = (value: number | string) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** The units that arrive, in the product's own unit: typed directly, or packages x units per package + loose ones. */
const unitsOf = (line: LineForm) =>
  line.qtyMode === "units"
    ? num(line.quantity)
    : round(num(line.packs) * num(line.packSize) + num(line.extraUnits), 3)

/**
 * What each unit cost. The price can be given per unit, per package (then it is divided by the units in a package;
 * loose units cost the same per unit) or as the total of the line (divided by all the units). Four decimals, which
 * is what the system stores.
 */
const unitCostOf = (line: LineForm) => {
  if (line.priceMode === "unit") return num(line.unitCost)
  if (line.priceMode === "pack") {
    const size = num(line.packSize)
    return size > 0 ? round(num(line.packPrice) / size, 4) : 0
  }
  const units = unitsOf(line)
  return units > 0 ? round(num(line.totalPaid) / units, 4) : 0
}

let nextKey = 1
const newLine = (partial: Partial<LineForm> = {}): LineForm => ({
  key: nextKey++,
  productId: null,
  product: null,
  qtyMode: "units",
  quantity: "",
  packs: "",
  packSize: "",
  extraUnits: "",
  priceMode: "unit",
  unitCost: "",
  packPrice: "",
  totalPaid: "",
  ...partial,
})

/**
 * How a saved line was entered (packages, loose units, how the price was given), read back from what the form stored.
 * It is only trusted when it still adds up to the saved quantity and cost; otherwise the line comes back as plain
 * units and a unit price, which is always correct.
 */
const restoreEntry = (raw: string | null | undefined, quantity: number, unitCost: number): Partial<LineForm> => {
  if (!raw) return {}
  try {
    const d = JSON.parse(raw)
    const qtyMode: LineForm["qtyMode"] = d.qtyMode === "packs" ? "packs" : "units"
    let priceMode: LineForm["priceMode"] = ["unit", "pack", "total"].includes(d.priceMode) ? d.priceMode : "unit"
    if (qtyMode === "units" && priceMode === "pack") priceMode = "unit"

    const restored: Partial<LineForm> = {
      qtyMode,
      packs: d.packs ?? "",
      packSize: d.packSize ?? "",
      extraUnits: d.extraUnits ?? "",
      priceMode,
      packPrice: d.packPrice ?? "",
      totalPaid: d.totalPaid ?? "",
    }

    const probe = newLine({ ...restored, quantity, unitCost })
    const sameUnits = Math.abs(unitsOf(probe) - quantity) < 0.0005
    const sameCost = Math.abs(unitCostOf(probe) - unitCost) < 0.00015
    return sameUnits && sameCost ? restored : {}
  } catch {
    return {}
  }
}

const initialLines = (): LineForm[] => {
  if (!props.order?.lines?.length) return [newLine()]

  return props.order.lines.map((line) =>
    newLine({
      productId: line.productId,
      product: {
        id: line.productId,
        name: line.productName ?? "",
        sku: line.productSku,
        unit: line.unit ?? "UNIT",
      },
      quantity: line.quantity,
      unitCost: line.unitCost,
      ...restoreEntry(line.entryInput, line.quantity, line.unitCost),
    })
  )
}

const form = reactive({
  supplierId: (props.order?.supplierId ?? null) as number | null,
  warehouseId: (props.order?.warehouseId ??
    (props.warehouses.length === 1 ? props.warehouses[0].id : null)) as number | null,
  expectedDate: props.order?.expectedDate ?? "",
  notes: props.order?.notes ?? "",
  lines: initialLines(),
})

const today = todayIso()

// From today on. An existing draft that already carries an older date can still be saved with that same date
// (so editing its lines isn't blocked); picking a different date follows the rule.
const expectedDateRule = (value: string) =>
  !value ||
  value >= today ||
  value === (props.order?.expectedDate ?? null) ||
  "La fecha de entrega no puede ser anterior a hoy"

// ------------------------------------------------------------------ lines

const addLine = () => {
  form.lines.push(newLine())
  showEmptyError.value = false
}

const removeLine = (index: number) => {
  if (form.lines.length > 1) form.lines.splice(index, 1)
}

const onProductSelected = (line: LineForm, product: ProductOption | null) => {
  line.product = product
  // Offer the product's current cost as a starting point; the user types the price actually agreed.
  if (product && line.unitCost === "" && product.costPrice !== undefined) {
    line.unitCost = product.costPrice
  }
}

/** True when another line of the order has the same product (only to show the notice above). */
const isRepeated = (line: LineForm) =>
  !!line.productId && form.lines.filter((other) => other.productId === line.productId).length > 1

const WHOLE_UNITS = ["UNIT", "BOX", "PACK", "DOZEN"]

const quantityRules = (line: LineForm) => [
  (v: number | string | null) => (v !== "" && v !== null) || "Este campo es requerido",
  (v: number | string | null) => Number(v) > 0 || "Debe ser mayor a 0",
  (v: number | string | null) => /^\d+(\.\d{1,3})?$/.test(String(v)) || "Máximo 3 decimales",
  (v: number | string | null) =>
    !(line.product && WHOLE_UNITS.includes(line.product.unit)) ||
    Number.isInteger(Number(v)) ||
    "Este producto se cuenta en unidades enteras",
]

/** How the line was bought, in words, so the order shows it later ("1 paquete de 12 + 6 sueltas · total S/ 45"). */
const packagingText = (line: LineForm): string | null => {
  const parts: string[] = []
  if (line.qtyMode === "packs") {
    const packs = num(line.packs)
    const extra = num(line.extraUnits)
    const bought: string[] = []
    if (packs > 0) bought.push(`${packs} ${packs === 1 ? "paquete" : "paquetes"} de ${num(line.packSize)}`)
    if (extra > 0) bought.push(`${extra} ${extra === 1 ? "suelta" : "sueltas"}`)
    parts.push(bought.join(" + "))
  }
  if (line.priceMode === "pack") parts.push(`S/ ${num(line.packPrice)} por paquete`)
  if (line.priceMode === "total") parts.push(`total S/ ${num(line.totalPaid)}`)
  const text = parts.filter(Boolean).join(" · ")
  return text || null
}

const onQtyModeChange = (line: LineForm) => {
  // A price per package only makes sense when buying packages.
  if (line.qtyMode === "units" && line.priceMode === "pack") line.priceMode = "unit"
}

// ------------------------------------------------------------------ rules of the package fields

// Rules of a single field look only at that field. What depends on several fields (units > 0, package size when
// buying packages...) is checked by lineIssue(), because a field is only re-validated when its own value changes
// and would keep a stale error.
const packsRules = [
  (v: number | string | null) => v === "" || v === null || (Number.isInteger(Number(v)) && Number(v) >= 0) || "Debe ser un número entero",
]
const packSizeRules = [
  (v: number | string | null) => v === "" || v === null || (Number.isInteger(Number(v)) && Number(v) > 0) || "Debe ser un número entero mayor a 0",
]
const extraRules = (line: LineForm) => [
  (v: number | string | null) => v === "" || v === null || Number(v) >= 0 || "No puede ser negativo",
  (v: number | string | null) => v === "" || v === null || /^\d+(\.\d{1,3})?$/.test(String(v)) || "Máximo 3 decimales",
  (v: number | string | null) =>
    v === "" ||
    v === null ||
    !(line.product && WHOLE_UNITS.includes(line.product.unit)) ||
    Number.isInteger(Number(v)) ||
    "Este producto se cuenta en unidades enteras",
]
const packPriceRules = [rules.required, rules.nonNegative, rules.maxDecimals(4)]

/** What is wrong with a line as a whole, or null. */
const lineIssue = (line: LineForm): string | null => {
  if (unitsOf(line) <= 0) return "Indica al menos una unidad"
  if (line.qtyMode === "packs" && num(line.packs) > 0 && num(line.packSize) <= 0) {
    return "Indica cuántas unidades trae cada paquete"
  }
  if (line.priceMode === "pack" && num(line.packSize) <= 0) {
    return "Indica cuántas unidades trae el paquete para calcular el costo"
  }
  return null
}

// Shown once the user tries to save, and then kept up to date as they fix the lines.
const showLineIssues = ref(false)

/** The line exactly as the user entered it, so editing the draft brings back packages, extras and the price mode. */
const entryInputOf = (line: LineForm): string | null => {
  if (line.qtyMode === "units" && line.priceMode === "unit") return null
  return JSON.stringify({
    qtyMode: line.qtyMode,
    packs: line.packs,
    packSize: line.packSize,
    extraUnits: line.extraUnits,
    priceMode: line.priceMode,
    packPrice: line.packPrice,
    totalPaid: line.totalPaid,
  })
}

/** Each line is rounded to cents before adding up, the same way the server does. */
const lineTotal = (line: LineForm) => round(unitsOf(line) * unitCostOf(line), 2)

const orderTotal = computed(() => form.lines.reduce((sum, line) => sum + lineTotal(line), 0))

// ------------------------------------------------------------------ submit

const onSubmit = async () => {
  showEmptyError.value = form.lines.length === 0
  const result = await formRef.value?.validate()
  showLineIssues.value = true
  if (!result?.valid || form.lines.length === 0 || form.lines.some((line) => lineIssue(line))) return

  emit("submit", {
    supplierId: form.supplierId as number,
    warehouseId: form.warehouseId as number,
    expectedDate: form.expectedDate || null,
    notes: form.notes.trim() || null,
    lines: form.lines.map((line) => ({
      productId: line.productId as number,
      quantity: unitsOf(line),
      unitCost: unitCostOf(line),
      packaging: packagingText(line),
      entryInput: entryInputOf(line),
    })),
  })
}
</script>

<style scoped>
.po-line {
  padding: 0.75rem 0.75rem 0.25rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.6);
}

.po-line__repeat {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: rgb(var(--v-theme-warning));
}

.po-line__block {
  margin-bottom: 0.9rem;
}

.po-line__label {
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.po-line__summary--error {
  color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.08);
}

.po-line__summary {
  margin-bottom: 0.75rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.08);
}
</style>
