<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection title="Almacén" subtitle="Ubicación donde se guarda el stock">
      <v-row dense>
        <!-- Only the platform owner creates warehouses for other companies, so only they choose the company. The
             admin of a company always creates in their own (the server decides it), and a warehouse never moves. -->
        <v-col v-if="chooseCompany" cols="12">
          <RemoteSelect
            v-model="form.companyId"
            kind="company"
            label="Empresa"
            :rules="[rules.required]"
          />
        </v-col>
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
import { useAuthStore } from "~/store"

const props = defineProps<{
  action: "create" | "update"
  warehouse?: Warehouse | null
}>()

const emit = defineEmits<{
  (e: "submit", payload: WarehouseRequest): void
}>()

const { field } = useFormFields()
const authStore = useAuthStore()

const chooseCompany = computed(() => authStore.isSuperAdmin && props.action === "create")

const isValid = ref(false)
const formRef = ref<any>(null)

const form = reactive({
  name: props.warehouse?.name ?? "",
  address: props.warehouse?.address ?? "",
  isActive: props.warehouse?.isActive ?? true,
  companyId: null as number | string | null,
})

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  emit("submit", {
    name: form.name.trim(),
    address: form.address.trim() || null,
    isActive: form.isActive,
    ...(chooseCompany.value ? { companyId: Number(form.companyId) } : {}),
  })
}
</script>
