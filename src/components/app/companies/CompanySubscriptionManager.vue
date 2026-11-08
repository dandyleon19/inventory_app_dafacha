<template>
  <div class="app-form">
    <AppFormSection title="Estado actual" :subtitle="companyName || 'Empresa'">
      <div v-if="subscription" class="subscription-summary">
        <div class="d-flex flex-wrap align-center ga-2 mb-3">
          <v-chip
            :color="SUBSCRIPTION_STATUS_COLORS[subscription.status]"
            variant="tonal"
            size="large"
            rounded="lg"
          >
            {{ subscriptionStatusText(subscription) }}
          </v-chip>
          <v-chip variant="outlined" size="large" rounded="lg">
            Plan {{ subscription.planName ?? "—" }}
          </v-chip>
        </div>

        <p class="text-body-2 mb-1">{{ endText }}</p>
        <p class="text-body-2 text-medium-emphasis mb-1">
          Almacenes: {{ limitText(subscription.maxWarehouses) }} · Usuarios: {{ limitText(subscription.maxUsers) }}
        </p>
        <p v-if="featureText" class="text-body-2 text-medium-emphasis mb-1">Incluye: {{ featureText }}</p>
        <p v-if="subscription.notes" class="text-body-2 text-error mb-0">Motivo: {{ subscription.notes }}</p>
      </div>
      <p v-else class="text-body-2 text-medium-emphasis mb-0">Cargando suscripción…</p>
    </AppFormSection>

    <AppFormSection
      title="Plan y vencimiento"
      subtitle="Elige el plan y hasta qué día está pagado. Guardar fija esa fecha: no suma nada"
    >
      <v-alert
        v-if="subscription?.suspended"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        La empresa está suspendida. Guardar cambios aquí no lo reactiva: usa «Reactivar empresa» más abajo.
      </v-alert>

      <v-select
        v-model="activateForm.planCode"
        v-bind="select"
        label="Plan"
        item-title="label"
        item-value="code"
        :items="planItems"
        :disabled="busy"
      />

      <v-checkbox
        v-model="activateForm.noExpiry"
        density="compact"
        hide-details
        color="primary"
        label="Sin vencimiento (esta empresa no paga y nunca se bloquea)"
        :disabled="busy"
      />

      <template v-if="!activateForm.noExpiry">
        <v-text-field
          v-model="activateForm.paidUntil"
          v-bind="field"
          class="mt-3"
          type="date"
          label="Pagado hasta"
          :min="todayIso"
          :disabled="busy"
          :hint="paidUntilHint"
          persistent-hint
        />
        <div class="d-flex flex-wrap ga-2 mt-3">
          <v-btn
            v-for="months in QUICK_MONTHS"
            :key="months"
            size="small"
            variant="tonal"
            rounded="lg"
            class="text-none"
            :disabled="busy"
            @click="addMonths(months)"
          >
            +{{ months }} {{ months === 1 ? "mes" : "meses" }}
          </v-btn>
          <v-btn
            v-if="canResetForm"
            size="small"
            variant="text"
            rounded="lg"
            class="text-none"
            :disabled="busy"
            @click="syncActivateForm"
          >
            Deshacer cambios
          </v-btn>
        </div>
      </template>

      <v-btn
        color="primary"
        variant="flat"
        rounded="lg"
        class="text-none mt-4"
        :loading="busy"
        :disabled="!canActivate"
        :prepend-icon="APP_ICONS.lockCheck"
        @click="handleActivate"
      >
        {{ subscription?.onTrial ? "Activar plan" : "Guardar cambios" }}
      </v-btn>
    </AppFormSection>

    <AppFormSection
      v-if="subscription?.onTrial"
      title="Duración de la prueba"
      subtitle="Días de prueba de esta empresa, contados desde su primer ingreso"
    >
      <v-text-field
        v-model.number="trialLength"
        v-bind="field"
        type="number"
        min="1"
        max="365"
        label="Días de prueba de esta empresa"
        :disabled="busy"
        :hint="trialHint"
        persistent-hint
      />
      <v-btn
        color="primary"
        variant="tonal"
        rounded="lg"
        class="text-none mt-3"
        :loading="busy"
        :disabled="!canSaveTrialLength"
        :prepend-icon="APP_ICONS.clock"
        @click="handleSetTrialDays"
      >
        Guardar duración
      </v-btn>
    </AppFormSection>

    <AppFormSection
      v-if="subscription?.suspended"
      title="Reactivar"
      subtitle="Quita el bloqueo manual; la empresa vuelve a como estaba antes de suspenderla"
    >
      <p class="text-body-2 mb-0">{{ resumeText }}</p>
      <v-btn
        color="success"
        variant="flat"
        rounded="lg"
        class="text-none mt-3"
        :loading="busy"
        :disabled="busy"
        :prepend-icon="APP_ICONS.lockCheck"
        @click="handleResume"
      >
        Reactivar empresa
      </v-btn>
    </AppFormSection>

    <AppFormSection
      v-else
      title="Suspender"
      subtitle="Bloquea el acceso de la empresa hasta que la reactives. No toca sus fechas"
    >
      <v-text-field
        v-model="suspendReason"
        v-bind="field"
        label="Motivo (opcional)"
        counter="300"
        maxlength="300"
        :disabled="busy"
      />
      <v-btn
        color="error"
        variant="tonal"
        rounded="lg"
        class="text-none mt-3"
        :disabled="busy"
        :prepend-icon="APP_ICONS.lock"
        @click="showSuspendDialog = true"
      >
        Suspender empresa
      </v-btn>
    </AppFormSection>

    <AppFormSection title="Historial" subtitle="Últimos cambios en la suscripción">
      <v-progress-linear v-if="subscriptionStore.eventsLoading" indeterminate color="primary" />
      <p v-else-if="!subscriptionStore.events.length" class="text-body-2 text-medium-emphasis mb-0">
        Sin movimientos todavía.
      </p>
      <v-list v-else density="compact" class="pa-0 bg-transparent">
        <v-list-item v-for="event in subscriptionStore.events" :key="event.id" class="px-0">
          <v-list-item-title class="text-body-2 font-weight-medium">
            {{ EVENT_LABELS[event.eventType] ?? event.eventType }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ formatEventDate(event.createdAt) }}<span v-if="event.detail"> · {{ event.detail }}</span>
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </AppFormSection>

    <ConfirmationModal
      v-model="showSuspendDialog"
      title="Suspender empresa"
      message="La empresa no podrá usar el sistema hasta que la reactives. Sus datos y sus fechas no cambian. ¿Continuar?"
      :require-text="false"
      @confirm="handleSuspend"
    />
  </div>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import { formatDateDisplay } from "~/helpers/formatHelpers"
