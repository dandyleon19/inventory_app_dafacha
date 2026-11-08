import { beforeEach, describe, expect, it, vi } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import UserForm from "~/components/app/users/UserForm.vue"
import UserPasswordDialog from "~/components/app/users/UserPasswordDialog.vue"
import { useAuthStore } from "~/store/modules/auth"
import { errorMessages, fill, fillAll, findInput, submit, submitted } from "../utils/forms"

const warehouses = [
  { id: 1, name: "Principal", isActive: true },
  { id: 2, name: "Tienda", isActive: true },
]

const mountForm = (props: Record<string, unknown> = {}) =>
  mountSuspended(UserForm, { props: { action: "create", warehouses, ...props } })

const person = {
  Nombres: "Ana",
  Apellidos: "Paz",
  Correo: "ana@empresa.com",
  Contraseña: "clave-segura-1",
}

beforeEach(() => {
  // The components read the app's own Pinia, so sign in through it (not through a fresh one).
  useAuthStore().setAuth({ token: "t", role: "ADMIN_USER", user: { id: 100, firstName: "Yo", lastName: "Mismo", role: "ADMIN_USER" } as any })
})

describe("UserForm (create)", () => {
  it("submits the fields of the backend's SaveUserRequest", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, person)
    await submit(wrapper)

    const [payload] = submitted(wrapper)
    expect(Object.keys(payload as object).sort()).toEqual(
      ["email", "firstName", "isActive", "lastName", "password", "role", "warehouseIds"].sort()
    )
  })

  it("a new user is a warehouse user, active, with access to every warehouse", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, person)
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toEqual({
      firstName: "Ana",
      lastName: "Paz",
      email: "ana@empresa.com",
      password: "clave-segura-1",
      role: "WAREHOUSE_USER",
      isActive: true,
      warehouseIds: [],
    })
  })

  it.each(["Nombres", "Apellidos", "Correo", "Contraseña"])("does not submit without %s", async (label) => {
    const wrapper = await mountForm()
    await fillAll(wrapper, person)
    await fill(wrapper, label, "")
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
  })

  it("trims names and email, but never the password", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, { ...person, Nombres: "  Ana ", Correo: " ana@empresa.com ", Contraseña: " clave segura " })
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toMatchObject({ firstName: "Ana", email: "ana@empresa.com", password: " clave segura " })
  })

  it("rejects an invalid email", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, { ...person, Correo: "ana@" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Correo inválido")
  })

  it("rejects a password under 8 characters (the backend asks for 8 to 255)", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, { ...person, Contraseña: "1234567" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Debe tener al menos 8 caracteres")

    await fill(wrapper, "Contraseña", "12345678")
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  it("a warehouse-limited user needs at least one warehouse", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, person)
    await fill(wrapper, "Puede usar todos los almacenes", false)
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)

    await fill(wrapper, "Almacenes permitidos", [2])
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toMatchObject({ warehouseIds: [2] })
  })

  it("an admin is never limited to warehouses, whatever was chosen before", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, person)
    await fill(wrapper, "Puede usar todos los almacenes", false)
    await fill(wrapper, "Almacenes permitidos", [1])
    await fill(wrapper, "Rol", "ADMIN_USER")
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toMatchObject({ role: "ADMIN_USER", warehouseIds: [] })
  })

  it("does not offer SUPER_ADMIN as a role to assign", async () => {
    const wrapper = await mountForm()
    const roles = (findInput(wrapper, "Rol").props("items") as Array<{ value: string }>).map((item) => item.value)
    expect(roles).not.toContain("SUPER_ADMIN")
    expect(roles).toEqual(expect.arrayContaining(["ADMIN_USER", "WAREHOUSE_USER", "PURCHASING_USER", "VIEWER"]))
  })
})

describe("UserForm (update)", () => {
  const existing = {
    id: 5,
    firstName: "Luis",
    lastName: "Ríos",
    email: "luis@empresa.com",
    role: "PURCHASING_USER",
    isActive: true,
    warehouseIds: [1],
  }

  it("has no password field and sends password null (the backend only uses it on create)", async () => {
    const wrapper = await mountForm({ action: "update", user: existing })
    expect(wrapper.findAllComponents(".v-input").map((input) => String(input.props("label")))).not.toContain("Contraseña")
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toEqual({
      firstName: "Luis",
      lastName: "Ríos",
      email: "luis@empresa.com",
      password: null,
      role: "PURCHASING_USER",
      isActive: true,
      warehouseIds: [1],
    })
  })

  it("you cannot change your own role nor deactivate yourself", async () => {
    const wrapper = await mountForm({ action: "update", user: { ...existing, id: 100, role: "ADMIN_USER" } })
    expect(findInput(wrapper, "Rol").props("disabled")).toBe(true)
    expect(findInput(wrapper, "Usuario activo").props("disabled")).toBe(true)
  })

  it("another user's role and active flag can be changed", async () => {
    const wrapper = await mountForm({ action: "update", user: existing })
    expect(findInput(wrapper, "Rol").props("disabled")).toBe(false)
    expect(findInput(wrapper, "Usuario activo").props("disabled")).toBe(false)
  })

  it("the platform owner's account keeps SUPER_ADMIN as its only role", async () => {
    const wrapper = await mountForm({ action: "update", user: { ...existing, role: "SUPER_ADMIN" } })
    const roles = (findInput(wrapper, "Rol").props("items") as Array<{ value: string }>).map((item) => item.value)
    expect(roles).toEqual(["SUPER_ADMIN"])
    expect(findInput(wrapper, "Rol").props("disabled")).toBe(true)
  })
})

describe("UserPasswordDialog", () => {
  vi.stubGlobal("visualViewport", {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  })

  const mountDialog = async () => {
    const wrapper = await mountSuspended(UserPasswordDialog, {
      props: { modelValue: true, userName: "Luis Ríos" },
      attachTo: document.body,
    })
    await flushPromises()
    return wrapper
  }

  // The dialog is drawn in a teleport, so the form is found through the component tree.
  const pressSubmit = async (wrapper: Awaited<ReturnType<typeof mountDialog>>) => {
    await wrapper.findComponent({ name: "VForm" }).trigger("submit")
    await flushPromises()
    await flushPromises()
  }

  it("does not submit a password under 8 characters", async () => {
    const wrapper = await mountDialog()
    await fill(wrapper, "Contraseña nueva", "1234567")
    await pressSubmit(wrapper)
    expect(wrapper.emitted("submit")).toBeUndefined()
  })

  it("does not submit an empty password", async () => {
    const wrapper = await mountDialog()
    await pressSubmit(wrapper)
    expect(wrapper.emitted("submit")).toBeUndefined()
  })

  it("submits the new password as it was typed", async () => {
    const wrapper = await mountDialog()
    await fill(wrapper, "Contraseña nueva", "otra-clave-9")
    await pressSubmit(wrapper)
    expect(wrapper.emitted("submit")).toEqual([["otra-clave-9"]])
  })
})
