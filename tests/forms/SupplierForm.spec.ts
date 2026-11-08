import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import SupplierForm from "~/components/app/suppliers/SupplierForm.vue"
import { errorMessages, fill, fillAll, submit, submitted } from "../utils/forms"

const mountForm = (props: Record<string, unknown> = { action: "create" }) => mountSuspended(SupplierForm, { props })

describe("SupplierForm", () => {
  it("shows the create / save label for each action", async () => {
    expect((await mountForm()).text()).toContain("Crear proveedor")
    expect((await mountForm({ action: "update" })).text()).toContain("Guardar cambios")
  })

  it("does not submit without a name and says why", async () => {
    const wrapper = await mountForm()
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Este campo es requerido")
  })

  it("does not submit a name made only of spaces (the backend's @NotBlank would refuse it)", async () => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", "   ")
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
  })

  it("submits only the name; every optional field goes as null (never an empty text that would collide in a unique index)", async () => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", "  Distribuidora Sur  ")
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      {
        name: "Distribuidora Sur",
        rucNumber: null,
        contactName: null,
        phone: null,
        email: null,
        address: null,
        notes: null,
        isActive: true,
      },
    ])
  })

  it("sends every field the backend's SupplierRequest has", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, {
      Nombre: "Distribuidora Sur",
      RUC: "20123456789",
      "Persona de contacto": "Luis",
      Teléfono: "999888777",
      Correo: "ventas@sur.pe",
      Dirección: "Av. Lima 123",
      Notas: "Entrega martes",
    })
    await submit(wrapper)

    const [payload] = submitted(wrapper)
    expect(Object.keys(payload as object).sort()).toEqual(
      ["address", "contactName", "email", "isActive", "name", "notes", "phone", "rucNumber"].sort()
    )
    expect(payload).toMatchObject({ rucNumber: "20123456789", email: "ventas@sur.pe", phone: "999888777" })
  })

  it.each([
    ["Nombre", 151],
    ["RUC", 21],
    ["Persona de contacto", 101],
    ["Teléfono", 21],
    ["Dirección", 201],
    ["Notas", 1001],
  ])("blocks %s longer than the backend's limit (%i characters)", async (label, length) => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", "Proveedor")
    await fill(wrapper, label, "x".repeat(length))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
  })

  it.each([
    ["Nombre", 150],
    ["RUC", 20],
    ["Persona de contacto", 100],
    ["Teléfono", 20],
    ["Dirección", 200],
    ["Notas", 1000],
  ])("accepts %s of exactly the limit (%i)", async (label, length) => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", "Proveedor")
    await fill(wrapper, label, "x".repeat(length))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  it("rejects an invalid email but accepts it empty (it is optional)", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, { Nombre: "Proveedor", Correo: "sin-arroba" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Correo inválido")

    await fill(wrapper, "Correo", "")
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  it("loads the supplier being edited and keeps its active flag", async () => {
    const wrapper = await mountForm({
      action: "update",
      supplier: { id: 4, name: "Vieja SAC", rucNumber: "123", isActive: false, email: null },
    })
    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([expect.objectContaining({ name: "Vieja SAC", rucNumber: "123", isActive: false })])
  })
})
