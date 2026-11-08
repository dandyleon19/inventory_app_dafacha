import { beforeEach, describe, expect, it, vi } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import StockOperationForm from "~/components/app/stock/StockOperationForm.vue"
import { useStockStore } from "~/store/modules/stock"
import { useCompanyStore } from "~/store/modules/company"
import { DEFAULT_COMPANY_SETTINGS } from "~/interfaces/companyInterfaces"
import { ProductPickerStub } from "../utils/stubs"
import { errorMessages, fill, fillAll, submit, submitted } from "../utils/forms"

const warehouses = [
  { id: 10, name: "Principal", isActive: true },
  { id: 11, name: "Tienda", isActive: true },
]

const water = { id: 7, name: "Agua", sku: "AG-1", unit: "UNIT", costPrice: 2, tracksExpiry: false }
const rice = { id: 8, name: "Arroz", sku: "AR-1", unit: "KILOGRAM", costPrice: 3, tracksExpiry: false }
const milk = { id: 9, name: "Leche", sku: "LE-1", unit: "UNIT", costPrice: 4, tracksExpiry: true }

type Mode = "entry" | "exit" | "adjustment" | "transfer"

beforeEach(() => {
  const stock = useStockStore()
  vi.spyOn(stock, "fetchQuantity").mockResolvedValue(20)
  vi.spyOn(stock, "fetchLotsOf").mockResolvedValue([])
  vi.spyOn(stock, "fetchCostLayers").mockResolvedValue([])
  const company = useCompanyStore()
  company.settings = { ...DEFAULT_COMPANY_SETTINGS }
  vi.spyOn(company, "fetchSettings").mockResolvedValue(undefined as any)
})

const mountForm = (mode: Mode, props: Record<string, unknown> = {}) =>
  mountSuspended(StockOperationForm, {
    props: { mode, warehouses, ...props },
    global: { stubs: { ProductPicker: ProductPickerStub } },
  })

const pick = async (wrapper: Awaited<ReturnType<typeof mountForm>>, product: typeof water) => {
  const picker = wrapper.findComponent(ProductPickerStub)
  picker.vm.$emit("update:modelValue", product.id)
  picker.vm.$emit("select", product)
  await flushPromises()
}

describe("entry", () => {
  it("submits an entry in the shape of the backend's StockMovementRequest", async () => {
    const wrapper = await mountForm("entry")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, Cantidad: "12", "Costo unitario": "2.5", "Notas (opcional)": "  Compra directa " })
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      {
        kind: "entry",
        body: { warehouseId: 10, productId: 7, quantity: 12, expiryDate: null, lotNumber: null, unitCost: 2.5, notes: "Compra directa" },
      },
    ])
  })

  it("starts the unit cost as the product's current cost, and sends null when it is cleared (the backend then uses it)", async () => {
    const wrapper = await mountForm("entry")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, Cantidad: "1" })
    await submit(wrapper)
    expect((submitted(wrapper)[0] as any).body.unitCost).toBe(2)

    await fill(wrapper, "Costo unitario", "")
    await submit(wrapper)
    expect((submitted(wrapper)[1] as any).body.unitCost).toBeNull()
  })

  it("picks the warehouse by itself when there is only one", async () => {
    const wrapper = await mountForm("entry", { warehouses: [warehouses[0]] })
    await pick(wrapper, water)
    await fill(wrapper, "Cantidad", "1")
    await submit(wrapper)
    expect((submitted(wrapper)[0] as any).body.warehouseId).toBe(10)
  })

  it.each([
    ["product", async (w: any) => fillAll(w, { Almacén: 10, Cantidad: "1" }), false],
    ["warehouse", async (w: any) => fill(w, "Cantidad", "1"), true],
    ["quantity", async (w: any) => fill(w, "Almacén", 10), true],
  ])("does not submit without the %s", async (_name, setup, withProduct) => {
    const wrapper = await mountForm("entry")
    if (withProduct) await pick(wrapper, water)
    await setup(wrapper)
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Este campo es requerido")
  })

  it.each([
    ["0", "Debe ser mayor a 0"],
    ["-1", "Debe ser mayor a 0"],
    ["1.5", "Este producto se cuenta en unidades enteras"],
    ["123456789012", "Máximo 11 dígitos enteros"],
  ])("rejects the quantity %j", async (quantity, message) => {
    const wrapper = await mountForm("entry")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, Cantidad: quantity })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain(message)
  })

  it("accepts fractions for a product that is weighed, up to 3 decimals", async () => {
    const wrapper = await mountForm("entry")
    await pick(wrapper, rice)
    await fillAll(wrapper, { Almacén: 10, Cantidad: "2.125" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)

    await fill(wrapper, "Cantidad", "2.1255")
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  it("rejects a negative unit cost, more than 4 decimals and more than 8 integers", async () => {
    const wrapper = await mountForm("entry")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, Cantidad: "1" })
    for (const bad of ["-1", "1.12345", "123456789"]) {
      await fill(wrapper, "Costo unitario", bad)
      await submit(wrapper)
    }
    expect(submitted(wrapper)).toHaveLength(0)

    await fill(wrapper, "Costo unitario", "0")
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  it("notes accept 500 characters and no more (the backend's limit)", async () => {
    const wrapper = await mountForm("entry")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, Cantidad: "1", "Notas (opcional)": "x".repeat(500) })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)

    await fill(wrapper, "Notas (opcional)", "x".repeat(501))
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(1)
  })

  describe("product that controls expiry", () => {
    it("asks for the expiry date of the lot that comes in", async () => {
      const wrapper = await mountForm("entry")
      await pick(wrapper, milk)
      await fillAll(wrapper, { Almacén: 10, Cantidad: "6" })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain("Este campo es requerido")
    })

    it("sends the lot, trimmed; the date cannot be in the past; the number is 50 characters at most", async () => {
      const wrapper = await mountForm("entry")
      await pick(wrapper, milk)
      await fillAll(wrapper, { Almacén: 10, Cantidad: "6", "Fecha de vencimiento": "2000-01-01" })
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain("La fecha de vencimiento no puede estar en el pasado")

      await fillAll(wrapper, { "Fecha de vencimiento": "2999-12-31", "Lote (opcional)": "  L-9 " })
      await submit(wrapper)
      expect((submitted(wrapper)[0] as any).body).toMatchObject({ expiryDate: "2999-12-31", lotNumber: "L-9" })

      await fill(wrapper, "Lote (opcional)", "x".repeat(51))
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)
    })

    it("a product without expiry control never sends a lot", async () => {
      const wrapper = await mountForm("entry")
      await pick(wrapper, water)
      await fillAll(wrapper, { Almacén: 10, Cantidad: "1" })
      await submit(wrapper)
      expect((submitted(wrapper)[0] as any).body).toMatchObject({ expiryDate: null, lotNumber: null })
    })
  })
})

