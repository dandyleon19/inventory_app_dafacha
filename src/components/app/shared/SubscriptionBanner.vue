<template>
  <v-alert
    v-if="banner"
    :type="banner.type"
    variant="tonal"
    rounded="lg"
    density="comfortable"
    class="subscription-banner"
    :closable="banner.closable"
    @click:close="dismissed = true"
  >
    <div class="subscription-banner__content">
      <div>
        <strong>{{ banner.title }}</strong>
        <span v-if="banner.text"> {{ banner.text }}</span>
      </div>

      <v-btn
        v-if="supportLink"
        :href="supportLink"
        target="_blank"
        rel="noopener"
        size="small"
        variant="flat"
        :color="banner.type"
        class="text-none"
        :prepend-icon="APP_ICONS.whatsapp"
      >
        {{ banner.cta }}
      </v-btn>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import { formatDateDisplay } from "~/helpers/formatHelpers"
import { formatDaysLeft } from "~/interfaces/subscriptionInterfaces"
import { useAuthStore } from "~/store/modules/auth"
import { useSubscriptionStore } from "~/store/modules/subscription"

/**
 * One notice about the company's plan, shown on every page of the app:
 *  - during the trial: how many days are left;
 *  - after a paid period ended (grace days): pay before the system is blocked (cannot be closed);
 *  - when a paid plan is about to end (7 days or less).
 * Blocked companies never get here: the middleware sends them to the "subscription expired" page.
 */
const EXPIRING_SOON_DAYS = 7

const config = useRuntimeConfig()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

const dismissed = ref(false)

interface BannerContent {
  type: "info" | "warning"
  title: string
  text: string
  cta: string
  closable: boolean
}

const banner = computed<BannerContent | null>(() => {
  const subscription = subscriptionStore.current
  if (!subscription || authStore.isSuperAdmin || subscription.blocked) return null

  const days = subscription.daysRemaining

  if (subscription.status === "PAST_DUE") {
    return {
      type: "warning",
      title: "Tu pago está vencido.",
      text: `Renueva tu plan ${formatDaysLeftText(days)} o el sistema se bloqueará.`,
      cta: "Renovar ahora",
      closable: false,
    }
  }

  if (dismissed.value) return null

  if (subscription.status === "TRIAL" && days !== null) {
    return {
      type: "info",
      title: days <= 0 ? "Tu prueba gratuita termina hoy." : `Prueba gratuita: te quedan ${formatDaysLeft(days)}.`,
      text: "Elige un plan antes de que termine para no perder el acceso.",
      cta: "Elegir un plan",
      closable: true,
    }
  }

  if (subscription.status === "ACTIVE" && days !== null && days <= EXPIRING_SOON_DAYS) {
    const end = subscription.currentPeriodEnd ? ` (${formatDateDisplay(subscription.currentPeriodEnd)})` : ""
    return {
      type: "info",
      title: days <= 0 ? "Tu plan vence hoy." : `Tu plan vence en ${formatDaysLeft(days)}${end}.`,
      text: "Renuévalo para no interrumpir el servicio.",
      cta: "Renovar plan",
      closable: true,
    }
  }

  return null
})

function formatDaysLeftText(days: number | null): string {
  if (days === null) return "pronto"
  return days <= 0 ? "hoy" : `en ${formatDaysLeft(days)}`
}

// Support WhatsApp number (digits only, with country code), set with NUXT_PUBLIC_SUPPORT_WHATSAPP.
const supportLink = computed(() => {
  const phone = String(config.public.supportWhatsapp ?? "").replace(/\D/g, "")
  if (!phone) return ""
  const company = authStore.user?.companyName ? ` (${authStore.user.companyName})` : ""
  return `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, quiero renovar mi plan de CompanySpa${company}.`)}`
})
</script>

<style scoped>
.subscription-banner {
  margin: 8px 12px 0;
}

.subscription-banner__content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}
</style>
