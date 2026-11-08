import { beforeEach, describe, expect, it } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import UserForm from "~/components/app/users/UserForm.vue"
import WarehouseForm from "~/components/app/warehouses/WarehouseForm.vue"
import RemoteSelect from "~/components/app/shared/RemoteSelect.vue"
import { useAuthStore } from "~/store/modules/auth"
import { recordQueryEndpoint } from "../utils/endpoints"
import { fillAll, findInput, submit, submitted } from "../utils/forms"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const settle = async () => {
  await wait(150)
  await flushPromises()
}

const companies = [
  { id: 7, name: "Acme" },
  { id: 8, name: "Beta" },
]
const companyList = recordQueryEndpoint("/api/companies", () => ({
  content: companies,
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
}))

// Picking an id from code asks the server for that company.
const companyById = companies.map((company) => recordQueryEndpoint(`/api/companies/${company.id}`, () => company))

// The warehouses of each company, as the server answers when asked `?companyId=`.
const warehousesByCompany: Record<string, Array<Record<string, unknown>>> = {
  "7": [{ id: 70, name: "Acme central", isActive: true }],
  "8": [{ id: 80, name: "Beta sur", isActive: true }],
}
const warehouseList = recordQueryEndpoint("/api/warehouses", (query) => {
  const content = warehousesByCompany[query.companyId ?? ""] ?? []
  return { content, page: 0, size: 100, totalElements: content.length, totalPages: 1 }
})

const signIn = (role: "SUPER_ADMIN" | "ADMIN_USER") => {
  useAuthStore().setAuth({ token: "t", role, user: { id: 100, firstName: "Yo", lastName: "Mismo", role, companyId: 1 } as any })
}

const person = { Nombres: "Ana", Apellidos: "Paz", Correo: "ana@empresa.com", Contraseña: "clave-segura-1" }

const pickCompany = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>, id: number) => {
  wrapper.findComponent(RemoteSelect).vm.$emit("update:modelValue", id)
  await settle()
}

beforeEach(() => {
  companyList.reset()
  companyById.forEach((endpoint) => endpoint.reset())
  warehouseList.reset()
})

describe("UserForm: who chooses the company", () => {
  const mountUserForm = (props: Record<string, unknown> = {}) =>
    mountSuspended(UserForm, { props: { action: "create", warehouses: [{ id: 1, name: "Propio", isActive: true }], ...props } })

  it("the platform owner must choose the company when creating a user", async () => {
    signIn("SUPER_ADMIN")
    const wrapper = await mountUserForm()
    expect(wrapper.findComponent(RemoteSelect).exists()).toBe(true)

    await fillAll(wrapper, person)
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0) // no company chosen yet
  })

  it("sends the chosen company with the user", async () => {
    signIn("SUPER_ADMIN")
    const wrapper = await mountUserForm()
    await fillAll(wrapper, person)
    await pickCompany(wrapper, 7)
    await submit(wrapper)

    expect(submitted(wrapper)[0]).toMatchObject({ email: "ana@empresa.com", companyId: 7 })
  })

  it("the admin of a company never sees the company select nor sends a company", async () => {
    signIn("ADMIN_USER")
    const wrapper = await mountUserForm()
    expect(wrapper.findComponent(RemoteSelect).exists()).toBe(false)

    await fillAll(wrapper, person)
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
    expect(submitted(wrapper)[0]).not.toHaveProperty("companyId")
    expect(warehouseList.queries).toHaveLength(0) // the admin uses the warehouses the page handed in
  })

  it("editing a user never offers to change their company", async () => {
    signIn("SUPER_ADMIN")
    const wrapper = await mountUserForm({
      action: "update",
      user: { id: 5, firstName: "Ana", lastName: "Paz", email: "a@b.co", isActive: true, role: "VIEWER", companyId: 8 },
    })
    expect(wrapper.findComponent(RemoteSelect).exists()).toBe(false)

    await submit(wrapper)
    expect(submitted(wrapper)[0]).not.toHaveProperty("companyId")
  })

  it("the platform owner picks the allowed warehouses from the chosen company, not from their own", async () => {
    signIn("SUPER_ADMIN")
    const wrapper = await mountUserForm()
    await pickCompany(wrapper, 7)
    await fillAll(wrapper, { "Puede usar todos los almacenes": false })
    await settle()

    expect(warehouseList.queries.at(-1)).toMatchObject({ companyId: "7", isActive: "true" })
    const names = () => (findInput(wrapper, "Almacenes permitidos").props("items") as Array<{ name: string }>).map((w) => w.name)
    expect(names()).toEqual(["Acme central"])

    // Another company has other warehouses.
    await pickCompany(wrapper, 8)
    expect(names()).toEqual(["Beta sur"])
  })

  it("changing the company forgets the warehouses picked for the previous one", async () => {
    signIn("SUPER_ADMIN")
    const wrapper = await mountUserForm()
    await fillAll(wrapper, person)
    await pickCompany(wrapper, 7)
    await fillAll(wrapper, { "Puede usar todos los almacenes": false })
    await settle()
    await fillAll(wrapper, { "Almacenes permitidos": [70] })

    await pickCompany(wrapper, 8)
    await fillAll(wrapper, { "Almacenes permitidos": [80] })
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toMatchObject({ companyId: 8, warehouseIds: [80] })
  })

  it("an admin's own warehouses are listed for them, as before", async () => {
    signIn("ADMIN_USER")
    const wrapper = await mountUserForm()
    await fillAll(wrapper, { "Puede usar todos los almacenes": false })
    const names = (findInput(wrapper, "Almacenes permitidos").props("items") as Array<{ name: string }>).map((w) => w.name)
    expect(names).toEqual(["Propio"])
  })
})

describe("WarehouseForm: who chooses the company", () => {
  const mountWarehouseForm = (props: Record<string, unknown> = {}) =>
    mountSuspended(WarehouseForm, { props: { action: "create", ...props } })

  it("the platform owner must choose the company, and it is sent with the warehouse", async () => {
    signIn("SUPER_ADMIN")
    const wrapper = await mountWarehouseForm()
    await fillAll(wrapper, { Nombre: "Central" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0) // no company yet

    await pickCompany(wrapper, 8)
    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([{ name: "Central", address: null, isActive: true, companyId: 8 }])
  })

  it("the admin of a company never sees the company select nor sends a company", async () => {
    signIn("ADMIN_USER")
    const wrapper = await mountWarehouseForm()
    expect(wrapper.findComponent(RemoteSelect).exists()).toBe(false)

    await fillAll(wrapper, { Nombre: "Central" })
    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([{ name: "Central", address: null, isActive: true }])
  })

  it("editing a warehouse never offers to move it to another company", async () => {
    signIn("SUPER_ADMIN")
    const wrapper = await mountWarehouseForm({
      action: "update",
      warehouse: { id: 3, name: "Central", address: null, isActive: true, companyId: 7, companyName: "Acme" },
    })
    expect(wrapper.findComponent(RemoteSelect).exists()).toBe(false)

    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([{ name: "Central", address: null, isActive: true }])
  })
})
