<template>
  <div class="settings-page">
    <AppPageTitle title="Configuración" subtitle="Datos y reglas de tu empresa" />

    <v-card class="settings-card" rounded="xl" elevation="0">
      <v-card-text class="pa-5 pa-md-6">
        <v-form
          ref="companyFormRef"
          v-model="companyValid"
          class="app-form"
          @submit.prevent="saveCompany"
        >
          <AppFormSection
            title="Datos de la empresa"
            subtitle="Aparecen en el sistema y en futuros documentos"
          >
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.name"
                  v-bind="field"
                  label="Nombre de la empresa"
                  :rules="[rules.required, rules.maxLength(100)]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.socialReason"
                  v-bind="field"
                  label="Razón social (opcional)"
                  :rules="[rules.maxLength(100)]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.rucNumber"
                  v-bind="field"
                  label="RUC (opcional)"
                  :rules="[rules.maxLength(20)]"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="companyForm.phone"
                  v-bind="field"
                  label="Teléfono (opcional)"
                  :rules="[rules.maxLength(20)]"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="companyForm.fiscalAddress"
                  v-bind="field"
                  label="Dirección fiscal (opcional)"
                  :rules="[rules.maxLength(100)]"
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
              :loading="savingCompany"
              :disabled="!canManage"
            >
              Guardar datos
            </v-btn>
          </AppFormActions>
        </v-form>
      </v-card-text>
    </v-card>

    <v-card class="settings-card" rounded="xl" elevation="0">
      <v-card-text class="pa-5 pa-md-6">
        <form class="app-form" @submit.prevent="saveSettings">
          <AppFormSection
            title="Productos"
            subtitle="Campos que serán obligatorios al crear o editar un producto"
          >
            <div class="settings-switches">
              <v-switch
                v-model="settingsForm.requireProductSku"
                color="primary"
                inset
                hide-details
                label="SKU obligatorio"
                :disabled="!canManage"
              />
              <p class="settings-hint">Exige un código interno en cada producto.</p>

              <v-switch
                v-model="settingsForm.requireProductCategory"
                color="primary"
                inset
                hide-details
                label="Categoría obligatoria"
                :disabled="!canManage"
              />
              <p class="settings-hint">Cada producto debe pertenecer a una categoría.</p>

              <v-switch
                v-model="settingsForm.requireProductBarcode"
                color="primary"
                inset
                hide-details
                label="Código de barras obligatorio"
                :disabled="!canManage"
              />
              <p class="settings-hint">Útil si vendes con lector de códigos.</p>
            </div>

            <v-alert
              type="info"
              variant="tonal"
              density="comfortable"
              rounded="lg"
              :icon="APP_ICONS.info"
            >
              Por defecto ningún campo es obligatorio. Los cambios no modifican los productos ya
              creados; aplican cuando se cree o se edite un producto.
            </v-alert>

            <div class="settings-reset">
              <v-btn
                variant="text"
                color="warning"
                size="small"
                rounded="lg"
                class="settings-reset__btn"
                :prepend-icon="APP_ICONS.reset"
                :disabled="!canManage || isSectionDefault('products')"
                @click="resetSectionId = 'products'"
              >
                Restablecer valores por defecto
              </v-btn>
            </div>
          </AppFormSection>

          <AppFormSection
            title="Inventario"
            subtitle="Reglas para los movimientos de stock"
          >
            <div class="settings-switches">
              <v-switch
                v-model="settingsForm.allowNegativeStock"
                color="primary"
                inset
                hide-details
                label="Permitir stock negativo"
                :disabled="!canManage"
              />
              <p class="settings-hint">
                Si está apagado (recomendado), una salida o transferencia mayor al stock disponible
                se rechaza. Enciéndelo solo si vendes antes de registrar los ingresos.
              </p>
            </div>

            <div class="settings-cost">
              <v-select
                v-model="settingsForm.costMethod"
                v-bind="field"
                :items="COST_METHOD_OPTIONS"
                label="Qué sale en cada salida o transferencia"
                :disabled="!canManage"
              />
              <p class="settings-hint settings-hint--flush">
                Cada compra se guarda con lo que de verdad costó, y así el valor del inventario es real (no un promedio).
                Esto decide <strong>quién elige qué sale</strong> cuando haces una salida o una transferencia.
              </p>
              <p class="settings-hint settings-hint--flush">
                <strong>Automático</strong>: no te pregunta nada. En un producto con vencimiento sale el lote que vence
                primero; en uno sin vencimiento, la compra más antigua. En una salida puntual puedes elegir a mano con
                «Elegir manualmente».
              </p>
              <p class="settings-hint settings-hint--flush">
                <strong>Lo elijo yo</strong>: en cada salida o transferencia eliges el lote (producto con vencimiento) o
                la compra (producto sin vencimiento).
              </p>
            </div>

            <div class="settings-reset">
              <v-btn
                variant="text"
                color="warning"
                size="small"
                rounded="lg"
                class="settings-reset__btn"
                :prepend-icon="APP_ICONS.reset"
                :disabled="!canManage || isSectionDefault('inventory')"
                @click="resetSectionId = 'inventory'"
              >
                Restablecer valores por defecto
              </v-btn>
            </div>
          </AppFormSection>

          <AppFormSection
            title="Alertas"
            subtitle="Avisos en el dashboard y en la campana de la barra superior"
          >
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="settingsForm.expiryAlertDays"
                  v-bind="field"
                  label="Avisar vencimientos con"
                  type="number"
                  min="1"
                  max="365"
                  suffix="días de anticipación"
                  :rules="[daysRule(1, 365)]"
                  :disabled="!canManage"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="settingsForm.purchaseArrivalAlertDays"
                  v-bind="field"
                  label="Avisar llegada de órdenes con"
                  type="number"
                  min="1"
                  max="90"
                  suffix="días de anticipación"
                  :rules="[daysRule(1, 90)]"
                  :disabled="!canManage"
                />
              </v-col>
            </v-row>
            <p class="settings-hint settings-hint--flush">
              Los lotes que vencen dentro de ese plazo (y los ya vencidos) y las órdenes de compra que se
              esperan dentro de ese plazo (o ya atrasadas) aparecen como alertas. El stock bajo se avisa cuando
              un producto llega a su stock mínimo.
            </p>

            <div class="settings-reset">
              <v-btn
                variant="text"
                color="warning"
                size="small"
                rounded="lg"
                class="settings-reset__btn"
                :prepend-icon="APP_ICONS.reset"
                :disabled="!canManage || isSectionDefault('alerts')"
                @click="resetSectionId = 'alerts'"
              >
                Restablecer valores por defecto
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
              :loading="savingSettings"
              :disabled="!canManage"
            >
              Guardar configuración
            </v-btn>
          </AppFormActions>
        </form>
      </v-card-text>
    </v-card>

    <ConfirmationModal
      v-model="showResetDialog"
      :title="resetSection?.title"
      :message="resetSection?.message"
      confirm-label="Restablecer"
      :icon="APP_ICONS.reset"
      color="warning"
      :require-text="false"
      @confirm="handleReset"
    />
  </div>
