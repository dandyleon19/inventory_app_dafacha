<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection title="Datos del usuario" subtitle="Quién es y cómo entra al sistema">
      <v-row dense>
        <!-- Only the platform owner creates users for other companies, so only they choose the company. The admin
             of a company always creates in their own (the server decides it), and a user never changes company. -->
        <v-col v-if="chooseCompany" cols="12">
          <RemoteSelect
            v-model="form.companyId"
            kind="company"
            label="Empresa"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.firstName"
            v-bind="field"
            label="Nombres"
            :rules="[rules.required, rules.maxLength(100)]"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.lastName"
            v-bind="field"
            label="Apellidos"
            :rules="[rules.required, rules.maxLength(100)]"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="form.email"
            v-bind="field"
            label="Correo"
            type="email"
            autocomplete="off"
            :rules="[rules.required, rules.email, rules.maxLength(255)]"
          />
        </v-col>
        <v-col v-if="action === 'create'" cols="12">
          <v-text-field
            v-model="form.password"
            v-bind="field"
            label="Contraseña"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :append-inner-icon="showPassword ? APP_ICONS.eyeOff : APP_ICONS.view"
            hint="Mínimo 8 caracteres. Compártela con la persona; podrás restablecerla cuando quieras."
            persistent-hint
            :rules="[rules.required, rules.minLength(8), rules.maxLength(255)]"
            @click:append-inner="showPassword = !showPassword"
          />
        </v-col>
      </v-row>
    </AppFormSection>

    <AppFormSection title="Permisos" subtitle="Qué puede hacer en el sistema">
      <v-row dense>
        <v-col cols="12">
          <v-select
            v-model="form.role"
            v-bind="select"
            :items="roleItems"
            label="Rol"
            :disabled="roleLocked"
            :hint="roleHint"
            persistent-hint
            :rules="[rules.required]"
          />
        </v-col>

        <v-col v-if="!isAdminRole" cols="12">
          <v-switch
            v-model="allWarehouses"
            color="primary"
            label="Puede usar todos los almacenes"
            hint="Si lo apagas, solo verá y moverá el stock de los almacenes que elijas."
            persistent-hint
            inset
          />
        </v-col>
        <v-col v-if="!isAdminRole && !allWarehouses" cols="12">
          <v-autocomplete
            v-model="form.warehouseIds"
            v-bind="autocomplete"
            :items="warehouseItems"
            item-title="name"
            item-value="id"
            label="Almacenes permitidos"
            multiple
            chips
            closable-chips
            :loading="loadingWarehouses"
            :no-data-text="chooseCompany && !form.companyId ? 'Elige primero la empresa' : 'Sin almacenes'"
            :rules="[atLeastOneWarehouse]"
          />
        </v-col>

        <v-col cols="12">
          <v-switch
            v-model="form.isActive"
            color="primary"
            label="Usuario activo"
            :disabled="activeLocked"
            :hint="activeHint"
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
        {{ action === "create" ? "Crear usuario" : "Guardar cambios" }}
      </v-btn>
    </AppFormActions>
  </v-form>
</template>

<script setup lang="ts">
import type { User, UserRequest, UserRole } from "~/interfaces/userInterfaces"
import type { Warehouse } from "~/interfaces/warehouseInterfaces"
import {
  ASSIGNABLE_ROLES,
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
} from "~/interfaces/userInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore } from "~/store"
import { validationRules as rules } from "~/helpers/validationFormRules"

const props = defineProps<{
  action: "create" | "update"
  user?: User | null
  warehouses: Warehouse[]
}>()

const emit = defineEmits<{
  (e: "submit", payload: UserRequest): void
}>()

const { field, select, autocomplete } = useFormFields()
const authStore = useAuthStore()

const isValid = ref(false)
const formRef = ref<any>(null)
const showPassword = ref(false)

