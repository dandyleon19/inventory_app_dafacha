import { useAuthStore } from "~/store/modules/auth"

const ACCESS_TOKEN_COOKIE = "access_token"
const REFRESH_TOKEN_COOKIE = "refresh_token"

const ACCESS_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as const

const REFRESH_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const

let refreshPromise: Promise<boolean> | null = null

export const getTokenPayload = (token: string) => {
  return JSON.parse(atob(token.split(".")[1]))
}

export const isAccessTokenValid = (token: string | null | undefined): boolean => {
  if (!token) return false

  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false

    const payload = getTokenPayload(token)
    if (typeof payload.exp === "number") {
      return payload.exp * 1000 > Date.now()
    }

    return true
  } catch {
    return false
  }
}

export const clearAuthTokens = () => {
  useCookie(ACCESS_TOKEN_COOKIE, ACCESS_COOKIE_OPTIONS).value = null
  useCookie(REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_OPTIONS).value = null
}

export const setAuthTokens = (token: string, refreshToken: string) => {
  useCookie(ACCESS_TOKEN_COOKIE, ACCESS_COOKIE_OPTIONS).value = token
  useCookie(REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_OPTIONS).value = refreshToken
}

const syncAuthStoreToken = (token: string) => {
  const authStore = useAuthStore()
  if (!authStore.user) return

  const payload = getTokenPayload(token)
  authStore.setAuth({
    token,
    role: payload.role,
    user: authStore.user,
  })
}

const doRefresh = async (): Promise<boolean> => {
  const refreshToken = useCookie(REFRESH_TOKEN_COOKIE).value
  if (!refreshToken) return false

  const config = useRuntimeConfig()

  try {
    const data = await $fetch<{ token: string; refreshToken: string }>(
      "/api/auth/refresh",
      {
        baseURL: config.public.apiBase,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { refreshToken },
      }
    )

    setAuthTokens(data.token, data.refreshToken)
    syncAuthStoreToken(data.token)
    return true
  } catch {
    return false
  }
}

export const tryRefreshToken = async (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export const getAccessToken = () => useCookie(ACCESS_TOKEN_COOKIE).value

export const getRefreshToken = () => useCookie(REFRESH_TOKEN_COOKIE).value

/**
 * Returns true when the user has a usable session.
 * Invalid access tokens without a refresh token are cleared.
 */
export const resolveAuthSession = async (): Promise<boolean> => {
  const accessToken = getAccessToken()

  if (isAccessTokenValid(accessToken)) {
    return true
  }

  if (getRefreshToken()) {
    return tryRefreshToken()
  }

  if (accessToken) {
    clearAuthTokens()
    useAuthStore().logout()
  }

  return false
}

export const shouldSkipAuthRetry = (url: string) =>
  ["/api/auth/refresh", "/api/auth/login", "/api/auth/logout"].some((path) =>
    url.includes(path)
  )