</template>

<script setup lang="ts">
import type { CompanySettings, CostMethod } from "~/interfaces/companyInterfaces"
import { COST_METHOD_OPTIONS, DEFAULT_COMPANY_SETTINGS } from "~/interfaces/companyInterfaces"
import { APP_ICONS } from "~/constants/appIcons"
import { useAuthStore, useCompanyStore } from "~/store"
import { validationRules as rules } from "~/helpers/validationFormRules"

definePageMeta({
  layout: "app",
  middleware: "role",
  allowedRoles: ["ADMIN_USER", "SUPER_ADMIN"],
})

useHead({ title: "Configuración" })

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const { field } = useFormFields()
const { success } = useNotification()
const { notifyError } = useApiNotification()

const canManage = computed(() => authStore.canManage)

const companyFormRef = ref<any>(null)
const companyValid = ref(false)
const savingCompany = ref(false)
const savingSettings = ref(false)

const companyForm = reactive({
  name: "",
  socialReason: "",
  rucNumber: "",
  phone: "",
  fiscalAddress: "",
})

// Number inputs hand back strings while typing, hence the wider type for the day counters.
const settingsForm = reactive({
  requireProductSku: false,
  requireProductCategory: false,
  requireProductBarcode: false,
  allowNegativeStock: false,
  costMethod: "FIFO" as CostMethod,
  expiryAlertDays: 30 as number | string,
  purchaseArrivalAlertDays: 7 as number | string,
})

/** Whole number within [min, max]. */
const daysRule = (min: number, max: number) => (value: number | string) => {
  const n = Number(value)
  return (Number.isInteger(n) && n >= min && n <= max) || `Debe ser un número entero entre ${min} y ${max}`
}

type SettingsSectionId = "products" | "inventory" | "alerts"

/**
 * Each settings section lists the keys it owns, so "reset" only touches those and leaves the rest as saved.
 * A new section (or a new setting inside one) only needs to be registered here and given a reset button.
 */
const SETTINGS_SECTIONS: Record<
  SettingsSectionId,
  { title: string; message: string; success: string; keys: Array<keyof CompanySettings> }
> = {
  products: {
    title: "Restablecer configuración de productos",
    message:
      "SKU, categoría y código de barras volverán a ser opcionales. Los productos ya creados no se modifican.",
    success: "La configuración de productos volvió a sus valores por defecto.",
    keys: ["requireProductSku", "requireProductCategory", "requireProductBarcode"],
  },
  inventory: {
    title: "Restablecer configuración de inventario",
    message:
      "El stock negativo volverá a estar bloqueado y las salidas volverán a ser automáticas (sin elegir lote ni compra).",
    success: "La configuración de inventario volvió a sus valores por defecto.",
    keys: ["allowNegativeStock", "costMethod"],
  },
  alerts: {
    title: "Restablecer configuración de alertas",
    message:
      "Los vencimientos se avisarán con 30 días de anticipación y la llegada de órdenes de compra con 7 días.",
    success: "La configuración de alertas volvió a sus valores por defecto.",
    keys: ["expiryAlertDays", "purchaseArrivalAlertDays"],
  },
}

