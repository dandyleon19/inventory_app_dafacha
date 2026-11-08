import { describe, expect, it } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import PurchaseOrderForm from "~/components/app/purchases/PurchaseOrderForm.vue"
import { ProductPickerStub } from "../utils/stubs"
import { errorMessages, fill, fillAll, submit, submitted } from "../utils/forms"
import { registerRecordEndpoints } from "../utils/endpoints"

// The supplier picker searches on the server: this is that server.
registerRecordEndpoints("/api/suppliers", [{ id: 1, name: "Distribuidora Sur", isActive: true }])
const warehouses = [
  { id: 10, name: "Principal", isActive: true },
  { id: 11, name: "Tienda", isActive: true },
]

const water = { id: 7, name: "Agua 500ml", sku: "AG-1", unit: "UNIT", costPrice: 2 }
const rice = { id: 8, name: "Arroz", sku: "AR-1", unit: "KILOGRAM", costPrice: 3 }

const mountForm = (props: Record<string, unknown> = {}) =>
  mountSuspended(PurchaseOrderForm, {
    props: { warehouses, ...props },
    global: { stubs: { ProductPicker: ProductPickerStub } },
  })

const pickProduct = async (wrapper: Awaited<ReturnType<typeof mountForm>>, product: typeof water, line = 0) => {
  const picker = wrapper.findAllComponents(ProductPickerStub)[line]!
  picker.vm.$emit("update:modelValue", product.id)
  picker.vm.$emit("select", product)
  await flushPromises()
}

const click = async (wrapper: Awaited<ReturnType<typeof mountForm>>, text: string) => {
  const button = wrapper.findAll("button").find((candidate) => candidate.text() === text)
  if (!button) throw new Error(`No button "${text}"`)
  await button.trigger("click")
  await flushPromises()
}

const header = { Proveedor: 1, "Almacén de destino": 10 }

