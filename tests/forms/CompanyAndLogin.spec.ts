import { beforeEach, describe, expect, it, vi } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import CompanyForm from "~/components/app/companies/CompanyForm.vue"
import LoginForm from "~/components/LoginForm.vue"
import { errorMessages, fill, fillAll, submit, submitted } from "../utils/forms"

const { loginMock, successMock, errorMock, navigateToMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useAuth", () => () => ({ login: loginMock, logout: vi.fn() }))
mockNuxtImport("useNotification", () => () => ({ success: successMock, error: errorMock, show: vi.fn() }))
mockNuxtImport("navigateTo", () => navigateToMock)

describe("CompanyForm (SUPER_ADMIN creates a company with its first administrator)", () => {
  const mountForm = (props: Record<string, unknown> = {}) =>
    mountSuspended(CompanyForm, { props: { action: "create", ...props } })

  // Both the company and its admin have "Nombre..." labels, so the admin ones are told apart by their order.
  const company = { "Nombre comercial": "Acme SAC" }
  const adminValues = async (wrapper: Awaited<ReturnType<typeof mountForm>>, values: Record<string, string>) => {
    const inputs = wrapper.findAllComponents(".v-input")
    const byLabel = (label: string) => inputs.filter((input) => String(input.props("label")) === label).at(-1)!
    for (const [label, value] of Object.entries(values)) {
      byLabel(label).vm.$emit("update:modelValue", value)
    }
    await flushPromises()
  }
  const admin = { Nombres: "Ana", Apellidos: "Paz", Correo: "ana@acme.pe", Contraseña: "clave-segura-1" }

  it("submits the company and the admin in the shape of the backend's BootstrapRequest", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, company)
    await adminValues(wrapper, admin)
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      {
        company: { name: "Acme SAC", socialReason: null, rucNumber: null, fiscalAddress: null, phone: null },
        admin: { firstName: "Ana", lastName: "Paz", email: "ana@acme.pe", password: "clave-segura-1" },
      },
    ])
  })

  it("optional company data goes as null when empty (the RUC is unique across all companies)", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, { ...company, "RUC (opcional)": "  ", "Teléfono (opcional)": " " })
    await adminValues(wrapper, admin)
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toMatchObject({ company: { rucNumber: null, phone: null } })
  })

  it("does not submit without a company name", async () => {
    const wrapper = await mountForm()
    await adminValues(wrapper, admin)
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Este campo es requerido")
  })

  it.each(["Nombres", "Apellidos", "Correo", "Contraseña"])("does not submit without the admin's %s", async (label) => {
    const wrapper = await mountForm()
    await fillAll(wrapper, company)
    await adminValues(wrapper, { ...admin, [label]: "" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
  })

  it("the admin's password needs 8 characters, like the backend's CreateUserRequest", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, company)
    await adminValues(wrapper, { ...admin, Contraseña: "1234567" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)

    await adminValues(wrapper, { Contraseña: "12345678" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  it.each([
    ["Nombre comercial", 100],
    ["Razón social (opcional)", 100],
    ["RUC (opcional)", 20],
    ["Dirección fiscal (opcional)", 100],
    ["Teléfono (opcional)", 20],
  ])("%s accepts %i characters and rejects one more", async (label, max) => {
    const wrapper = await mountForm()
    await fillAll(wrapper, company)
    await adminValues(wrapper, admin)

    await fill(wrapper, label, "x".repeat(max))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)

    await fill(wrapper, label, "x".repeat(max + 1))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  it("when editing, there is no admin section and admin is null", async () => {
    const wrapper = await mountForm({
      action: "update",
      company: { id: 3, name: "Vieja SAC", socialReason: null, rucNumber: "20123", fiscalAddress: null, phone: null },
    })
    expect(wrapper.text()).not.toContain("Contraseña")
    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([
      {
        company: { name: "Vieja SAC", socialReason: null, rucNumber: "20123", fiscalAddress: null, phone: null },
        admin: null,
      },
    ])
  })
})

describe("LoginForm", () => {
  const mountForm = () => mountSuspended(LoginForm)

  beforeEach(() => {
    loginMock.mockReset()
    successMock.mockReset()
    errorMock.mockReset()
    navigateToMock.mockReset()
  })

  const signInButton = (wrapper: Awaited<ReturnType<typeof mountForm>>) => wrapper.find("button[type='submit']")

  it("keeps the button disabled until both fields are valid", async () => {
    const wrapper = await mountForm()
    expect(signInButton(wrapper).attributes("disabled")).toBeDefined()

    await fill(wrapper, "Correo", "no-es-correo")
    await fill(wrapper, "Contraseña", "x")
    expect(signInButton(wrapper).attributes("disabled")).toBeDefined()

    await fill(wrapper, "Correo", "ana@acme.pe")
    expect(signInButton(wrapper).attributes("disabled")).toBeUndefined()
  })

  it("does not call the API when the form is invalid", async () => {
    const wrapper = await mountForm()
    await fill(wrapper, "Correo", "ana@acme.pe")
    await submit(wrapper)
    expect(loginMock).not.toHaveBeenCalled()
  })

  it("signs in with the typed credentials and goes to /app", async () => {
    vi.useFakeTimers()
    try {
      loginMock.mockResolvedValue({ user: { fullName: "Ana Paz" } })
      const wrapper = await mountForm()
      await fillAll(wrapper, { Correo: "ana@acme.pe", Contraseña: "clave-segura-1" })

      await wrapper.find("form").trigger("submit")
      await vi.advanceTimersByTimeAsync(1000)

      expect(loginMock).toHaveBeenCalledWith("ana@acme.pe", "clave-segura-1")
      expect(successMock).toHaveBeenCalledWith("Bienvenido, Ana Paz", "Inicio de sesión exitoso")
      expect(navigateToMock).toHaveBeenCalledWith("/app")
    } finally {
      vi.useRealTimers()
    }
  })

  it("shows the API's message when the credentials are wrong and lets the user try again", async () => {
    loginMock.mockRejectedValue({ data: { code: "UNAUTHORIZED", message: "Credenciales inválidas" } })
    const wrapper = await mountForm()
    await fillAll(wrapper, { Correo: "ana@acme.pe", Contraseña: "mala" })
    await submit(wrapper)

    expect(errorMock).toHaveBeenCalledWith("Credenciales inválidas", "No autorizado")
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(signInButton(wrapper).attributes("disabled")).toBeUndefined()
  })

  it("falls back to a generic message when the API sends none", async () => {
    loginMock.mockRejectedValue(new Error("network"))
    const wrapper = await mountForm()
    await fillAll(wrapper, { Correo: "ana@acme.pe", Contraseña: "x" })
    await submit(wrapper)
    expect(errorMock.mock.calls[0]![0]).toContain("No se pudo iniciar sesión")
  })
})
