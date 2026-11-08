import { beforeEach, describe, expect, it } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import RemoteSelect from "~/components/app/shared/RemoteSelect.vue"
import ProductPicker from "~/components/app/shared/ProductPicker.vue"
import { recordQueryEndpoint } from "../utils/endpoints"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** The requests go through the mocked server, which answers a few milliseconds later. */
const settle = async () => {
  await wait(150)
  await flushPromises()
}

/** A server with `records`, answering pages of `size` and searches by name (or SKU, for products). */
const pagedServer = (url: string, records: Array<Record<string, any>>, match: (record: any, term: string) => boolean) =>
  recordQueryEndpoint(url, (query) => {
    const term = (query.search ?? "").toLowerCase()
    const matches = term ? records.filter((record) => match(record, term)) : records
    const size = Number(query.size ?? 20)
    const page = Number(query.page ?? 0)
    return {
      content: matches.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: matches.length,
      totalPages: Math.max(1, Math.ceil(matches.length / size)),
    }
  })

const suppliers = Array.from({ length: 70 }, (_, index) => ({
  id: index + 1,
  name: index === 69 ? "Zeta Import" : `Proveedor ${index + 1}`,
  isActive: true,
}))
const supplierList = pagedServer("/api/suppliers", suppliers, (record, term) => record.name.toLowerCase().includes(term))
const supplierById = recordQueryEndpoint("/api/suppliers/70", () => suppliers[69])

const products = Array.from({ length: 45 }, (_, index) => ({
  id: index + 1,
  name: `Producto ${index + 1}`,
  sku: `SKU-${index + 1}`,
  unit: "UNIT",
  costPrice: 2,
  tracksExpiry: false,
  isActive: true,
}))
const productList = pagedServer("/api/products", products, (record, term) => `${record.name} ${record.sku}`.toLowerCase().includes(term))

beforeEach(() => {
  supplierList.reset()
  supplierById.reset()
  productList.reset()
})

const titles = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  (wrapper.findComponent({ name: "VAutocomplete" }).props("items") as Array<{ title?: string; label?: string }>).map(
    (item) => item.title ?? item.label ?? ""
  )

describe("RemoteSelect (suppliers and categories searched on the server)", () => {
  const mountPicker = (props: Record<string, unknown> = {}) =>
    mountSuspended(RemoteSelect, { props: { modelValue: null, kind: "supplier", label: "Proveedor", ...props } })

  it("shows the first 20 and loads the next 20 each time the end of the list is reached", async () => {
    const wrapper = await mountPicker()
    await settle()
    expect(titles(wrapper)).toHaveLength(20)

    const picker = wrapper.vm as unknown as { loadMore: () => Promise<void> }
    await picker.loadMore()
    await settle()
    expect(supplierList.queries.at(-1)).toMatchObject({ page: "1", size: "20" })
    expect(titles(wrapper)).toHaveLength(40)

    await picker.loadMore()
    await settle()
    await picker.loadMore()
    await settle()
    expect(titles(wrapper)).toHaveLength(70)

    const requests = supplierList.queries.length
    await picker.loadMore()
    await settle()
    expect(supplierList.queries).toHaveLength(requests)
  })

  it("finds a supplier that is far down the list by searching for it on the server", async () => {
    const wrapper = await mountPicker()
    await settle()

    wrapper.findComponent({ name: "VAutocomplete" }).vm.$emit("update:search", "zeta")
    await wait(450)
    await flushPromises()

    expect(supplierList.queries.at(-1)).toMatchObject({ search: "zeta" })
    expect(titles(wrapper)).toEqual(["Zeta Import"])
  })

  it("sends the extra filters (only active suppliers) with every request", async () => {
    const wrapper = await mountPicker({ query: { isActive: true } })
    await settle()
    await (wrapper.vm as unknown as { loadMore: () => Promise<void> }).loadMore()
    await settle()
    expect(supplierList.queries.every((query) => query.isActive === "true")).toBe(true)
  })

  it("shows the name of a supplier set from code, even if it is not in the first page", async () => {
    const wrapper = await mountPicker({ modelValue: 70 })
    await settle()
    expect(supplierById.queries).toHaveLength(1)
    expect(titles(wrapper)).toContain("Zeta Import")
    expect(wrapper.emitted("select")?.at(-1)?.[0]).toMatchObject({ id: 70, name: "Zeta Import" })
  })

  it("picking a record updates v-model", async () => {
    const wrapper = await mountPicker()
    await settle()
    wrapper.findComponent({ name: "VAutocomplete" }).vm.$emit("update:modelValue", 3)
    expect(wrapper.emitted("update:modelValue")).toEqual([[3]])
  })
})

describe("ProductPicker (products searched on the server)", () => {
  const mountPicker = (props: Record<string, unknown> = {}) =>
    mountSuspended(ProductPicker, { props: { modelValue: null, ...props } })

  it("loads 20 products at a time while scrolling, only active ones", async () => {
    const wrapper = await mountPicker()
    await settle()
    expect(titles(wrapper)).toHaveLength(20)
    expect(productList.queries[0]).toMatchObject({ page: "0", size: "20", isActive: "true" })

    const picker = wrapper.vm as unknown as { loadMore: () => Promise<void> }
    await picker.loadMore()
    await settle()
    await picker.loadMore()
    await settle()
    expect(titles(wrapper)).toHaveLength(45)
    expect(new Set(titles(wrapper)).size).toBe(45)

    const requests = productList.queries.length
    await picker.loadMore()
    await settle()
    expect(productList.queries).toHaveLength(requests)
  })

  it("keeps scrolling inside the same search", async () => {
    const wrapper = await mountPicker()
    await settle()

    wrapper.findComponent({ name: "VAutocomplete" }).vm.$emit("update:search", "sku-")
    await wait(450)
    await flushPromises()

    await (wrapper.vm as unknown as { loadMore: () => Promise<void> }).loadMore()
    await settle()
    expect(productList.queries.at(-1)).toMatchObject({ search: "sku-", page: "1" })
  })
})
