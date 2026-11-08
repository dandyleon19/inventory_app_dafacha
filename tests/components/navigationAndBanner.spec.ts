import { beforeEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { VLayout } from "vuetify/components"
import AppSidebar from "~/components/app/shared/AppSidebar.vue"
import SubscriptionBanner from "~/components/app/shared/SubscriptionBanner.vue"
import { useAuthStore } from "~/store/modules/auth"
import { useSubscriptionStore } from "~/store/modules/subscription"

type Role = "SUPER_ADMIN" | "ADMIN_USER" | "WAREHOUSE_USER" | "PURCHASING_USER" | "VIEWER"

const signIn = (role: Role, companyName = "Acme") => {
  useAuthStore().setAuth({ token: "t", role, user: { id: 1, firstName: "A", lastName: "B", role, companyName } as any })
}

const setSubscription = (over: Record<string, unknown> = {}) => {
  const subscription = useSubscriptionStore()
  subscription.current = {
    planCode: "BASICO",
    planName: "Básico",
    status: "ACTIVE",
    blocked: false,
    daysRemaining: 30,
    features: ["purchase_orders", "audit_log"],
    currentPeriodEnd: null,
    ...over,
  } as any
  subscription.loaded = true
  subscription.fetchedAt = Date.now()
}

beforeEach(() => {
  useAuthStore().logout()
})

// The navigation drawer has to live inside a layout, like in the app.
const Layout = defineComponent({ render: () => h(VLayout, null, { default: () => h(AppSidebar) }) })

const menuTitles = async () => {
  const wrapper = await mountSuspended(Layout)
  await flushPromises()
  return wrapper.findAll(".v-list-item-title").map((item) => item.text())
}

describe("sidebar menu per role", () => {
  const all = [
    "Inventario",
    "Vencimientos",
    "Movimientos",
    "Órdenes de compra",
    "Recepciones",
    "Productos",
    "Categorías",
    "Proveedores",
    "Almacenes",
    "Usuarios",
    "Auditoría",
  ]

  it("SUPER_ADMIN sees only the platform: dashboard and companies", async () => {
    signIn("SUPER_ADMIN")
    expect(await menuTitles()).toEqual(["Dashboard", "Empresas"])
  })

  it("ADMIN_USER sees the whole company menu, with settings, and not the platform items", async () => {
    signIn("ADMIN_USER")
    setSubscription()
    const titles = await menuTitles()
    expect(titles).toEqual(["Dashboard", ...all, "Configuración"])
    expect(titles).not.toContain("Empresas")
  })

  it("WAREHOUSE_USER does not see suppliers, users, warehouses, categories, audit or settings", async () => {
    signIn("WAREHOUSE_USER")
    setSubscription()
    expect(await menuTitles()).toEqual([
      "Dashboard",
      "Inventario",
      "Vencimientos",
      "Movimientos",
      "Órdenes de compra",
      "Recepciones",
      "Productos",
    ])
  })

  it("PURCHASING_USER sees suppliers but not the admin sections", async () => {
    signIn("PURCHASING_USER")
    setSubscription()
    const titles = await menuTitles()
    expect(titles).toContain("Proveedores")
    for (const hidden of ["Categorías", "Almacenes", "Usuarios", "Auditoría", "Configuración"]) {
      expect(titles).not.toContain(hidden)
    }
  })

  it("VIEWER sees suppliers (read only) but not the admin sections", async () => {
    signIn("VIEWER")
    setSubscription()
    const titles = await menuTitles()
    expect(titles).toContain("Proveedores")
    for (const hidden of ["Categorías", "Almacenes", "Usuarios", "Auditoría", "Configuración"]) {
      expect(titles).not.toContain(hidden)
    }
  })

  it("an item of a feature the plan lacks stays in the menu but locked", async () => {
    signIn("ADMIN_USER")
    setSubscription({ features: [] })
    const wrapper = await mountSuspended(Layout)
    await flushPromises()
    const locked = wrapper.findAll(".app-sidebar__item--locked").map((item) => item.text())
    expect(locked).toEqual(expect.arrayContaining(["Órdenes de compra", "Recepciones", "Proveedores", "Auditoría"]))
    expect(locked).not.toContain("Productos")
  })
})

describe("subscription banner", () => {
  const banner = async () => {
    const wrapper = await mountSuspended(SubscriptionBanner)
    await flushPromises()
    return wrapper
  }

  it("shows nothing before the subscription is known, for SUPER_ADMIN, or when blocked", async () => {
    signIn("ADMIN_USER")
    expect((await banner()).text()).toBe("")

    setSubscription({ status: "TRIAL", daysRemaining: 3, blocked: true })
    expect((await banner()).text()).toBe("")

    signIn("SUPER_ADMIN")
    setSubscription({ status: "TRIAL", daysRemaining: 3 })
    expect((await banner()).text()).toBe("")
  })

  it("counts the days left of the trial", async () => {
    signIn("ADMIN_USER")
    setSubscription({ status: "TRIAL", daysRemaining: 5 })
    expect((await banner()).text()).toContain("Prueba gratuita: te quedan 5 días.")

    setSubscription({ status: "TRIAL", daysRemaining: 1 })
    expect((await banner()).text()).toContain("te quedan 1 día.")

    setSubscription({ status: "TRIAL", daysRemaining: 0 })
    expect((await banner()).text()).toContain("Tu prueba gratuita termina hoy.")
  })

  it("warns a few days before a paid plan ends, but not earlier", async () => {
    signIn("ADMIN_USER")
    setSubscription({ status: "ACTIVE", daysRemaining: 7 })
    expect((await banner()).text()).toContain("Tu plan vence en 7 días")

    setSubscription({ status: "ACTIVE", daysRemaining: 8 })
    expect((await banner()).text()).toBe("")

    setSubscription({ status: "ACTIVE", daysRemaining: null })
    expect((await banner()).text()).toBe("")
  })

  it("an overdue payment is a warning that cannot be closed", async () => {
    signIn("ADMIN_USER")
    setSubscription({ status: "PAST_DUE", daysRemaining: 2 })
    const wrapper = await banner()
    expect(wrapper.text()).toContain("Tu pago está vencido.")
    expect(wrapper.text()).toContain("en 2 días")
    expect(wrapper.find(".v-alert__close").exists()).toBe(false)
  })

  it("the trial notice can be closed", async () => {
    signIn("ADMIN_USER")
    setSubscription({ status: "TRIAL", daysRemaining: 5 })
    const wrapper = await banner()
    await wrapper.find(".v-alert__close button").trigger("click")
    await flushPromises()
    expect(wrapper.text()).toBe("")
  })
})