const resetSectionId = ref<SettingsSectionId | null>(null)
const resetSection = computed(() => (resetSectionId.value ? SETTINGS_SECTIONS[resetSectionId.value] : null))

const showResetDialog = computed({
  get: () => resetSectionId.value !== null,
  set: (open: boolean) => {
    if (!open) resetSectionId.value = null
  },
})

/** True when both the form and what is saved already match the defaults (nothing to reset). */
const isSectionDefault = (id: SettingsSectionId) =>
  SETTINGS_SECTIONS[id].keys.every(
    (key) =>
      // Compared as text: a number input may hold "30" (a string) while the default is 30.
      String(settingsForm[key]) === String(DEFAULT_COMPANY_SETTINGS[key]) &&
      String(companyStore.settings[key]) === String(DEFAULT_COMPANY_SETTINGS[key])
  )

const handleReset = async () => {
  // Read the section before anything else: closing the modal clears resetSectionId.
  const id = resetSectionId.value
  if (!id) return
  const section = SETTINGS_SECTIONS[id]

  savingSettings.value = true
  try {
    // Start from what is saved (not the form), so unsaved edits in other sections are neither saved nor lost.
    const next: CompanySettings = { ...companyStore.settings }
    section.keys.forEach((key) => {
      ;(next as Record<string, boolean | number | string>)[key] = DEFAULT_COMPANY_SETTINGS[key]
    })

    await companyStore.updateSettings(next)
    section.keys.forEach((key) => {
      ;(settingsForm as Record<string, boolean | number | string>)[key] = DEFAULT_COMPANY_SETTINGS[key]
    })
    success(section.success, "Configuración restablecida")
  } catch (err) {
    notifyError(err, "restablecer la configuración")
  } finally {
    savingSettings.value = false
  }
}

const loadForms = () => {
  const company = companyStore.company
  if (company) {
    companyForm.name = company.name ?? ""
    companyForm.socialReason = company.socialReason ?? ""
    companyForm.rucNumber = company.rucNumber ?? ""
    companyForm.phone = company.phone ?? ""
    companyForm.fiscalAddress = company.fiscalAddress ?? ""
  }

  Object.assign(settingsForm, companyStore.settings)
}

const saveCompany = async () => {
  const result = await companyFormRef.value?.validate()
  if (!result?.valid) return

  savingCompany.value = true
  try {
    await companyStore.updateCompany({
      name: companyForm.name.trim(),
      socialReason: companyForm.socialReason.trim() || null,
      rucNumber: companyForm.rucNumber.trim() || null,
      phone: companyForm.phone.trim() || null,
      fiscalAddress: companyForm.fiscalAddress.trim() || null,
    })
    success("Los datos de la empresa se guardaron correctamente.", "Datos guardados")
  } catch (err) {
    notifyError(err, "guardar los datos de la empresa")
  } finally {
    savingCompany.value = false
  }
}

const saveSettings = async () => {
  const daysOk =
    daysRule(1, 365)(settingsForm.expiryAlertDays) === true &&
    daysRule(1, 90)(settingsForm.purchaseArrivalAlertDays) === true
  if (!daysOk) {
    notifyError(null, "guardar la configuración", "Revisa los días de las alertas: deben ser números enteros dentro del rango indicado.")
    return
  }

  savingSettings.value = true
  try {
    await companyStore.updateSettings({
      ...settingsForm,
      expiryAlertDays: Number(settingsForm.expiryAlertDays),
      purchaseArrivalAlertDays: Number(settingsForm.purchaseArrivalAlertDays),
    })
    success("La configuración se guardó correctamente.", "Configuración guardada")
  } catch (err) {
    notifyError(err, "guardar la configuración")
  } finally {
    savingSettings.value = false
  }
}

onMounted(async () => {
  await Promise.all([companyStore.fetchCompany(), companyStore.fetchSettings()])
  loadForms()
})
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
}

.settings-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.settings-switches {
  display: flex;
  flex-direction: column;
}

.settings-reset {
  display: flex;
  justify-content: flex-end;
}

.settings-reset__btn {
  text-transform: none;
  letter-spacing: normal;
}

/* Same specificity as .settings-hint, so it must be written as a compound selector to win over it. */
.settings-hint.settings-hint--flush {
  margin-left: 0;
}

.settings-cost :deep(.settings-hint) {
  margin-bottom: 0.5rem;
}

.settings-cost {
  margin-top: 1.25rem;
}

.settings-hint {
  margin: 0 0 0.75rem 3.5rem;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
