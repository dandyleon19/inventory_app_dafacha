import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useSubscriptionStore } from "~/store/modules/subscription"
import { requiredFeatureForPath } from "~/interfaces/subscriptionInterfaces"
import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { makeStubApi } from "../utils/api"

const holder = vi.hoisted(() => ({ current: undefined as any }))
mockNuxtImport("useNuxtApp", () => () => ({ $api: (...args: any[]) => holder.current?.(...args) }))
const stubApi = makeStubApi(holder)

const info = (over: Record<string, unknown> = {}) => ({
  companyId: 7,
  planCode: "BASICO",
  planName: "Básico",
  status: "TRIAL",
  blocked: false,
  daysRemaining: 10,
  features: ["purchase_orders"],
  ...over,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe("hasFeature", () => {
  it("shows everything until the subscription is known (the menu does not flicker)", () => {
    expect(useSubscriptionStore().hasFeature("audit_log")).toBe(true)
  })

  it("only allows the features of the plan once loaded", () => {
    const store = useSubscriptionStore()
    store.current = info() as any
    store.loaded = true
    expect(store.hasFeature("purchase_orders")).toBe(true)
    expect(store.hasFeature("audit_log")).toBe(false)
  })
})

describe("fetchMine", () => {
  it("reads /api/subscription/me and then trusts it for a while", async () => {
    const api = stubApi(() => info())
    const store = useSubscriptionStore()

    await store.fetchMine()
    await store.fetchMine()

    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith("/api/subscription/me", { method: "GET" })
    expect(store.planName).toBe("Básico")
    expect(store.isBlocked).toBe(false)
    expect(store.isStale).toBe(false)
  })

  it("force reads it again", async () => {
    const api = stubApi(() => info())
    const store = useSubscriptionStore()
    await store.fetchMine()
    await store.fetchMine(true)
    expect(api).toHaveBeenCalledTimes(2)
  })

  it("stays unloaded when the call fails", async () => {
    stubApi(() => {
      throw new Error("down")
    })
    const store = useSubscriptionStore()
    await store.fetchMine()
    expect(store.loaded).toBe(false)
    expect(store.loading).toBe(false)
  })
})

describe("markBlocked (the API answered 402)", () => {
  it("blocks locally even when the subscription cannot be read", async () => {
    stubApi(() => {
      throw new Error("down")
    })
    const store = useSubscriptionStore()
    await store.markBlocked()
    expect(store.isBlocked).toBe(true)
    expect(store.loaded).toBe(true)
  })

  it("keeps what the API says when it can be read", async () => {
    stubApi(() => info({ blocked: true, status: "SUSPENDED" }))
    const store = useSubscriptionStore()
    await store.markBlocked()
    expect(store.isBlocked).toBe(true)
    expect(store.status).toBe("SUSPENDED")
  })
})

describe("SUPER_ADMIN management calls", () => {
  it("activate with a date sends planCode + paidUntil", async () => {
    const api = stubApi()
    await useSubscriptionStore().activate(7, "PREMIUM", "2026-12-31")
    expect(api).toHaveBeenCalledWith("/api/subscriptions/7/activate", {
      method: "POST",
      body: { planCode: "PREMIUM", paidUntil: "2026-12-31" },
    })
  })

  it("activate without a date sends noExpiry (the backend requires one or the other)", async () => {
    const api = stubApi()
    await useSubscriptionStore().activate(7, "PREMIUM", null)
    expect(api).toHaveBeenCalledWith("/api/subscriptions/7/activate", {
      method: "POST",
      body: { planCode: "PREMIUM", noExpiry: true },
    })
  })

  it("trial days, suspend and resume use the backend's routes and body fields", async () => {
    const api = stubApi()
    const store = useSubscriptionStore()
    await store.setTrialDays(7, 14)
    await store.suspend(7, "No pagó")
    await store.resume(7)
    expect(api).toHaveBeenNthCalledWith(1, "/api/subscriptions/7/trial-days", { method: "POST", body: { days: 14 } })
    expect(api).toHaveBeenNthCalledWith(2, "/api/subscriptions/7/suspend", { method: "POST", body: { reason: "No pagó" } })
    expect(api).toHaveBeenNthCalledWith(3, "/api/subscriptions/7/resume", { method: "POST" })
  })

  it("fetchAll, fetchPlans (once) and fetchEvents", async () => {
    const api = stubApi((url) => (url === "/api/plans" ? [{ code: "BASICO" }] : []))
    const store = useSubscriptionStore()
    await store.fetchAll()
    await store.fetchPlans()
    await store.fetchPlans()
    await store.fetchEvents(7)
    expect(api.mock.calls.map((call) => call[0])).toEqual([
      "/api/subscriptions",
      "/api/plans",
      "/api/subscriptions/7/events",
    ])
  })
})

describe("requiredFeatureForPath (mirrors FeatureRoutes in the backend)", () => {
  it.each([
    ["/app/purchase-orders", "purchase_orders"],
    ["/app/purchase-orders/12", "purchase_orders"],
    ["/app/suppliers", "purchase_orders"],
    ["/app/receipts", "purchase_orders"],
    ["/app/audit", "audit_log"],
    ["/app/products", null],
    ["/app/inventory", null],
    ["/app", null],
  ])("%s -> %s", (path, feature) => {
    expect(requiredFeatureForPath(path)).toBe(feature)
  })
})
