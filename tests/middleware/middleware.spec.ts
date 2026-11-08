import { beforeEach, describe, expect, it, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { useAuthStore } from "~/store/modules/auth"
import { useSubscriptionStore } from "~/store/modules/subscription"
import roleMiddleware from "~/middleware/role"
import platformMiddleware from "~/middleware/platform.global"
import subscriptionMiddleware from "~/middleware/subscription.global"

const { navigateToMock, showMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn((path: string) => ({ redirectedTo: path })),
  showMock: vi.fn(),
}))

mockNuxtImport("navigateTo", () => navigateToMock)
mockNuxtImport("useNotification", () => () => ({ show: showMock }))

type Role = "SUPER_ADMIN" | "ADMIN_USER" | "WAREHOUSE_USER" | "PURCHASING_USER" | "VIEWER"

const signIn = (role: Role) => {
  const auth = useAuthStore()
  auth.setAuth({ token: "t", role, user: { id: 1, firstName: "A", lastName: "B", email: "a@b.co", role } as any })
  return auth
}

const route = (path: string, meta: Record<string, unknown> = {}) => ({ path, meta }) as any

const run = (middleware: any, to: any) => middleware(to, to)

beforeEach(() => {
  setActivePinia(createPinia())
  navigateToMock.mockClear()
  showMock.mockClear()
})

describe("role middleware", () => {
  it("lets any signed-in user through a page that declares no roles", () => {
    signIn("VIEWER")
    expect(() => run(roleMiddleware, route("/app/products"))).not.toThrow()
    expect(() => run(roleMiddleware, route("/app/products", { allowedRoles: [] }))).not.toThrow()
  })

  it("lets an allowed role in", () => {
    signIn("ADMIN_USER")
    expect(() => run(roleMiddleware, route("/app/users", { allowedRoles: ["ADMIN_USER"] }))).not.toThrow()
  })

  it.each(["WAREHOUSE_USER", "PURCHASING_USER", "VIEWER", "SUPER_ADMIN"] as Role[])(
    "answers 403 to %s on an admin-only page",
    (role) => {
      signIn(role)
      expect(() => run(roleMiddleware, route("/app/users", { allowedRoles: ["ADMIN_USER"] }))).toThrowError(
        expect.objectContaining({ statusCode: 403 })
      )
    }
  )

  it("answers 403 when there is no role at all", () => {
    expect(() => run(roleMiddleware, route("/app/users", { allowedRoles: ["ADMIN_USER"] }))).toThrow()
  })
})

describe("platform middleware (SUPER_ADMIN only has the dashboard and the companies)", () => {
  it.each(["/app", "/app/", "/app/companies", "/app/companies/"])("lets SUPER_ADMIN into %s", (path) => {
    signIn("SUPER_ADMIN")
    expect(run(platformMiddleware, route(path))).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it.each([
    "/app/inventory",
    "/app/products",
    "/app/users",
    "/app/suppliers",
    "/app/purchase-orders",
    "/app/settings",
    "/app/companies/5",
  ])("sends SUPER_ADMIN from %s to the dashboard", (path) => {
    signIn("SUPER_ADMIN")
    run(platformMiddleware, route(path))
    expect(navigateToMock).toHaveBeenCalledWith("/app")
  })

  it.each(["ADMIN_USER", "WAREHOUSE_USER", "PURCHASING_USER", "VIEWER"] as Role[])(
    "does not touch the navigation of %s",
    (role) => {
      signIn(role)
      expect(run(platformMiddleware, route("/app/inventory"))).toBeUndefined()
      expect(navigateToMock).not.toHaveBeenCalled()
    }
  )

  it("ignores pages outside /app and visitors that are not signed in", () => {
    signIn("SUPER_ADMIN")
    expect(run(platformMiddleware, route("/login"))).toBeUndefined()

    setActivePinia(createPinia())
    expect(run(platformMiddleware, route("/app/inventory"))).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})

describe("subscription middleware", () => {
  const withSubscription = (over: Record<string, unknown>) => {
    const subscription = useSubscriptionStore()
    subscription.current = {
      planName: "Básico",
      status: "TRIAL",
      blocked: false,
      features: ["purchase_orders"],
      ...over,
    } as any
    subscription.loaded = true
    subscription.fetchedAt = Date.now()
    return subscription
  }

  it("never limits SUPER_ADMIN, nor pages outside /app", async () => {
    signIn("SUPER_ADMIN")
    withSubscription({ blocked: true })
    expect(await run(subscriptionMiddleware, route("/app/inventory"))).toBeUndefined()

    signIn("ADMIN_USER")
    expect(await run(subscriptionMiddleware, route("/login"))).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("sends a blocked company to the 'subscription expired' page from anywhere", async () => {
    signIn("ADMIN_USER")
    withSubscription({ blocked: true, status: "EXPIRED" })
    await run(subscriptionMiddleware, route("/app/inventory"))
    expect(navigateToMock).toHaveBeenCalledWith("/app/subscription-expired")
  })

  it("lets a blocked company stay on that page", async () => {
    signIn("ADMIN_USER")
    withSubscription({ blocked: true })
    expect(await run(subscriptionMiddleware, route("/app/subscription-expired"))).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("sends a company that is fine away from the 'subscription expired' page", async () => {
    signIn("ADMIN_USER")
    withSubscription({ blocked: false })
    await run(subscriptionMiddleware, route("/app/subscription-expired"))
    expect(navigateToMock).toHaveBeenCalledWith("/app")
  })

  it("lets a page through when the plan includes its feature", async () => {
    signIn("ADMIN_USER")
    withSubscription({ features: ["purchase_orders", "audit_log"] })
    expect(await run(subscriptionMiddleware, route("/app/audit"))).toBeUndefined()
    expect(await run(subscriptionMiddleware, route("/app/suppliers"))).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("sends the user to the dashboard, with a notice, when the plan lacks the feature", async () => {
    signIn("ADMIN_USER")
    withSubscription({ features: ["purchase_orders"] })
    await run(subscriptionMiddleware, route("/app/audit"))
    expect(navigateToMock).toHaveBeenCalledWith("/app")
    expect(showMock).toHaveBeenCalledTimes(1)
    expect(showMock.mock.calls[0]![0]).toMatchObject({ type: "warning" })
  })

  it("does not limit core pages", async () => {
    signIn("WAREHOUSE_USER")
    withSubscription({ features: [] })
    expect(await run(subscriptionMiddleware, route("/app/inventory"))).toBeUndefined()
    expect(await run(subscriptionMiddleware, route("/app/products"))).toBeUndefined()
  })
})