const form = reactive({
  firstName: props.user?.firstName ?? "",
  lastName: props.user?.lastName ?? "",
  email: props.user?.email ?? "",
  password: "",
  role: (props.user?.role ?? "WAREHOUSE_USER") as UserRole,
  isActive: props.user?.isActive ?? true,
  warehouseIds: [...(props.user?.warehouseIds ?? [])] as number[],
  companyId: null as number | string | null,
})

// The platform owner picks the company when creating; when editing they work on the company the user already has.
const chooseCompany = computed(() => authStore.isSuperAdmin && props.action === "create")

// An admin lists their own company's warehouses (handed in by the page). The platform owner works across companies,
// so the list is the one of the company the user belongs to, loaded when it is chosen.
const ownerWarehouses = ref<Warehouse[]>([])
const loadingWarehouses = ref(false)
const warehouseItems = computed(() => (authStore.isSuperAdmin ? ownerWarehouses.value : props.warehouses))

const currentCompanyId = () => (props.action === "create" ? form.companyId : props.user?.companyId)

const loadOwnerWarehouses = async (companyId: number | string | null | undefined) => {
  ownerWarehouses.value = []
  if (!companyId) return

  loadingWarehouses.value = true
  try {
    const { $api } = useNuxtApp()
    const response = await $api<{ content?: Warehouse[] }>("/api/warehouses", {
      method: "GET",
      query: { companyId, isActive: true, page: 0, size: 100 },
    })
    if (String(currentCompanyId() ?? "") !== String(companyId)) return // the choice changed meanwhile
    ownerWarehouses.value = response?.content ?? []
  } catch (err) {
    console.error("Error al obtener los almacenes de la empresa:", err)
  } finally {
    loadingWarehouses.value = false
  }
}

if (authStore.isSuperAdmin) {
  watch(
    currentCompanyId,
    (companyId, previous) => {
      // A different company has different warehouses: what was picked for the previous one no longer applies.
      if (previous !== undefined && props.action === "create") form.warehouseIds = []
      loadOwnerWarehouses(companyId)
    },
    { immediate: true }
  )
}

// No warehouses stored = all of them.
const allWarehouses = ref((props.user?.warehouseIds?.length ?? 0) === 0)

const isSelf = computed(() => !!props.user?.id && props.user.id === authStore.user?.id)
const isSuperAdminUser = computed(() => props.user?.role === "SUPER_ADMIN")

// An admin's role can't be changed from here if it's the owner account, and nobody can change their own role.
const roleLocked = computed(() => isSelf.value || isSuperAdminUser.value)
const activeLocked = computed(() => isSelf.value || isSuperAdminUser.value)

const roleItems = computed(() => {
  const roles: UserRole[] = isSuperAdminUser.value ? ["SUPER_ADMIN"] : ASSIGNABLE_ROLES
  return roles.map((role) => ({ value: role, title: USER_ROLE_LABELS[role] }))
})

const roleHint = computed(() =>
  isSelf.value
    ? "No puedes cambiar tu propio rol."
    : USER_ROLE_DESCRIPTIONS[form.role]
)

const activeHint = computed(() => {
  if (isSelf.value) return "No puedes desactivar tu propia cuenta."
  return form.isActive
    ? "Puede entrar al sistema."
    : "No podrá entrar y sus sesiones abiertas se cierran. Su historial se conserva."
})

// Admins are never limited to some warehouses, so the choice doesn't apply to them.
const isAdminRole = computed(() => form.role === "ADMIN_USER" || form.role === "SUPER_ADMIN")

const atLeastOneWarehouse = (value: number[]) =>
  (value?.length ?? 0) > 0 || "Elige al menos un almacén, o activa «todos los almacenes»"

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  emit("submit", {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    password: props.action === "create" ? form.password : null,
    role: form.role,
    isActive: form.isActive,
    warehouseIds: isAdminRole.value || allWarehouses.value ? [] : form.warehouseIds,
    ...(chooseCompany.value ? { companyId: Number(form.companyId) } : {}),
  })
}
</script>
