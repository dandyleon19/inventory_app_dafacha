import { useAuthStore } from "~/store/modules/auth"
import {
  clearAuthTokens,
  getAccessToken,
  getTokenPayload,
  isAccessTokenValid,
  resolveAuthSession,
} from "~/composables/useAuthTokens"
import type { User } from "~/interfaces/userInterfaces"

const isPublicAsset = (path: string) =>
  /\.(?:ico|png|jpe?g|gif|svg|webp|css|js|mjs|woff2?|ttf|txt|map)$/i.test(path) ||
  path.startsWith("/_nuxt/")

export default defineNuxtRouteMiddleware(async (to) => {
  if (isPublicAsset(to.path)) return

  try {
    const authStore = useAuthStore()
    const isLoginPage = to.path === "/login"
    const isHomePage = to.path === "/"
    const accessToken = getAccessToken()

    if (
      !isLoginPage &&
      !isHomePage &&
      authStore.token &&
      authStore.user &&
      isAccessTokenValid(accessToken)
    ) {
      return
    }

    const hasSession = await resolveAuthSession()

    if (!hasSession && !isLoginPage) {
      return navigateTo("/login")
    }

    if (hasSession && (isLoginPage || isHomePage)) {
      return navigateTo("/app")
    }

    const resolvedAccessToken = getAccessToken()

    // Session exists (e.g. page reload) but the store is empty: rehydrate the user.
    if (hasSession && resolvedAccessToken && !authStore.token) {
      try {
        const payload = getTokenPayload(resolvedAccessToken)

        const { $api } = useNuxtApp()
        const user = await $api<User>("/api/auth/me", { method: "GET" })

        authStore.setAuth({
          token: resolvedAccessToken,
          role: payload.role,
          user,
        })
      } catch {
        clearAuthTokens()
        authStore.logout()
        return navigateTo("/login")
      }
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    return navigateTo("/login")
  }
})
