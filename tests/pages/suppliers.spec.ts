import { beforeEach, describe, expect, it, vi } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import SuppliersPage from "~/pages/app/suppliers/index.vue"
import { useAuthStore } from "~/store/modules/auth"
import { useSuppliersStore } from "~/store/modules/supplier"

type Role = "ADMIN_USER" | "PURCHASING_USER" | "WAREHOUSE_USER" | "VIEWER"

const supplier = {
  id: 1,
  name: "Distribuidora Sur",
  rucNumber: "20123456789",
  contactName: "Luis",
  phone: "999",
  email: "ventas@sur.pe",
  isActive: true,
}

beforeEach(async () => {
  // A wide screen: the table (with its "Acciones" column), not the cards of a phone or an iPad held upright.
  ;(window as any).innerWidth = 1280
  window.dispatchEvent(new Event("resize"))
  await new Promise((resolve) => setTimeout(resolve, 200))

  const suppliers = useSuppliersStore()
  vi.spyOn(suppliers, "fetchSuppliers").mockImplementation(async () => {
    suppliers.data = { content: [supplier], page: 0, size: 10, totalElements: 1, totalPages: 1 } as any
  })
  vi.spyOn(suppliers, "fetchOptions").mockResolvedValue(undefined as any)
})

const mountAs = async (role: Role) => {
  useAuthStore().setAuth({ token: "t", role, user: { id: 1, firstName: "A", lastName: "B", role } as any })
  // The drawer needs the app layout around it; the form inside is covered by its own spec.
  const wrapper = await mountSuspended(SuppliersPage, { global: { stubs: { AppDrawer: true } } })
  await flushPromises()
  return wrapper
}

const buttonTexts = (wrapper: Awaited<ReturnType<typeof mountAs>>) => wrapper.findAll("button").map((button) => button.text())

describe("suppliers page", () => {
  it.each(["ADMIN_USER", "PURCHASING_USER"] as Role[])("%s can create, edit and delete", async (role) => {
    const wrapper = await mountAs(role)
    expect(wrapper.text()).toContain("Distribuidora Sur")
    expect(buttonTexts(wrapper)).toContain("Nuevo")
    expect(wrapper.text()).toContain("Acciones")
  })

  it("VIEWER only reads the list: no create button and no actions column", async () => {
    const wrapper = await mountAs("VIEWER")
    expect(wrapper.text()).toContain("Distribuidora Sur")
    expect(wrapper.text()).toContain("ventas@sur.pe")
    expect(buttonTexts(wrapper)).not.toContain("Nuevo")
    expect(wrapper.text()).not.toContain("Acciones")
  })
})
