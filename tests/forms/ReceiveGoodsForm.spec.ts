import { describe, expect, it } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import ReceiveGoodsForm from "~/components/app/purchases/ReceiveGoodsForm.vue"
import { todayIso } from "~/helpers/formatHelpers"
import { errorMessages, fill, findInput, submit, submitted } from "../utils/forms"

const addDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const order = (lines: Array<Record<string, unknown>> = defaultLines) => ({
  id: 3,
  warehouseName: "Principal",
  orderedAt: `${addDays(-5)}T10:00:00`,
  lines,
})

const defaultLines = [
  { id: 100, productName: "Agua", productSku: "AG-1", unit: "UNIT", quantity: 10, receivedQuantity: 0, pendingQuantity: 10, unitCost: 2, tracksExpiry: false },
  { id: 101, productName: "Leche", productSku: "LE-1", unit: "UNIT", quantity: 6, receivedQuantity: 2, pendingQuantity: 4, unitCost: 3, tracksExpiry: true },
]

const mountForm = (lines?: Array<Record<string, unknown>>) =>
  mountSuspended(ReceiveGoodsForm, { props: { order: order(lines) } })

/** The "Recibido ahora" inputs, one per line with something pending. */
const received = (wrapper: Awaited<ReturnType<typeof mountForm>>) =>
  wrapper.findAllComponents(".v-input").filter((input) => input.props("label") === "Recibido ahora")

const setReceived = async (wrapper: Awaited<ReturnType<typeof mountForm>>, index: number, value: string) => {
  received(wrapper)[index]!.vm.$emit("update:modelValue", value)
  await flushPromises()
}

describe("ReceiveGoodsForm", () => {
  it("starts with everything pending as received, today, and asks for the expiry of tracked products", async () => {
    const wrapper = await mountForm()
    await fill(wrapper, "Fecha de vencimiento", addDays(30))
    await submit(wrapper)

    expect(submitted(wrapper)).toEqual([
      {
        receivedDate: todayIso(),
        items: [
          { lineId: 100, quantity: 10, expiryDate: null, lotNumber: null },
          { lineId: 101, quantity: 4, expiryDate: addDays(30), lotNumber: null },
        ],
      },
    ])
  })

  it("sends the fields of the backend's ReceivePurchaseOrderRequest", async () => {
    const wrapper = await mountForm([defaultLines[0]!])
    await submit(wrapper)
    const [payload] = submitted(wrapper) as any[]
    expect(Object.keys(payload).sort()).toEqual(["items", "receivedDate"])
    expect(Object.keys(payload.items[0]).sort()).toEqual(["expiryDate", "lineId", "lotNumber", "quantity"])
  })

  it("a line left at 0 is not sent (the backend wants quantity > 0 on every item)", async () => {
    const wrapper = await mountForm([defaultLines[0]!, { ...defaultLines[1], tracksExpiry: false }])
    await setReceived(wrapper, 0, "0")
    await submit(wrapper)
    expect((submitted(wrapper)[0] as any).items).toEqual([{ lineId: 101, quantity: 4, expiryDate: null, lotNumber: null }])
  })

  it("does not submit when nothing is received and says why", async () => {
    const wrapper = await mountForm([defaultLines[0]!])
    await setReceived(wrapper, 0, "0")
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain("Indica una cantidad mayor a 0 en al menos un producto")
  })

  it.each([
    ["", "Este campo es requerido"],
    ["-1", "No puede ser negativo"],
    ["11", "No puede superar lo pendiente (10)"],
    ["1.5", "Este producto se cuenta en unidades enteras"],
  ])("rejects receiving %j of a product with 10 pending", async (value, message) => {
    const wrapper = await mountForm([defaultLines[0]!])
    await setReceived(wrapper, 0, value)
    await submit(wrapper)
    expect(submitted(wrapper)).toHaveLength(0)
    expect(errorMessages(wrapper)).toContain(message)
  })

  it("accepts receiving less than was ordered (the rest stays pending)", async () => {
    const wrapper = await mountForm([defaultLines[0]!])
    await setReceived(wrapper, 0, "3")
    await submit(wrapper)
    expect((submitted(wrapper)[0] as any).items[0]).toMatchObject({ quantity: 3 })
  })

  describe("products that control expiry", () => {
    it("require the expiry date of what arrived", async () => {
      const wrapper = await mountForm([defaultLines[1]!])
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain("Indica la fecha de vencimiento del lote recibido")
    })

    it("do not require it when that line receives nothing", async () => {
      const wrapper = await mountForm([defaultLines[0]!, defaultLines[1]!])
      await setReceived(wrapper, 1, "0")
      await submit(wrapper)
      expect((submitted(wrapper)[0] as any).items).toEqual([{ lineId: 100, quantity: 10, expiryDate: null, lotNumber: null }])
    })

    it("refuse an expiry date in the past", async () => {
      const wrapper = await mountForm([defaultLines[1]!])
      await fill(wrapper, "Fecha de vencimiento", addDays(-1))
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain("La fecha de vencimiento no puede estar en el pasado")
    })

    it("send the lot number trimmed, or null when empty; 50 characters at most", async () => {
      const wrapper = await mountForm([defaultLines[1]!])
      await fill(wrapper, "Fecha de vencimiento", addDays(10))
      await fill(wrapper, "Lote", "  L-2026  ")
      await submit(wrapper)
      expect((submitted(wrapper)[0] as any).items[0]).toMatchObject({ lotNumber: "L-2026" })

      await fill(wrapper, "Lote", "x".repeat(51))
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(1)
    })
  })

  describe("received date", () => {
    it("cannot be in the future", async () => {
      const wrapper = await mountForm([defaultLines[0]!])
      await fill(wrapper, "Fecha de recepción", addDays(1))
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain("La fecha no puede ser futura")
    })

    it("cannot be before the order was placed", async () => {
      const wrapper = await mountForm([defaultLines[0]!])
      await fill(wrapper, "Fecha de recepción", addDays(-30))
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
      expect(errorMessages(wrapper)).toContain("No puede ser anterior al día en que se hizo el pedido")
    })

    it("is required", async () => {
      const wrapper = await mountForm([defaultLines[0]!])
      await fill(wrapper, "Fecha de recepción", "")
      await submit(wrapper)
      expect(submitted(wrapper)).toHaveLength(0)
    })

    it("can be a day between the order and today", async () => {
      const wrapper = await mountForm([defaultLines[0]!])
      await fill(wrapper, "Fecha de recepción", addDays(-2))
      await submit(wrapper)
      expect(submitted(wrapper)[0]).toMatchObject({ receivedDate: addDays(-2) })
    })
  })

  it("'Recibir todo lo pendiente' fills every row with what is pending", async () => {
    const wrapper = await mountForm([defaultLines[0]!])
    await setReceived(wrapper, 0, "1")
    const button = wrapper.findAll("button").find((candidate) => candidate.text() === "Recibir todo lo pendiente")!
    await button.trigger("click")
    await flushPromises()
    expect(String(received(wrapper)[0]!.props("modelValue"))).toBe("10")
  })

  it("an order with nothing pending shows a notice and cannot be submitted", async () => {
    const wrapper = await mountForm([{ ...defaultLines[0], pendingQuantity: 0, receivedQuantity: 10 }])
    expect(wrapper.text()).toContain("Esta orden no tiene nada pendiente de recibir")
    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeDefined()
    expect(() => findInput(wrapper, "Recibido ahora")).toThrow()
  })
})
