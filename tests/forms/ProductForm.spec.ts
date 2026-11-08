import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import ProductForm from "~/components/app/products/ProductForm.vue"
import { errorMessages, fill, fillAll, findInput, submit, submitted } from "../utils/forms"
import { registerRecordEndpoints } from "../utils/endpoints"

// The category picker searches on the server: this is that server.
registerRecordEndpoints("/api/product-categories", [
  { id: 1, name: "Bebidas" },
  { id: 2, name: "Abarrotes" },
])

const mountForm = (props: Record<string, unknown> = {}) =>
  mountSuspended(ProductForm, { props: { action: "create", ...props } })

const valid = { Nombre: "Agua 500ml", "Precio de costo": "1.5", "Precio de venta": "2.5" }

describe("ProductForm", () => {
  it("submits a product with only what the backend requires, optional fields as null", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, valid)
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      {
        categoryId: null,
        name: "Agua 500ml",
        description: null,
        sku: null,
        barcode: null,
        unit: "UNIT",
        costPrice: 1.5,
        salePrice: 2.5,
        minStock: 0,
        tracksExpiry: false,
        isActive: true,
      },
    ])
  })

  it("sends exactly the fields of the backend's ProductRequest", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, valid)
    await submit(wrapper)
    expect(Object.keys(submitted(wrapper)[0] as object).sort()).toEqual(
      ["barcode", "categoryId", "costPrice", "description", "isActive", "minStock", "name", "salePrice", "sku", "tracksExpiry", "unit"].sort()
    )
  })

  it("trims the texts it sends and turns blank ones into null (SKU and barcode are unique per company)", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, { ...valid, Nombre: "  Agua  ", SKU: "   ", "Código de barras": " 775 ", Descripción: " " })
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toMatchObject({ name: "Agua", sku: null, barcode: "775", description: null })
  })

  describe("required fields", () => {
    it.each([
      ["Nombre", "Este campo es requerido"],
      ["Precio de costo", "Este campo es requerido"],
      ["Precio de venta", "Este campo es requerido"],
    ])("does not submit without %s", async (label, message) => {
      const wrapper = await mountForm()
      await fillAll(wrapper, valid)
      await fill(wrapper, label, "")
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain(message)
    })

    it("does not submit a name made only of spaces", async () => {
      const wrapper = await mountForm()
      await fillAll(wrapper, { ...valid, Nombre: "   " })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
    })

    it("a price of 0 is valid (free items, samples)", async () => {
      const wrapper = await mountForm()
      await fillAll(wrapper, { ...valid, "Precio de costo": "0", "Precio de venta": "0" })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)
    })
  })

  describe("what the company makes mandatory (CompanySettings)", () => {
    it("nothing is mandatory without settings: SKU, barcode and category say (opcional)", async () => {
      const wrapper = await mountForm()
      expect(findInput(wrapper, "SKU").props("label")).toBe("SKU (opcional)")
      expect(findInput(wrapper, "Código de barras").props("label")).toBe("Código de barras (opcional)")
      expect(findInput(wrapper, "Categoría").props("label")).toBe("Categoría (opcional)")
    })

    it.each([
      ["requireProductSku", "SKU"],
      ["requireProductBarcode", "Código de barras"],
      ["requireProductCategory", "Categoría"],
    ])("%s makes %s mandatory", async (setting, label) => {
      const wrapper = await mountForm({ settings: { [setting]: true } })
      expect(String(findInput(wrapper, label).props("label"))).not.toContain("opcional")

      await fillAll(wrapper, valid)
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)

      await fill(wrapper, label, label === "Categoría" ? 1 : "X-1")
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)
    })
  })

  describe("numbers the backend would refuse (ProductRequest @DecimalMin / @Digits)", () => {
    it.each([
      ["Precio de costo", "-1"],
      ["Precio de venta", "-0.01"],
      ["Stock mínimo", "-1"],
    ])("rejects a negative %s", async (label, value) => {
      const wrapper = await mountForm()
      await fillAll(wrapper, valid)
      await fill(wrapper, label, value)
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
    })

    it.each([
      ["Precio de costo", "1.12345"],
      ["Precio de venta", "1.234"],
      ["Stock mínimo", "1.2345"],
    ])("rejects too many decimals in %s (%s)", async (label, value) => {
      const wrapper = await mountForm()
      await fillAll(wrapper, valid)
      await fill(wrapper, label, value)
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
    })

    it.each([
      ["Precio de costo", "1.1234", "123456789"],
      ["Precio de venta", "1.23", "12345678901"],
      ["Stock mínimo", "1.234", "1234567890"],
    ])("accepts the decimals of %s (%s) but rejects too many integer digits (%s)", async (label, okValue, tooBig) => {
      const wrapper = await mountForm()
      await fillAll(wrapper, valid)

      await fill(wrapper, label, okValue)
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)

      await fill(wrapper, label, tooBig)
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)
      expect(errorMessages(wrapper).join(" ")).toContain("dígitos enteros")
    })
  })

  describe("text limits (ProductRequest @Size)", () => {
    it.each([
      ["Nombre", 150],
      ["SKU", 50],
      ["Código de barras", 50],
      ["Descripción", 2000],
    ])("%s accepts %i characters and rejects one more", async (label, max) => {
      const wrapper = await mountForm()
      await fillAll(wrapper, valid)

      await fill(wrapper, label, "x".repeat(max))
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)

      await fill(wrapper, label, "x".repeat(max + 1))
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)
    })
  })

  it("loads a product to edit and keeps its values", async () => {
    const wrapper = await mountForm({
      action: "update",
      product: {
        id: 9,
        categoryId: 2,
        name: "Arroz",
        sku: "ARZ-1",
        barcode: null,
        description: null,
        unit: "KILOGRAM",
        costPrice: 3.1234,
        salePrice: 4.5,
        minStock: 10,
        tracksExpiry: true,
        isActive: false,
      },
    })
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toEqual({
      categoryId: 2,
      name: "Arroz",
      description: null,
      sku: "ARZ-1",
      barcode: null,
      unit: "KILOGRAM",
      costPrice: 3.1234,
      salePrice: 4.5,
      minStock: 10,
      tracksExpiry: true,
      isActive: false,
    })
  })

  it("shows the margin from cost and sale price", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, { ...valid, "Precio de costo": "6", "Precio de venta": "10" })
    expect(wrapper.text()).toContain("40%")
  })
})
