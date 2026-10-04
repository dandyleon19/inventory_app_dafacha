<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection title="Almacén" subtitle="Ubicación donde se guarda el stock">
      <v-row dense>
        <v-col cols="12">
          <v-text-field
            v-model="form.name"
            v-bind="field"
            label="Nombre del almacén"
            :rules="[rules.required, rules.maxLength(100)]"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="form.address"
            v-bind="field"
            label="Dirección (opcional)"
            :rules="[rules.maxLength(200)]"
          />
        </v-col>
        <v-col cols="12">
          <v-switch
            v-model="form.isActive"
            color="primary"
            label="Almacén activo"
            hint="Un almacén inactivo no recibe nuevos movimientos"
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
        {{ action === "create" ? "Crear almacén" : "Guardar cambios" }}
      </v-btn>
    </AppFormActions>
  </v-form>
</template>

<script setup lang="ts">
import type { Warehouse, WarehouseRequest } from "~/interfaces/warehouseInterfaces"
import { validationRules as rules } from "~/helpers/validationFormRules"

const props = defineProps<{
  action: "create" | "update"
  warehouse?: Warehouse | null
}>()

const emit = defineEmits<{
  (e: "submit", payload: WarehouseRequest): void
}>()

const { field } = useFormFields()

const isValid = ref(false)
const formRef = ref<any>(null)

const form = reactive({
  name: props.warehouse?.name ?? "",
  address: props.warehouse?.address ?? "",
  isActive: props.warehouse?.isActive ?? true,
})

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  emit("submit", {
    name: form.name.trim(),
    address: form.address.trim() || null,
    isActive: form.isActive,
  })
}
</script>
