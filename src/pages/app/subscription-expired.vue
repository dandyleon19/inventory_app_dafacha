<template>
  <v-card class="expired-page" rounded="xl" elevation="0">
    <v-card-text class="expired-page__body">
      <v-avatar size="72" color="error" variant="tonal" class="mb-4">
        <v-icon :icon="APP_ICONS.lock" size="36" />
      </v-avatar>

      <h1 class="expired-page__title">{{ title }}</h1>
      <p class="expired-page__text">{{ message }}</p>

      <p v-if="detail" class="expired-page__detail">{{ detail }}</p>

      <p class="expired-page__reassurance">
        Tus datos están guardados y seguirán ahí en cuanto actives tu plan.
      </p>

      <div class="expired-page__actions">
        <v-btn
          v-if="supportLink"
          :href="supportLink"
          target="_blank"
          rel="noopener"
          color="primary"
          variant="flat"
          size="large"
          rounded="lg"
          class="text-none"
          :prepend-icon="APP_ICONS.whatsapp"
        >
          Contactar para renovar
        </v-btn>

        <v-btn
          color="primary"
          :variant="supportLink ? 'outlined' : 'flat'"
          size="large"
          rounded="lg"
          class="text-none"
          :loading="checking"
          :prepend-icon="APP_ICONS.refresh"
          @click="recheck"
        >
          Ya renové, verificar
        </v-btn>

        <v-btn variant="text" size="large" rounded="lg" class="text-none" @click="handleLogout">
          Cerrar sesión
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import { formatDateDisplay } from "~/helpers/formatHelpers"
import { useSubscriptionStore } from "~/store/modules/subscription"

definePageMeta({ layout: "default" })

useHead({ title: "Suscripción vencida" })

const config = useRuntimeConfig()
const subscriptionStore = useSubscriptionStore()
const { logout } = useAuth()

const checking = ref(false)

const subscription = computed(() => subscriptionStore.current)

const isSuspended = computed(() => subscription.value?.status === "SUSPENDED")
const trialEnded = computed(
  () => !isSuspended.value && !!subscription.value?.trialEndsAt && !subscription.value?.currentPeriodEnd
)

const title = computed(() => {
  if (isSuspended.value) return "Tu suscripción está suspendida"
  return trialEnded.value ? "Tu prueba gratuita terminó" : "Tu suscripción venció"
})

const message = computed(() => {
  if (isSuspended.value) {
    return "Se bloqueó el acceso al sistema. Comunícate con soporte para reactivarlo."
  }
  return trialEnded.value
    ? "Elige un plan para seguir usando el sistema."
    : "Renueva tu plan para seguir usando el sistema."
})

const detail = computed(() => {
  if (isSuspended.value) return subscription.value?.notes ?? ""
  const endDate = trialEnded.value ? subscription.value?.trialEndsAt : subscription.value?.currentPeriodEnd
  return endDate ? `Terminó el ${formatDateDisplay(endDate)}.` : ""
})

// Support WhatsApp number (digits only, with country code), set with NUXT_PUBLIC_SUPPORT_WHATSAPP.
const supportLink = computed(() => {
  const phone = String(config.public.supportWhatsapp ?? "").replace(/\D/g, "")
  if (!phone) return ""
  const company = subscription.value?.companyName ? ` (${subscription.value.companyName})` : ""
  const text = encodeURIComponent(`Hola, quiero renovar mi plan de CompanySpa${company}.`)
  return `https://wa.me/${phone}?text=${text}`
})

const recheck = async () => {
  checking.value = true
  try {
    await subscriptionStore.fetchMine(true)
    if (!subscriptionStore.isBlocked) {
      await navigateTo("/app")
    }
  } finally {
    checking.value = false
  }
}

const handleLogout = async () => {
  await logout()
}

onMounted(() => {
  subscriptionStore.fetchMine(true)
})
</script>

<style scoped>
.expired-page {
  width: 100%;
  max-width: 520px;
  margin-inline: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 48px rgba(255, 128, 0, 0.1);
}

.expired-page__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1.75rem 2rem;
  text-align: center;
}

.expired-page__title {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.expired-page__text {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.expired-page__detail {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.expired-page__reassurance {
  margin: 0.5rem 0 1.5rem;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.expired-page__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 320px;
}
</style>
