import { useAuthStore } from "~/store/modules/auth"
import { useSubscriptionStore } from "~/store/modules/subscription"
import { FEATURE_LABELS, requiredFeatureForPath } from "~/interfaces/subscriptionInterfaces"

const EXPIRED_PATH = "/app/subscription-expired"

/**
 * Runs after auth.global.ts (middleware files run in alphabetical order, and auth fills the store first).
 *  - blocked company (trial / payment over, or suspended): only the "subscription expired" page is reachable;
 *  - page of a feature the plan does not include: back to the dashboard with a notice.
 * SUPER_ADMIN is never limited. The backend enforces the same rules; this just spares the user a broken screen.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith("/app")) return

  const authStore = useAuthStore()
  if (!authStore.token || !authStore.user || authStore.isSuperAdmin) return

  const subscription = useSubscriptionStore()
  if (subscription.isStale) {
    await subscription.fetchMine(true)
  }

  const onExpiredPage = to.path === EXPIRED_PATH

  if (subscription.isBlocked) {
    return onExpiredPage ? undefined : navigateTo(EXPIRED_PATH)
  }
  if (onExpiredPage) {
    return navigateTo("/app")
  }

  const feature = requiredFeatureForPath(to.path)
  if (feature && !subscription.hasFeature(feature)) {
    if (import.meta.client) {
      useNotification().show({
        message: `Tu plan ${subscription.planName ?? ""} no incluye ${FEATURE_LABELS[feature]}. Mejora tu plan para usarlo.`,
        type: "warning",
        title: "Función no incluida en tu plan",
      })
    }
    return navigateTo("/app")
  }
})
