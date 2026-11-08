import { vi } from "vitest"

export interface ApiHolder {
  current: ((url: string, options?: Record<string, any>) => unknown) | undefined
}

/**
 * Nuxt gives `$api` (the ofetch instance every store uses) as a read-only property of the app, so a store spec swaps
 * `useNuxtApp` instead (see `mockNuxtImport` in the specs) and points it at this holder.
 *
 * Usage in a spec:
 *   const holder = vi.hoisted(() => ({ current: undefined }))
 *   mockNuxtImport("useNuxtApp", () => () => ({ $api: (...args: any[]) => holder.current?.(...args) }))
 *   const stubApi = makeStubApi(holder)
 *
 * `stubApi(impl)` returns the spy so the test can check which endpoint, method, query and body the store sent.
 */
export const makeStubApi = (holder: ApiHolder) => (impl: (url: string, options?: Record<string, any>) => unknown = () => ({})) => {
  const api = vi.fn(async (url: string, options?: Record<string, any>) => impl(url, options))
  holder.current = api as any
  return api
}
