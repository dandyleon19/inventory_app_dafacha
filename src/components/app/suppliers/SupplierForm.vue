<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection title="Proveedor" subtitle="A quién le compras">
      <v-row dense>
        <v-col cols="12">
          <v-text-field
            v-model="form.name"
            v-bind="field"
            label="Nombre o razón social"
            :rules="[rules.required, rules.maxLength(150)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.rucNumber"
            v-bind="field"
            label="RUC (opcional)"
            :rules="[rules.maxLength(20)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-switch
            v-model="form.isActive"
            color="primary"
            label="Proveedor activo"
            hint="Uno inactivo no se puede elegir en nuevas órdenes"
            persistent-hint
            inset
          />
        </v-col>
      </v-row>
    </AppFormSection>

    <AppFormSection title="Contacto" subtitle="Datos para hacer los pedidos">
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.contactName"
            v-bind="field"
            label="Persona de contacto (opcional)"
            :rules="[rules.maxLength(100)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.phone"
            v-bind="field"
            label="Teléfono (opcional)"
            :rules="[rules.maxLength(20)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.email"
            v-bind="field"
            label="Correo (opcional)"
            :rules="[optionalEmail, rules.maxLength(100)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.address"
            v-bind="field"
            label="Dirección (opcional)"
            :rules="[rules.maxLength(200)]"
          />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="form.notes"
            v-bind="textarea"
            label="Notas (opcional)"
            rows="3"
            :rules="[rules.maxLength(1000)]"
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
        {{ action === "create" ? "Crear proveedor" : "Guardar cambios" }}
      </v-btn>
    </AppFormActions>
  </v-form>
</template>

<script setup lang="ts">
import type { Supplier, SupplierRequest } from "~/interfaces/supplierInterfaces"
import { validationRules as rules } from "~/helpers/validationFormRules"

const props = defineProps<{
  action: "create" | "update"
  supplier?: Supplier | null
}>()

const emit = defineEmits<{
  (e: "submit", payload: SupplierRequest): void
}>()

const { field, textarea } = useFormFields()

const isValid = ref(false)
const formRef = ref<any>(null)

const form = reactive({
  name: props.supplier?.name ?? "",
  rucNumber: props.supplier?.rucNumber ?? "",
  contactName: props.supplier?.contactName ?? "",
  phone: props.supplier?.phone ?? "",
  email: props.supplier?.email ?? "",
  address: props.supplier?.address ?? "",
  notes: props.supplier?.notes ?? "",
  isActive: props.supplier?.isActive ?? true,
})

const optionalEmail = (value: string) => !value || rules.email(value)

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  emit("submit", {
    name: form.name.trim(),
    rucNumber: form.rucNumber.trim() || null,
    contactName: form.contactName.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    notes: form.notes.trim() || null,
    isActive: form.isActive,
  })
}
</script>
