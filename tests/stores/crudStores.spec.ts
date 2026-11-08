import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useProductsStore } from "~/store/modules/product"
import { useProductCategoriesStore } from "~/store/modules/productCategory"
import { useWarehousesStore } from "~/store/modules/warehouse"
import { useSuppliersStore } from "~/store/modules/supplier"
import { useUsersStore } from "~/store/modules/user"
import { useCompanyStore } from "~/store/modules/company"
import { useCompanyAdminStore } from "~/store/modules/companyAdmin"
import { usePurchaseOrdersStore } from "~/store/modules/purchaseOrder"
import { useStockStore } from "~/store/modules/stock"
import { useAuditStore } from "~/store/modules/audit"
import { useDashboardStore } from "~/store/modules/dashboard"
import { useAuthStore } from "~/store/modules/auth"
import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { makeStubApi } from "../utils/api"

const holder = vi.hoisted(() => ({ current: undefined as any }))
mockNuxtImport("useNuxtApp", () => () => ({ $api: (...args: any[]) => holder.current?.(...args) }))
const stubApi = makeStubApi(holder)

const page = (content: unknown[] = []) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe("products", () => {
  it("lists with page, size, trimmed search and filters, and only sends the ones given", async () => {
    const api = stubApi(() => page([{ id: 1 }]))
    const store = useProductsStore()

    await store.fetchProducts({ page: 2, size: 20, search: "  agua ", categoryId: 3, isActive: false })

    expect(api).toHaveBeenCalledWith("/api/products", {
      method: "GET",
      query: { page: 2, size: 20, search: "agua", categoryId: 3, isActive: false },
    })
    expect(store.data?.content).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it("defaults to the first page of 10 with no filters", async () => {
    const api = stubApi(() => page())
    await useProductsStore().fetchProducts()
    expect(api).toHaveBeenCalledWith("/api/products", { method: "GET", query: { page: 0, size: 10 } })
  })

  it("keeps the previous list and stops loading when the call fails", async () => {
    stubApi(() => {
      throw new Error("down")
    })
    const store = useProductsStore()
    await store.fetchProducts()
    expect(store.data).toBeNull()
    expect(store.loading).toBe(false)
  })

  it("create / update / delete", async () => {
    const api = stubApi()
    const store = useProductsStore()
    const body = { name: "Agua" } as any
    await store.createProduct(body)
    await store.updateProduct(5, body)
    await store.deleteProduct(5)
    expect(api).toHaveBeenNthCalledWith(1, "/api/products", { method: "POST", body })
    expect(api).toHaveBeenNthCalledWith(2, "/api/products/5", { method: "PUT", body })
    expect(api).toHaveBeenNthCalledWith(3, "/api/products/5", { method: "DELETE" })
  })

  it("lets a failed save reach the caller so the form can show the API's message", async () => {
    stubApi(() => {
      throw Object.assign(new Error("409"), { data: { message: "Ya existe" } })
    })
    await expect(useProductsStore().createProduct({} as any)).rejects.toThrow("409")
  })
})

describe.each([
  ["categories", () => useProductCategoriesStore(), "/api/product-categories", "fetchProductCategories", "createProductCategory", "updateProductCategory", "deleteProductCategory"],
  ["warehouses", () => useWarehousesStore(), "/api/warehouses", "fetchWarehouses", "createWarehouse", "updateWarehouse", "deleteWarehouse"],
  ["suppliers", () => useSuppliersStore(), "/api/suppliers", "fetchSuppliers", "createSupplier", "updateSupplier", "deleteSupplier"],
] as const)("%s", (_name, useStore, url, fetchName, createName, updateName, deleteName) => {
  it("lists a page with the normalized search", async () => {
    const api = stubApi(() => page([{ id: 1 }]))
    const store: any = useStore()

    await store[fetchName](1, 5, "  caja ")

    expect(api).toHaveBeenCalledWith(url, { method: "GET", query: { page: 1, size: 5, search: "caja" } })
    expect(store.data.content).toHaveLength(1)
  })

  it("does not send an empty search", async () => {
    const api = stubApi(() => page())
    await (useStore() as any)[fetchName](0, 10, "   ")
    expect(api).toHaveBeenCalledWith(url, { method: "GET", query: { page: 0, size: 10 } })
  })

  it("fetchOptions asks for the biggest page and tolerates a failure", async () => {
    const api = stubApi(() => page([{ id: 1 }, { id: 2 }]))
    const store: any = useStore()
    await store.fetchOptions()
    expect(api).toHaveBeenCalledWith(url, { method: "GET", query: { page: 0, size: 100 } })
    expect(store.options).toHaveLength(2)

    stubApi(() => {
      throw new Error("down")
    })
    await store.fetchOptions()
    expect(store.options).toEqual([])
  })

  it("create / update / delete", async () => {
    const api = stubApi()
    const store: any = useStore()
    const body = { name: "x" }
    await store[createName](body)
    await store[updateName](9, body)
    await store[deleteName](9)
    expect(api).toHaveBeenNthCalledWith(1, url, { method: "POST", body })
    expect(api).toHaveBeenNthCalledWith(2, `${url}/9`, { method: "PUT", body })
    expect(api).toHaveBeenNthCalledWith(3, `${url}/9`, { method: "DELETE" })
  })
})

describe("users", () => {
  it("lists with role and active filters", async () => {
    const api = stubApi(() => page())
    await useUsersStore().fetchUsers({ page: 1, size: 5, search: "ana", role: "VIEWER", isActive: true })
    expect(api).toHaveBeenCalledWith("/api/users", {
      method: "GET",
      query: { page: 1, size: 5, search: "ana", role: "VIEWER", isActive: true },
    })
  })

  it("create / update / reset password", async () => {
    const api = stubApi()
    const store = useUsersStore()
    const body = { email: "a@b.co" } as any
    await store.createUser(body)
    await store.updateUser(3, body)
    await store.resetPassword(3, "nueva-clave-1")
    expect(api).toHaveBeenNthCalledWith(1, "/api/users", { method: "POST", body })
    expect(api).toHaveBeenNthCalledWith(2, "/api/users/3", { method: "PUT", body })
    expect(api).toHaveBeenNthCalledWith(3, "/api/users/3/password", { method: "PUT", body: { password: "nueva-clave-1" } })
  })
})

describe("company (the signed-in user's own)", () => {
  it("loads the company and its settings", async () => {
    const api = stubApi((url) => (url === "/api/company" ? { id: 1, name: "Acme" } : { requireProductSku: true }))
    const store = useCompanyStore()
    await store.fetchCompany()
    await store.fetchSettings()
    expect(api).toHaveBeenNthCalledWith(1, "/api/company", { method: "GET" })
    expect(api).toHaveBeenNthCalledWith(2, "/api/company/settings", { method: "GET" })
    expect(store.company?.name).toBe("Acme")
    expect(store.settings.requireProductSku).toBe(true)
  })

  it("starts with nothing mandatory until the real settings load", () => {
    const { settings } = useCompanyStore()
    expect(settings.requireProductSku).toBe(false)
    expect(settings.requireProductCategory).toBe(false)
    expect(settings.requireProductBarcode).toBe(false)
  })

  it("renaming the company updates the name shown in the navbar", async () => {
    stubApi(() => ({ id: 1, name: "Nuevo nombre" }))
    const auth = useAuthStore()
    auth.setAuth({ token: "t", role: "ADMIN_USER", user: { id: 1, firstName: "A", lastName: "B", role: "ADMIN_USER", companyName: "Viejo" } as any })

    await useCompanyStore().updateCompany({ name: "Nuevo nombre" } as any)

    expect(auth.user?.companyName).toBe("Nuevo nombre")
  })

  it("saves the settings", async () => {
    const api = stubApi((_url, options) => options?.body)
    const body = { requireProductSku: true } as any
    await useCompanyStore().updateSettings(body)
    expect(api).toHaveBeenCalledWith("/api/company/settings", { method: "PUT", body })
  })
})

describe("companies (SUPER_ADMIN)", () => {
  it("creates a company together with its first administrator in one body", async () => {
    const api = stubApi()
    const company = { name: "Acme" } as any
    const admin = { firstName: "A", lastName: "B", email: "a@b.co", password: "12345678" }
    await useCompanyAdminStore().createCompany(company, admin)
    expect(api).toHaveBeenCalledWith("/api/companies", { method: "POST", body: { company, admin } })
  })

  it("list / update / delete", async () => {
    const api = stubApi(() => page())
    const store = useCompanyAdminStore()
    await store.fetchCompanies(0, 10, " acme ")
    await store.updateCompany(4, { name: "x" } as any)
    await store.deleteCompany(4)
    expect(api).toHaveBeenNthCalledWith(1, "/api/companies", { method: "GET", query: { page: 0, size: 10, search: "acme" } })
    expect(api).toHaveBeenNthCalledWith(2, "/api/companies/4", { method: "PUT", body: { name: "x" } })
    expect(api).toHaveBeenNthCalledWith(3, "/api/companies/4", { method: "DELETE" })
  })
})

describe("purchase orders", () => {
  it("lists with status and supplier filters", async () => {
    const api = stubApi(() => page())
    await usePurchaseOrdersStore().fetchOrders({ page: 0, size: 10, search: "OC-1", status: "DRAFT", supplierId: 2 } as any)
    expect(api).toHaveBeenCalledWith("/api/purchase-orders", {
      method: "GET",
      query: { page: 0, size: 10, search: "OC-1", status: "DRAFT", supplierId: 2 },
    })
  })

  it("every transition goes to its own endpoint", async () => {
    const api = stubApi()
    const store = usePurchaseOrdersStore()
    const body = { items: [] } as any
    await store.fetchOrder(8)
    await store.createOrder(body)
    await store.updateOrder(8, body)
    await store.markOrdered(8)
    await store.receive(8, body)
    await store.cancelOrder(8)
    await store.deleteOrder(8)
    expect(api.mock.calls.map(([url, options]) => `${options?.method} ${url}`)).toEqual([
      "GET /api/purchase-orders/8",
      "POST /api/purchase-orders",
      "PUT /api/purchase-orders/8",
      "POST /api/purchase-orders/8/order",
      "POST /api/purchase-orders/8/receive",
      "POST /api/purchase-orders/8/cancel",
      "DELETE /api/purchase-orders/8",
    ])
  })
})

describe("stock", () => {
  it("lists levels with the low stock flag only when on", async () => {
    const api = stubApi(() => page())
    const store = useStockStore()
    await store.fetchStock({ lowStockOnly: true, warehouseId: 2 })
    await store.fetchStock({})
    expect(api).toHaveBeenNthCalledWith(1, "/api/stock", { method: "GET", query: { page: 0, size: 10, warehouseId: 2, lowStockOnly: true } })
    expect(api).toHaveBeenNthCalledWith(2, "/api/stock", { method: "GET", query: { page: 0, size: 10 } })
  })

  it("fetchQuantity is the first row's quantity, or 0", async () => {
    stubApi(() => page([{ quantity: 12.5 }]))
    expect(await useStockStore().fetchQuantity(1, 2)).toBe(12.5)
    stubApi(() => page([]))
    expect(await useStockStore().fetchQuantity(1, 2)).toBe(0)
    stubApi(() => {
      throw new Error("down")
    })
    expect(await useStockStore().fetchQuantity(1, 2)).toBe(0)
  })

  it("lots and cost layers are asked per product and warehouse (the backend requires both)", async () => {
    const api = stubApi((url) => (url === "/api/stock/lots" ? page([{ id: 1 }]) : [{ id: 9 }]))
    const store = useStockStore()
    expect(await store.fetchLotsOf(1, 2)).toHaveLength(1)
    expect(await store.fetchCostLayers(1, 2)).toHaveLength(1)
    expect(api).toHaveBeenNthCalledWith(1, "/api/stock/lots", { method: "GET", query: { page: 0, size: 100, scope: "ALL", productId: 1, warehouseId: 2 } })
    expect(api).toHaveBeenNthCalledWith(2, "/api/stock/cost-layers", { method: "GET", query: { productId: 1, warehouseId: 2 } })
  })

  it("movements and lots lists send only the filters given", async () => {
    const api = stubApi(() => page())
    const store = useStockStore()
    await store.fetchMovements({ productId: 1, type: "ENTRY" } as any)
    await store.fetchLots({ scope: "EXPIRED" } as any)
    expect(api).toHaveBeenNthCalledWith(1, "/api/stock/movements", { method: "GET", query: { page: 0, size: 10, productId: 1, type: "ENTRY" } })
    expect(api).toHaveBeenNthCalledWith(2, "/api/stock/lots", { method: "GET", query: { page: 0, size: 10, scope: "EXPIRED" } })
  })

  it.each([
    ["entry", "/api/stock/entries"],
    ["exit", "/api/stock/exits"],
    ["adjustment", "/api/stock/adjustments"],
    ["transfer", "/api/stock/transfers"],
  ])("register(%s) goes to %s", async (kind, url) => {
    const api = stubApi()
    const body = { productId: 1 } as any
    await useStockStore().register({ kind, body } as any)
    expect(api).toHaveBeenCalledWith(url, { method: "POST", body })
  })

  it("clearMovements forgets the loaded history", () => {
    const store = useStockStore()
    store.movements = page([{ id: 1 }]) as any
    store.clearMovements()
    expect(store.movements).toBeNull()
  })
})

describe("audit", () => {
  it("sends the filters the backend accepts", async () => {
    const api = stubApi(() => page())
    await useAuditStore().fetchLogs({ page: 0, size: 20, search: "x", entityType: "PRODUCT", action: "CREATE", userId: 4, from: "2026-01-01", to: "2026-01-31" } as any)
    expect(api).toHaveBeenCalledWith("/api/audit", {
      method: "GET",
      query: { page: 0, size: 20, search: "x", entityType: "PRODUCT", action: "CREATE", userId: 4, from: "2026-01-01", to: "2026-01-31" },
    })
  })
})

describe("dashboard", () => {
  it("reads the summary once and reuses it while it is fresh", async () => {
    const api = stubApi(() => ({ lowStockCount: 2, expiringLotCount: 1, arrivingOrderCount: 3 }))
    const store = useDashboardStore()
    await store.fetchSummary()
    await store.fetchSummary()
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith("/api/dashboard", { method: "GET" })

    await store.fetchSummary(true)
    expect(api).toHaveBeenCalledTimes(2)
  })
})
