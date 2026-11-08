<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection title="Empresa" subtitle="Datos del negocio que usará el sistema">
      <v-row dense>
        <v-col cols="12">
          <v-text-field
            v-model="form.name"
            v-bind="field"
            label="Nombre comercial"
            :rules="[rules.required, rules.maxLength(100)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.socialReason"
            v-bind="field"
            label="Razón social (opcional)"
            :rules="[rules.maxLength(100)]"
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
        <v-col cols="12" sm="8">
          <v-text-field
            v-model="form.fiscalAddress"
            v-bind="field"
            label="Dirección fiscal (opcional)"
            :rules="[rules.maxLength(100)]"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-text-field
            v-model="form.phone"
            v-bind="field"
            label="Teléfono (opcional)"
            :rules="[rules.maxLength(20)]"
          />
        </v-col>
      </v-row>
    </AppFormSection>

    <AppFormSection
      v-if="action === 'create'"
      title="Administrador"
      subtitle="Primer usuario de la empresa. Con él entra y crea al resto del equipo"
    >
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="admin.firstName"
            v-bind="field"
            label="Nombres"
            :rules="[rules.required, rules.maxLength(255)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="admin.lastName"
            v-bind="field"
            label="Apellidos"
            :rules="[rules.required, rules.maxLength(255)]"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="admin.email"
            v-bind="field"
            type="email"
            label="Correo"
            :rules="[rules.required, rules.email]"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="admin.password"
            v-bind="field"
            :type="showPassword ? 'text' : 'password'"
            label="Contraseña"
            hint="Mínimo 8 caracteres. Compártela con la persona; podrá cambiarla"
            persistent-hint
            :append-inner-icon="showPassword ? APP_ICONS.eyeOff : APP_ICONS.view"
            :rules="[rules.required, rules.minLength(8)]"
            @click:append-inner="showPassword = !showPassword"
          />
        </v-col>
      </v-row>

      <v-alert type="info" variant="tonal" density="compact" class="mt-3">
        La empresa empieza con una prueba gratis y un almacén llamado «Almacén principal».
      </v-alert>
    </AppFormSection>

    <AppFormActions>
      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        rounded="lg"
        class="app-form-btn--primary"
      >
        {{ action === "create" ? "Crear empresa" : "Guardar cambios" }}
      </v-btn>
    </AppFormActions>
  </v-form>
</template>

<script setup lang="ts">
import type { Company, CompanyRequest } from "~/interfaces/companyInterfaces"
import type { CompanyAdminRequest } from "~/store/modules/companyAdmin"
import { APP_ICONS } from "~/constants/appIcons"
import { validationRules as rules } from "~/helpers/validationFormRules"

const props = defineProps<{
  action: "create" | "update"
  company?: Company | null
}>()

const emit = defineEmits<{
  (e: "submit", payload: { company: CompanyRequest; admin: CompanyAdminRequest | null }): void
}>()

const { field } = useFormFields()

const isValid = ref(false)
const formRef = ref<any>(null)
const showPassword = ref(false)

const form = reactive({
  name: props.company?.name ?? "",
  socialReason: props.company?.socialReason ?? "",
  rucNumber: props.company?.rucNumber ?? "",
  fiscalAddress: props.company?.fiscalAddress ?? "",
  phone: props.company?.phone ?? "",
})

const admin = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
})

const orNull = (value: string) => value.trim() || null

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  emit("submit", {
    company: {
      name: form.name.trim(),
      socialReason: orNull(form.socialReason),
      rucNumber: orNull(form.rucNumber),
      fiscalAddress: orNull(form.fiscalAddress),
      phone: orNull(form.phone),
    },
    admin:
      props.action === "create"
        ? {
            firstName: admin.firstName.trim(),
            lastName: admin.lastName.trim(),
            email: admin.email.trim(),
            password: admin.password,
          }
        : null,
  })
}
</script>