describe("PurchaseOrderForm", () => {
  it("submits an order in the shape of the backend's PurchaseOrderRequest", async () => {
    const wrapper = await mountForm()
    await fillAll(wrapper, header)
    await pickProduct(wrapper, water)
    await fill(wrapper, "Unidades", "12")
    await fill(wrapper, "Costo por unidad", "2.5")
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      {
        supplierId: 1,
        warehouseId: 10,
        expectedDate: null,
        notes: null,
        lines: [{ productId: 7, quantity: 12, unitCost: 2.5, packaging: null, entryInput: null }],
      },
    ])
  })

  it("offers the product's current cost as a starting price", async () => {
    const wrapper = await mountForm()
    await pickProduct(wrapper, water)
    await fill(wrapper, "Unidades", "5")
    await fillAll(wrapper, header)
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toMatchObject({ lines: [{ unitCost: 2 }] })
  })

  it("picks the warehouse by itself when the company has only one", async () => {
    const wrapper = await mountForm({ warehouses: [warehouses[0]] })
    await fill(wrapper, "Proveedor", 1)
    await pickProduct(wrapper, water)
    await fill(wrapper, "Unidades", "1")
    await submit(wrapper)
    expect(submitted(wrapper)[0]).toMatchObject({ warehouseId: 10 })
  })

  describe("required data", () => {
    it.each([
      ["supplier", { "Almacén de destino": 10 }],
      ["warehouse", { Proveedor: 1 }],
    ])("does not submit without the %s", async (_name, values) => {
      const wrapper = await mountForm()
      await fillAll(wrapper, values)
      await pickProduct(wrapper, water)
      await fillAll(wrapper, { Unidades: "1" })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain("Este campo es requerido")
    })

    it("does not submit a line without a product", async () => {
      const wrapper = await mountForm()
      await fillAll(wrapper, { ...header, Unidades: "1", "Costo por unidad": "1" })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
    })

    it.each([
      ["", "Este campo es requerido"],
      ["0", "Debe ser mayor a 0"],
      ["-3", "Debe ser mayor a 0"],
      ["1.2345", "Máximo 3 decimales"],
      ["123456789012", "Máximo 11 dígitos enteros"],
    ])("rejects the quantity %j (the backend asks > 0, 3 decimals, 11 integers)", async (quantity, message) => {
      const wrapper = await mountForm()
      await fillAll(wrapper, header)
      await pickProduct(wrapper, water)
      await fillAll(wrapper, { Unidades: quantity, "Costo por unidad": "1" })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain(message)
    })

    it("accepts a cost of 0 but not a negative one, nor more than 4 decimals or 8 integers", async () => {
      const wrapper = await mountForm()
      await fillAll(wrapper, header)
      await pickProduct(wrapper, water)
      await fill(wrapper, "Unidades", "1")

      await fill(wrapper, "Costo por unidad", "0")
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)

      for (const bad of ["-1", "1.12345", "123456789"]) {
        await fill(wrapper, "Costo por unidad", bad)
        await submit(wrapper)
      }
      expect(submitted(wrapper)).toHaveLength(1)
    })

    it("a product counted in whole units refuses fractions; one counted by weight accepts them", async () => {
      const whole = await mountForm()
      await fillAll(whole, header)
      await pickProduct(whole, water)
      await fillAll(whole, { Unidades: "1.5", "Costo por unidad": "1" })
      await submit(whole)
      expect(submitted(whole)).toHaveLength(0)
      expect(errorMessages(whole)).toContain("Este producto se cuenta en unidades enteras")

      const weighed = await mountForm()
      await fillAll(weighed, header)
      await pickProduct(weighed, rice)
      await fillAll(weighed, { Unidades: "1.5", "Costo por unidad": "1" })
      await submit(weighed)
      expect(submitted(weighed)).toHaveLength(1)
    })

    it("notes accept 1000 characters and no more", async () => {
      const wrapper = await mountForm()
      await fillAll(wrapper, header)
      await pickProduct(wrapper, water)
      await fillAll(wrapper, { Unidades: "1", "Costo por unidad": "1", "Notas (opcional)": "x".repeat(1000) })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)

      await fill(wrapper, "Notas (opcional)", "x".repeat(1001))
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)
    })
  })

  describe("lines", () => {
    it("cannot remove the only line, and can add more", async () => {
      const wrapper = await mountForm()
      expect(wrapper.findAll("button[aria-label='Quitar producto']")[0]!.attributes("disabled")).toBeDefined()

      await click(wrapper, "Agregar producto")
      expect(wrapper.findAllComponents(ProductPickerStub)).toHaveLength(2)

      await wrapper.findAll("button[aria-label='Quitar producto']")[0]!.trigger("click")
      await flushPromises()
      expect(wrapper.findAllComponents(ProductPickerStub)).toHaveLength(1)
    })

    it("lets the same product appear twice (another price or way of buying) and warns about it", async () => {
      const wrapper = await mountForm()
      await fillAll(wrapper, header)
      await click(wrapper, "Agregar producto")
      await pickProduct(wrapper, water, 0)
      await pickProduct(wrapper, water, 1)
      expect(wrapper.text()).toContain("Este producto ya está en otra línea")

      const units = wrapper.findAllComponents(".v-input").filter((input) => input.props("label") === "Unidades")
      units[0]!.vm.$emit("update:modelValue", "2")
      units[1]!.vm.$emit("update:modelValue", "3")
      const costs = wrapper.findAllComponents(".v-input").filter((input) => input.props("label") === "Costo por unidad")
      costs[0]!.vm.$emit("update:modelValue", "1")
      costs[1]!.vm.$emit("update:modelValue", "1.5")
      await flushPromises()
      await submit(wrapper)

      expect(submitted(wrapper)[0]).toMatchObject({
        lines: [
          { productId: 7, quantity: 2, unitCost: 1 },
          { productId: 7, quantity: 3, unitCost: 1.5 },
        ],
      })
    })
  })

  describe("buying by packages", () => {
    const buyPackages = async (wrapper: Awaited<ReturnType<typeof mountForm>>) => {
      await fillAll(wrapper, header)
      await pickProduct(wrapper, water)
      await click(wrapper, "Por paquetes")
    }

    it("quantity = packages x units per package + loose ones; the price per package becomes a unit cost", async () => {
      const wrapper = await mountForm()
      await buyPackages(wrapper)
      await fillAll(wrapper, { Paquetes: "2", "Unidades por paquete": "12", "Sueltas adicionales": "6" })
      await click(wrapper, "Por paquete")
      await fill(wrapper, "Precio por paquete", "24")
      await submit(wrapper)

      const [payload] = submitted(wrapper) as any[]
      expect(payload.lines).toHaveLength(1)
      expect(payload.lines[0]).toMatchObject({ productId: 7, quantity: 30, unitCost: 2 })
      expect(payload.lines[0].packaging).toBe("2 paquetes de 12 + 6 sueltas · S/ 24 por paquete")
      // Stored as typed so editing the draft brings the packages back.
      expect(JSON.parse(payload.lines[0].entryInput)).toMatchObject({ qtyMode: "packs", packs: "2", packSize: "12", priceMode: "pack" })
    })

    it("the total paid is divided by all the units", async () => {
      const wrapper = await mountForm()
      await buyPackages(wrapper)
      await fillAll(wrapper, { Paquetes: "1", "Unidades por paquete": "10" })
      await click(wrapper, "Total pagado")
      await fill(wrapper, "Total pagado por esta línea", "25")
      await submit(wrapper)
      expect(submitted(wrapper)[0]).toMatchObject({ lines: [{ quantity: 10, unitCost: 2.5 }] })
    })

    it("does not submit packages without saying how many units each one has", async () => {
      const wrapper = await mountForm()
      await buyPackages(wrapper)
      await fillAll(wrapper, { Paquetes: "2", "Costo por unidad": "1" })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(wrapper.text()).toContain("Indica cuántas unidades trae cada paquete")
    })

    it("does not submit a line with no units at all", async () => {
      const wrapper = await mountForm()
      await buyPackages(wrapper)
      await fillAll(wrapper, { "Costo por unidad": "1" })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(wrapper.text()).toContain("Indica al menos una unidad")
    })
  })

  describe("editing a saved order", () => {
    const order = {
      id: 3,
      supplierId: 1,
      warehouseId: 11,
      expectedDate: null,
      notes: "Urgente",
      lines: [{ id: 1, productId: 8, productName: "Arroz", productSku: "AR-1", unit: "KILOGRAM", quantity: 5.5, unitCost: 3.25 }],
    }

    it("brings back the saved data and sends the same thing when nothing changes", async () => {
      const wrapper = await mountForm({ order })
      await submit(wrapper)
      expect(submitted(wrapper)).toEqual([
        {
          supplierId: 1,
          warehouseId: 11,
          expectedDate: null,
          notes: "Urgente",
          lines: [{ productId: 8, quantity: 5.5, unitCost: 3.25, packaging: null, entryInput: null }],
        },
      ])
    })
  })
})
