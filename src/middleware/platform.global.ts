import { useAuthStore } from "~/store/modules/auth"

/** The only pages the platform owner (SUPER_ADMIN) has: their dashboard and the companies. */
const PLATFORM_PATHS = ["/app", "/app/companies"]

/**
 * Runs after auth.global.ts (middleware files run in alphabetical order). The platform owner manages companies and
 * their subscriptions and does not work inside any company's inventory, so any other page sends them to their
 * dashboard instead of showing a screen that is not theirs. The backend still decides what each role may do.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith("/app")) return

  const authStore = useAuthStore()
  if (!authStore.token || !authStore.user || !authStore.isSuperAdmin) return

  const path = to.path.replace(/\/+$/, "") || "/app"
  if (PLATFORM_PATHS.includes(path)) return

  return navigateTo("/app")
})