import {
  EVENT_LABELS,
  FEATURE_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  formatDaysLeft,
  subscriptionStatusText,
  type FeatureKey,
  type SubscriptionStatus,
} from "~/interfaces/subscriptionInterfaces"
import { useSubscriptionStore } from "~/store/modules/subscription"

const props = defineProps<{
  companyId: number
  companyName?: string
}>()

const emit = defineEmits<{
  (e: "changed"): void
}>()

const { field, select } = useFormFields()
const { success, notifyError } = useApiNotification()
const subscriptionStore = useSubscriptionStore()

const QUICK_MONTHS = [1, 3, 6, 12]

const busy = ref(false)
const showSuspendDialog = ref(false)
const trialLength = ref<number>(14)
const suspendReason = ref("")
const activateForm = reactive({ planCode: "" as string, noExpiry: false, paidUntil: "" })

const subscription = computed(() =>
  subscriptionStore.all.find((item) => item.companyId === props.companyId) ?? null
)

const limitText = (limit: number | null | undefined) => (limit == null ? "ilimitados" : String(limit))

const planItems = computed(() =>
  subscriptionStore.plans.map((plan) => ({
    code: plan.code,
    label: `${plan.name} · ${limitText(plan.maxWarehouses)} sucursal(es) · ${limitText(plan.maxUsers)} usuario(s)`,
  }))
)

