import { beforeEach, describe, expect, it } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useAuthStore } from "~/store/modules/auth"
import { useSubscriptionStore } from "~/store/modules/subscription"

type Role = "SUPER_ADMIN" | "ADMIN_USER" | "WAREHOUSE_USER" | "PURCHASING_USER" | "VIEWER"

const signIn = (role: Role, extra: Record<string, unknown> = {}) => {
  const store = useAuthStore()
  store.setAuth({
    token: "t",
    role,
    user: { id: 1, firstName: "Ana", lastName: "Paz", email: "ana@x.com", role, isActive: true, ...extra } as any,
  })
  return store
}

beforeEach(() => setActivePinia(createPinia()))

describe("permission matrix (mirrors SecurityConfig in the backend)", () => {
  //            role              manage purchases operate receive
  const matrix: Array<[Role, boolean, boolean, boolean, boolean]> = [
    ["SUPER_ADMIN", true, true, true, true],
    ["ADMIN_USER", true, true, true, true],
    ["WAREHOUSE_USER", false, false, true, true],
    ["PURCHASING_USER", false, true, false, true],
    ["VIEWER", false, false, false, false],
  ]

  it.each(matrix)("%s", (role, canManage, canManagePurchases, canOperateStock, canReceiveGoods) => {
    const store = signIn(role)
    expect(store.canManage).toBe(canManage)
    expect(store.canManagePurchases).toBe(canManagePurchases)
    expect(store.canOperateStock).toBe(canOperateStock)
    expect(store.canReceiveGoods).toBe(canReceiveGoods)
  })

  it("isSuperAdmin / isAdmin / isViewer tell the roles apart", () => {
    expect(signIn("SUPER_ADMIN").isSuperAdmin).toBe(true)
    expect(signIn("SUPER_ADMIN").isAdmin).toBe(false)
    expect(signIn("ADMIN_USER").isAdmin).toBe(true)
    expect(signIn("VIEWER").isViewer).toBe(true)
  })
})

describe("setAuth", () => {
  it("builds fullName from the names when the API sends none", () => {
    const store = signIn("ADMIN_USER")
    expect(store.user?.fullName).toBe("Ana Paz")
  })

  it("keeps the role of the user (database) over the one in the token", () => {
    const store = useAuthStore()
    store.setAuth({ token: "t", role: "VIEWER", user: { id: 1, firstName: "A", lastName: "B", role: "ADMIN_USER" } as any })
    expect(store.role).toBe("ADMIN_USER")
  })

  it("works with only the token and its role (before /me is read)", () => {
    const store = useAuthStore()
    store.setAuth({ token: "t", role: "WAREHOUSE_USER" })
    expect(store.user).toBeNull()
    expect(store.effectiveRole).toBe("WAREHOUSE_USER")
    expect(store.canOperateStock).toBe(true)
  })

  it("a user with warehouses is limited to them; without any, to none", () => {
    expect(signIn("WAREHOUSE_USER", { warehouseIds: [1, 2] }).isLimitedToWarehouses).toBe(true)
    expect(signIn("WAREHOUSE_USER", { warehouseIds: [] }).isLimitedToWarehouses).toBe(false)
    expect(signIn("WAREHOUSE_USER").isLimitedToWarehouses).toBe(false)
  })
})

describe("logout", () => {
  it("clears the session and forgets the company's plan", () => {
    const store = signIn("ADMIN_USER")
    const subscription = useSubscriptionStore()
    subscription.current = { planCode: "BASICO", blocked: false, features: [] } as any
    subscription.loaded = true

    store.logout()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.role).toBeNull()
    expect(subscription.current).toBeNull()
    expect(subscription.loaded).toBe(false)
  })
})
