import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import ProductCategoryForm from "~/components/app/product-categories/ProductCategoryForm.vue"
import WarehouseForm from "~/components/app/warehouses/WarehouseForm.vue"
import { errorMessages, fill, fillAll, submit, submitted } from "../utils/forms"

describe("ProductCategoryForm", () => {
  const mountForm = (props: Record<string, unknown> = {}) =>
    mountSuspended(ProductCategoryForm, { props: { action: "create", ...props } })

  it("requires a name", async () => {
    const wrapper = await mountForm()
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Este campo es requerido")
  })

  it("does not accept a name of only spaces", async () => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", "   ")
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
  })

  it("submits the fields of the backend's ProductCategoryRequest, description as null when empty", async () => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", " Bebidas ")
    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([{ name: "Bebidas", description: null }])
  })

  it.each([
    ["Nombre", 100],
    ["Descripción", 1000],
  ])("%s accepts %i characters and rejects one more", async (label, max) => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", "Bebidas")
    await fill(wrapper, label, "x".repeat(max))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)

    await fill(wrapper, label, "x".repeat(max + 1))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  it("loads the category being edited", async () => {
    const wrapper = await mountForm({ action: "update", category: { id: 3, name: "Lácteos", description: "Leche" } })
    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([{ name: "Lácteos", description: "Leche" }])
  })
})

describe("WarehouseForm", () => {
  const mountForm = (props: Record<string, unknown> = {}) =>
    mountSuspended(WarehouseForm, { props: { action: "create", ...props } })

  it("requires a name", async () => {
    const wrapper = await mountForm()
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Este campo es requerido")
  })

  it("submits the fields of the backend's WarehouseRequest, address as null when empty, active by default", async () => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", " Principal ")
    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([{ name: "Principal", address: null, isActive: true }])
  })

  it("can be saved as inactive", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, { Nombre: "Viejo", "Almacén activo": false, Dirección: "Av. 1" })
    await submit(wrapper)
    expect(submitted(wrapper)).toEqual([{ name: "Viejo", address: "Av. 1", isActive: false }])
  })

  it.each([
    ["Nombre", 100],
    ["Dirección", 200],
  ])("%s accepts %i characters and rejects one more", async (label, max) => {
    const wrapper = await mountForm()
    await fill(wrapper, "Nombre", "Principal")
    await fill(wrapper, label, "x".repeat(max))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)

    await fill(wrapper, label, "x".repeat(max + 1))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })
})