describe("exit", () => {
  it("submits an exit with no lots when the company picks automatically (the oldest leaves)", async () => {
    const wrapper = await mountForm("exit")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, Cantidad: "5", "Notas (opcional)": "Merma" })
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      { kind: "exit", body: { warehouseId: 10, productId: 7, quantity: 5, lots: undefined, layers: undefined, notes: "Merma" } },
    ])
  })

  it("shows the stock that is there to guide the user", async () => {
    const wrapper = await mountForm("exit")
    await pick(wrapper, water)
    await fill(wrapper, "Almacén", 10)
    expect(wrapper.text()).toContain("Stock actual")
    expect(wrapper.text()).toContain("20")
  })

  it("does not take a unit cost (it comes from the stock)", async () => {
    const wrapper = await mountForm("exit")
    expect(wrapper.findAllComponents(".v-input").map((input) => String(input.props("label")))).not.toContain("Costo unitario")
  })
})

describe("adjustment (physical count)", () => {
  it("submits what was counted in the backend's StockAdjustmentRequest shape", async () => {
    const wrapper = await mountForm("adjustment")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, "Cantidad contada": "18" })
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      { kind: "adjustment", body: { warehouseId: 10, productId: 7, countedQuantity: 18, expiryDate: null, lotNumber: null, notes: null } },
    ])
  })

  it("counting 0 is valid (the shelf is empty)", async () => {
    const wrapper = await mountForm("adjustment")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, "Cantidad contada": "0" })
    await submit(wrapper)
    expect((submitted(wrapper)[0] as any).body.countedQuantity).toBe(0)
  })

  it("a count cannot be negative", async () => {
    const wrapper = await mountForm("adjustment")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, "Cantidad contada": "-1" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain("Debe ser mayor o igual a 0")
  })

  it("tells the difference between the count and the system's stock", async () => {
    const wrapper = await mountForm("adjustment")
    await pick(wrapper, water)
    await fillAll(wrapper, { Almacén: 10, "Cantidad contada": "18" })
    expect(wrapper.text()).toContain("-2")
  })
})

describe("transfer", () => {
  it("submits a transfer in the backend's StockTransferRequest shape", async () => {
    const wrapper = await mountForm("transfer")
    await pick(wrapper, water)
    await fillAll(wrapper, { "Almacén de origen": 10, "Almacén de destino": 11, Cantidad: "4" })
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      {
        kind: "transfer",
        body: { fromWarehouseId: 10, toWarehouseId: 11, productId: 7, quantity: 4, lots: undefined, layers: undefined, notes: null },
      },
    ])
  })

  it("needs a destination, different from the origin", async () => {
    const wrapper = await mountForm("transfer")
    await pick(wrapper, water)
    await fillAll(wrapper, { "Almacén de origen": 10, Cantidad: "4" })
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)

    await fill(wrapper, "Almacén de destino", 10)
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
  })
})
