import { useAuthStore } from "~/store/modules/auth"
import {
  clearAuthTokens,
  getAccessToken,
  shouldSkipAuthRetry,
  tryRefreshToken,
} from "~/composables/useAuthTokens"

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    headers: {
      "Content-Type": "application/json",
    },
    onRequest({ options }) {
      const token = getAccessToken()
      if (token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        }
      }
    },
    async onResponseError({ request, response, options }) {
      if (response.status !== 401) return

      const url = request.toString()
      if (shouldSkipAuthRetry(url)) return

      const refreshed = await tryRefreshToken()
      if (refreshed) {
        const token = getAccessToken()
        options.headers = {
          ...(options.headers as Record<string, string>),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        return api(request, options)
      }

      clearAuthTokens()
      useAuthStore().logout()

      if (import.meta.client) {
        await navigateTo("/login")
      }
    },
  })

  return {
    provide: {
      api,
    },
  }
})
