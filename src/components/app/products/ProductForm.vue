<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection title="Identificación" subtitle="Cómo se reconoce el producto en el catálogo">
      <v-row dense>
        <v-col cols="12">
          <v-text-field
            v-model="form.name"
            v-bind="field"
            label="Nombre"
            :rules="[rules.required, rules.maxLength(150)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.sku"
            v-bind="field"
            :label="fieldLabel('SKU', requireSku)"
            hint="Código interno, único por empresa"
            persistent-hint
            :rules="[...(requireSku ? [rules.required] : []), rules.maxLength(50)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.barcode"
            v-bind="field"
            :label="fieldLabel('Código de barras', requireBarcode)"
            :rules="[...(requireBarcode ? [rules.required] : []), rules.maxLength(50)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-autocomplete
            v-model="form.categoryId"
            v-bind="autocomplete"
            :items="categories"
            item-title="name"
            item-value="id"
            :label="fieldLabel('Categoría', requireCategory)"
            :clearable="!requireCategory"
            :rules="requireCategory ? [rules.required] : []"
            no-data-text="Sin categorías"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="form.unit"
            v-bind="select"
            :items="UNIT_OPTIONS"
            label="Unidad de medida"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="form.description"
            v-bind="textarea"
            label="Descripción (opcional)"
            rows="3"
            :rules="[rules.maxLength(2000)]"
          />
        </v-col>
      </v-row>
    </AppFormSection>

    <AppFormSection title="Precios" subtitle="El margen se calcula con el costo y el precio de venta">
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.costPrice"
            v-bind="field"
            label="Precio de costo"
            type="number"
            min="0"
            step="any"
            prefix="S/"
            :rules="[rules.required, rules.nonNegative, rules.maxDecimals(4)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.salePrice"
            v-bind="field"
            label="Precio de venta"
            type="number"
            min="0"
            step="any"
            prefix="S/"
            :rules="[rules.required, rules.nonNegative, rules.maxDecimals(2)]"
          />
        </v-col>
        <v-col cols="12">
          <v-chip :color="marginColor" variant="tonal" size="large" rounded="lg">
            Margen: {{ marginLabel }}
          </v-chip>
        </v-col>
      </v-row>
    </AppFormSection>

    <AppFormSection title="Inventario" subtitle="Parámetros de control de stock">
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.minStock"
            v-bind="field"
            label="Stock mínimo"
            type="number"
            min="0"
            step="any"
            hint="Umbral para alertas de stock bajo"
            persistent-hint
            :suffix="unitShortLabel"
            :rules="[rules.required, rules.nonNegative, rules.maxDecimals(3)]"
          />
        </v-col>
        <v-col cols="12" sm="6" class="d-flex align-center">
          <v-switch
            v-model="form.isActive"
            color="primary"
            label="Producto activo"
            hide-details
            inset
          />
        </v-col>
        <v-col cols="12">
          <v-switch
            v-model="form.tracksExpiry"
            color="primary"
            label="Controla fecha de vencimiento"
            hint="Los ingresos piden fecha de vencimiento y las salidas descuentan primero lo que vence antes. El stock que ya tenías queda sin fecha."
            persistent-hint
            inset
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
        {{ action === "create" ? "Crear producto" : "Guardar cambios" }}
      </v-btn>
    </AppFormActions>
  </v-form>
</template>

<script setup lang="ts">
import type { CompanySettings } from "~/interfaces/companyInterfaces"
import type { ProductCategory } from "~/interfaces/productCategoryInterfaces"
import type { Product, ProductRequest, UnitOfMeasure } from "~/interfaces/productInterfaces"
import { UNIT_OPTIONS, getUnitShortLabel } from "~/interfaces/productInterfaces"
import { validationRules as rules } from "~/helpers/validationFormRules"
import { formatPercent } from "~/helpers/formatHelpers"

const props = defineProps<{
  action: "create" | "update"
  product?: Product | null
  categories: ProductCategory[]
  /** The company's "mandatory field" rules; when absent nothing is mandatory. */
  settings?: CompanySettings | null
}>()

const emit = defineEmits<{
  (e: "submit", payload: ProductRequest): void
}>()

const { field, select, textarea, autocomplete } = useFormFields()

const isValid = ref(false)
const formRef = ref<any>(null)

// Numeric inputs hold strings/numbers while typing; they're converted on submit.
const form = reactive({
  categoryId: (props.product?.categoryId ?? null) as number | null,
  name: props.product?.name ?? "",
  description: props.product?.description ?? "",
  sku: props.product?.sku ?? "",
  barcode: props.product?.barcode ?? "",
  unit: (props.product?.unit ?? "UNIT") as UnitOfMeasure,
  costPrice: (props.product?.costPrice ?? "") as number | string,
  salePrice: (props.product?.salePrice ?? "") as number | string,
  minStock: (props.product?.minStock ?? 0) as number | string,
  tracksExpiry: props.product?.tracksExpiry ?? false,
  isActive: props.product?.isActive ?? true,
})

const requireSku = computed(() => props.settings?.requireProductSku ?? false)
const requireCategory = computed(() => props.settings?.requireProductCategory ?? false)
const requireBarcode = computed(() => props.settings?.requireProductBarcode ?? false)

const fieldLabel = (label: string, required: boolean) => (required ? label : `${label} (opcional)`)

const unitShortLabel = computed(() => getUnitShortLabel(form.unit))

const marginPercent = computed<number | null>(() => {
  const cost = Number(form.costPrice)
  const sale = Number(form.salePrice)
  if (form.costPrice === "" || form.salePrice === "") return null
  if (!Number.isFinite(cost) || !Number.isFinite(sale) || sale <= 0) return null
  return ((sale - cost) / sale) * 100
})

const marginLabel = computed(() =>
  marginPercent.value === null ? "—" : formatPercent(Math.round(marginPercent.value * 100) / 100)
)

const marginColor = computed(() => {
  if (marginPercent.value === null) return "default"
  if (marginPercent.value < 0) return "error"
  if (marginPercent.value < 20) return "warning"
  return "success"
})

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  emit("submit", {
    categoryId: form.categoryId ?? null,
    name: form.name.trim(),
    description: String(form.description ?? "").trim() || null,
    sku: String(form.sku ?? "").trim() || null,
    barcode: String(form.barcode ?? "").trim() || null,
    unit: form.unit,
    costPrice: Number(form.costPrice),
    salePrice: Number(form.salePrice),
    minStock: Number(form.minStock),
    tracksExpiry: form.tracksExpiry,
    isActive: form.isActive,
  })
}
</script>