// ---------------------------------------------------------------- dates (yyyy-MM-dd, local time)

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const fromIso = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

const todayIso = toIso(new Date())

const isValidIso = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromIso(value).getTime())

const longDate = (value: string) => fromIso(value).toLocaleDateString("es-PE", { dateStyle: "long" })

/** Same rule as the backend: Jan 31 + 1 month = Feb 28 (the day is kept when it exists, else the last day). */
const plusMonths = (value: string, months: number) => {
  const base = fromIso(value)
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(base.getDate(), lastDay))
  return toIso(target)
}

// ---------------------------------------------------------------- plan and paid-until form

// What is saved today: the day it is paid until ("" = never expires, or not paid yet).
const savedPaidUntil = computed(() => {
  const current = subscription.value
  return current && !current.onTrial && current.currentPeriodEnd ? current.currentPeriodEnd.slice(0, 10) : ""
})

const savedNoExpiry = computed(
  () => !!subscription.value && !subscription.value.onTrial && !subscription.value.currentPeriodEnd
)

const syncActivateForm = () => {
  activateForm.planCode = subscription.value?.planCode ?? subscriptionStore.plans[0]?.code ?? ""
  activateForm.noExpiry = savedNoExpiry.value
  activateForm.paidUntil = savedPaidUntil.value
}

const formChanged = computed(
  () =>
    activateForm.planCode !== (subscription.value?.planCode ?? "") ||
    activateForm.noExpiry !== savedNoExpiry.value ||
    (!activateForm.noExpiry && activateForm.paidUntil !== savedPaidUntil.value)
)

const formValid = computed(
  () =>
    !!activateForm.planCode &&
    (activateForm.noExpiry || (isValidIso(activateForm.paidUntil) && activateForm.paidUntil >= todayIso))
)

// A company still on trial can always be activated; a paid one only when something changed, so there are no empty re-saves.
const canActivate = computed(
  () => !busy.value && formValid.value && (!!subscription.value?.onTrial || formChanged.value)
)

const canResetForm = computed(() => !busy.value && formChanged.value)

const addMonths = (months: number) => {
  const current = activateForm.paidUntil
  const base = isValidIso(current) && current >= todayIso ? current : todayIso
  activateForm.paidUntil = plusMonths(base, months)
}

const paidUntilHint = computed(() => {
  const value = activateForm.paidUntil
  if (!isValidIso(value)) return "Elige la fecha o usa un atajo (+1 mes…)."
  if (value < todayIso) return "La fecha no puede ser anterior a hoy."
  const before = savedPaidUntil.value
  if (!before) return `Quedará pagado hasta el ${longDate(value)}.`
  if (before === value) return `Sin cambios: ya está pagado hasta el ${longDate(value)}.`
  return `Pasará de ${longDate(before)} a ${longDate(value)}.`
})

// ---------------------------------------------------------------- trial length

const canSaveTrialLength = computed(
  () => !busy.value && !!subscription.value?.onTrial && Number.isInteger(trialLength.value) &&
    trialLength.value >= 1 && trialLength.value <= 365 && trialLength.value !== subscription.value?.trialDays
)

const trialHint = computed(() => {
  const current = subscription.value
  if (!current) return ""
  if (!current.trialStartedAt) return "Empieza a contar cuando un usuario de la empresa abra el sistema por primera vez."
  if (!Number.isInteger(trialLength.value) || trialLength.value < 1) return ""

  const end = fromIso(current.trialStartedAt)
  end.setDate(end.getDate() + trialLength.value)
  const endIso = toIso(end)
  return `Empezó el ${longDate(current.trialStartedAt)}. Con ${trialLength.value} día(s) termina el ${longDate(endIso)}${endIso < todayIso ? " (ya venció)" : ""}.`
})

const featureText = computed(() =>
  (subscription.value?.features ?? [])
    .map((key) => FEATURE_LABELS[key as FeatureKey] ?? key)
    .join(", ")
)

// ---------------------------------------------------------------- state text

