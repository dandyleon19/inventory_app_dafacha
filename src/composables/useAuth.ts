import { useAuthStore } from "~/store/modules/auth"
import {
  clearAuthTokens,
  getRefreshToken,
  getTokenPayload,
  setAuthTokens,
} from "~/composables/useAuthTokens"
import type { AuthResponse } from "~/interfaces/authInterfaces"
import type { User } from "~/interfaces/userInterfaces"

export const useAuth = () => {
  const config = useRuntimeConfig()
  const { $api } = useNuxtApp()

  const login = async (email: string, password: string) => {
    const authStore = useAuthStore()

    const response = await $fetch<AuthResponse>(`${config.public.apiBase}/api/auth/login`, {
      method: "POST",
      body: {
        email: email.trim(),
        password,
      },
    })

    setAuthTokens(response.token, response.refreshToken)

    try {
      // Explicit header: the cookie may not be readable yet right after setAuthTokens.
      const user = await $api<User>("/api/auth/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${response.token}` },
      })

      authStore.setAuth({
        token: response.token,
        role: response.role ?? getTokenPayload(response.token).role,
        user,
      })

      return { ...response, user }
    } catch (error) {
      clearAuthTokens()
      authStore.logout()
      throw error
    }
  }

  const logout = async () => {
    const authStore = useAuthStore()
    const refreshToken = getRefreshToken()

    try {
      if (refreshToken) {
        await $fetch(`${config.public.apiBase}/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { refreshToken },
        })
      }
    } catch {
      // Local logout even if the API call fails.
    }

    clearAuthTokens()
    authStore.logout()

    await navigateTo("/login")
  }

  return { login, logout }
}