const describe = (status: SubscriptionStatus | null | undefined): string => {
  const current = subscription.value
  if (!current || !status) return ""

  const days = current.daysRemaining
  switch (status) {
    case "TRIAL":
      if (current.trialPending) {
        return `Prueba de ${current.trialDays ?? "?"} días: empieza a contar cuando un usuario de la empresa abra el sistema por primera vez.`
      }
      return current.trialEndsAt
        ? `La prueba termina el ${formatDateDisplay(current.trialEndsAt)}${days != null ? ` (quedan ${formatDaysLeft(days)})` : ""}.`
        : "Prueba sin fecha de fin."
    case "ACTIVE":
      return current.currentPeriodEnd
        ? `Pagado hasta el ${formatDateDisplay(current.currentPeriodEnd)}${days != null ? ` (quedan ${formatDaysLeft(days)})` : ""}.`
        : "Plan activo sin vencimiento."
    case "PAST_DUE":
      return `Pago vencido: ${days != null ? `le quedan ${formatDaysLeft(days)} de gracia` : "en gracia"} antes del bloqueo.`
    case "EXPIRED":
      return current.onTrial ? "La prueba terminó: la empresa queda bloqueada." : "El pago venció: la empresa queda bloqueada."
    default:
      return ""
  }
}

const resumeText = computed(() => `Al reactivar volverá a: ${describe(subscription.value?.resumeStatus ?? "ACTIVE")}`)

const endText = computed(() => {
  const current = subscription.value
  if (!current) return ""
  if (current.status === "SUSPENDED") return `Suspendido manualmente: la empresa está bloqueada. ${resumeText.value}`
  return describe(current.status)
})

const formatEventDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
}

// ---------------------------------------------------------------- actions

const refresh = async () => {
  await Promise.all([subscriptionStore.fetchAll(), subscriptionStore.fetchEvents(props.companyId)])
  emit("changed")
}

const run = async (action: () => Promise<unknown>, doneMessage: string, failedAction: string) => {
  busy.value = true
  try {
    await action()
    success(doneMessage, "Suscripción actualizada")
    await refresh()
  } catch (err) {
    notifyError(err, failedAction)
  } finally {
    busy.value = false
  }
}

const handleActivate = () =>
  run(
    () =>
      subscriptionStore.activate(props.companyId, activateForm.planCode, activateForm.noExpiry ? null : activateForm.paidUntil),
    activateForm.noExpiry ? "La empresa quedó activa sin vencimiento." : `Pagado hasta el ${longDate(activateForm.paidUntil)}.`,
    "guardar el plan"
  )

const handleSetTrialDays = () =>
  run(
    () => subscriptionStore.setTrialDays(props.companyId, trialLength.value),
    `La prueba de esta empresa ahora dura ${trialLength.value} día(s).`,
    "cambiar los días de prueba"
  )

const handleSuspend = () =>
  run(
    () => subscriptionStore.suspend(props.companyId, suspendReason.value.trim() || null),
    "La empresa quedó suspendida.",
    "suspender la empresa"
  )

const handleResume = () =>
  run(
    () => subscriptionStore.resume(props.companyId),
    "La empresa volvió a como estaba antes de suspenderla.",
    "reactivar la empresa"
  )

// Load plans once; load the history again whenever another company is opened.
watch(
  () => props.companyId,
  async () => {
    suspendReason.value = ""
    await Promise.all([subscriptionStore.fetchPlans(), subscriptionStore.fetchEvents(props.companyId)])
    syncActivateForm()
  },
  { immediate: true }
)

// Fill the form again whenever the saved plan or date changes (after saving, or once the list has loaded).
watch(
  () => [subscription.value?.planCode, subscription.value?.currentPeriodEnd, subscription.value?.onTrial],
  syncActivateForm,
  { immediate: true }
)

// Show the company's own trial length in the field, and refresh it after every change.
watch(
  () => subscription.value?.trialDays,
  (days) => {
    if (days) trialLength.value = days
  },
  { immediate: true }
)
</script>
