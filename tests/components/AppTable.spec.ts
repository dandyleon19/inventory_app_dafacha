import { afterEach, describe, expect, it } from "vitest"
import { h } from "vue"
import { flushPromises } from "@vue/test-utils"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import AppTable from "~/components/app/shared/AppTable.vue"
import type { TableChipColumn, TableHeader, TableRowOption } from "~/interfaces/tableInterfaces"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const setViewportWidth = async (width: number) => {
  ;(window as any).innerWidth = width
  window.dispatchEvent(new Event("resize"))
  await wait(200)
  await flushPromises()
}

const option = (action: string, title: string, primary = false): TableRowOption => ({
  action,
  title,
  icon: "tabler:pencil",
  color: "primary",
  ...(primary ? { primary: true } : {}),
})

const five = [
  option("status:IN_PROGRESS", "Iniciar", true),
  option("status:CANCELLED", "Cancelar cita"),
  option("whatsapp", "Recordar por WhatsApp"),
  option("update", "Editar", true),
  option("delete", "Eliminar"),
]

const headers: TableHeader[] = [
  { title: "ID", key: "id" },
  { title: "Nombres", key: "firstName", card: "title" },
  { title: "Apellidos", key: "lastName", card: "title" },
  { title: "Teléfono", key: "phone", card: "subtitle" },
  { title: "Email", key: "email" },
  { title: "Ciudad", key: "city" },
  { title: "Notas", key: "notes", card: "hidden" },
  { title: "Estado", key: "statusLabel" },
  { title: "Servicio", key: "serviceLabel" },
  { title: "Acciones", key: "actions", sortable: false },
]

const chipColumns: TableChipColumn[] = [
  { key: "statusLabel", color: "warning" },
  { key: "serviceLabel", color: "primary" },
]

const karen = {
  id: 1,
  firstName: "Karen",
  lastName: "Aguilar",
  phone: "942839394",
  email: "",
  city: "Lima",
  notes: "No usa esmalte",
  statusLabel: "Pendiente",
  serviceLabel: "Facial",
}

const opened: any[] = []

const mountTable = async (
  rowOptions: TableRowOption[],
  over: Record<string, unknown> = {},
  slots: Record<string, any> = {}
) => {
  const wrapper = await mountSuspended(AppTable, {
    props: {
      title: "Productos",
      headers,
      chipColumns,
      rowOptions,
      items: [karen],
      totalItems: 1,
      page: 1,
      itemsPerPage: 10,
      showSearch: false,
      showCreateButton: false,
      showExportButton: false,
      ...over,
    },
    slots,
    attachTo: document.body,
  })
  opened.push(wrapper)
  await flushPromises()
  return wrapper
}

const sheetText = () => document.body.querySelector(".app-table__sheet-card")?.textContent ?? ""
const cards = (wrapper: any) => wrapper.findAll(".app-card")

afterEach(async () => {
  opened.splice(0).forEach((wrapper) => wrapper.unmount())
  await setViewportWidth(1024)
})

const menuText = () => document.body.querySelector(".app-table__menu-list")?.textContent ?? ""

describe("AppTable on a wide screen", () => {
  it("is a table, not cards", async () => {
    const wrapper = await mountTable(five)
    expect(cards(wrapper)).toHaveLength(0)
    expect(wrapper.find("thead").exists()).toBe(true)
  })

  it("keeps all the actions in the row when there are three or fewer", async () => {
    const wrapper = await mountTable([option("view", "Ver"), option("update", "Editar"), option("delete", "Eliminar")])
    expect(wrapper.findAll("tbody .app-table__action")).toHaveLength(3)
    expect(wrapper.find("tbody .app-table__action--more").exists()).toBe(false)
  })

  it("with more, keeps the flagged ones and puts the rest in a menu next to a more button", async () => {
    const wrapper = await mountTable(five)

    // Two flagged + the more button, instead of five buttons.
    expect(wrapper.findAll("tbody .app-table__action")).toHaveLength(3)
    await wrapper.find("tbody .app-table__action--more").trigger("click")
    await flushPromises()
    await wait(100)

    expect(menuText()).toContain("Cancelar cita")
    expect(menuText()).toContain("Recordar por WhatsApp")
    expect(menuText()).toContain("Eliminar")
    expect(menuText()).not.toContain("Iniciar")

    const items = Array.from(document.body.querySelectorAll(".app-table__menu-list .v-list-item")) as HTMLElement[]
    items.find((item) => item.textContent?.includes("Eliminar"))?.click()
    await flushPromises()

    expect(wrapper.emitted("handleRowActionButton")).toEqual([[karen, "delete"]])
  })

  it("a column that is only for cards is not in the table", async () => {
    const wrapper = await mountTable([option("update", "Editar")], {
      headers: [...headers, { title: "Observaciones", key: "observations", cardOnly: true }],
    })
    expect(wrapper.find("thead").text()).not.toContain("Observaciones")
  })

  describe("clicking a row", () => {
    it("runs the page's main action for that row", async () => {
      const wrapper = await mountTable([option("update", "Editar"), option("delete", "Eliminar")], { rowClickAction: "update" })

      await wrapper.find("tbody td:nth-child(2)").trigger("click")
      expect(wrapper.emitted("handleRowActionButton")).toEqual([[karen, "update"]])
    })

    it("does nothing when the click was on a button inside the row", async () => {
      const wrapper = await mountTable([option("update", "Editar"), option("delete", "Eliminar")], { rowClickAction: "update" })

      await wrapper.find("tbody .app-table__action").trigger("click")
      // Only the button's own action, not a second one from the row.
      expect(wrapper.emitted("handleRowActionButton")).toHaveLength(1)
    })

    it("does nothing when the row does not have that action", async () => {
      const wrapper = await mountTable([option("delete", "Eliminar")], { rowClickAction: "update" })

      await wrapper.find("tbody td:nth-child(2)").trigger("click")
      expect(wrapper.emitted("handleRowActionButton")).toBeUndefined()
    })

    it("does nothing without a main action", async () => {
      const wrapper = await mountTable([option("update", "Editar")])

      await wrapper.find("tbody td:nth-child(2)").trigger("click")
      expect(wrapper.emitted("handleRowActionButton")).toBeUndefined()
    })
  })
})

describe("AppTable on a phone or a tablet", () => {
  it("shows each row as a card, without the table header", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable(five)

    expect(cards(wrapper)).toHaveLength(1)
    expect(wrapper.find("thead").exists()).toBe(false)
  })

  it("joins the title columns, puts the subtitle and the status badge, and lists the rest under their header", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable(five)
    const card = cards(wrapper)[0]

    expect(card.find(".app-card__title").text()).toBe("Karen Aguilar")
    expect(card.find(".app-card__subtitle").text()).toBe("942839394")
    // The status is the badge at the top, the other chip goes under the heading.
    expect(card.find(".app-card__head").text()).toContain("Pendiente")
    expect(card.find(".app-card__chips").text()).toContain("Facial")
    expect(card.find(".app-card__chips").text()).not.toContain("Pendiente")
    // The rest, under its header; empty values, hidden columns, the id and the actions are not listed.
    const meta = card.find(".app-card__meta").text()
    expect(meta).toContain("Ciudad")
    expect(meta).toContain("Lima")
    expect(meta).not.toContain("Email")
    expect(meta).not.toContain("Notas")
    expect(meta).not.toContain("No usa esmalte")
    expect(meta).not.toContain("Acciones")
  })

  it("without a title column, the first plain column is the title", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable(
      [option("update", "Editar")],
      {
        headers: [
          { title: "ID", key: "id" },
          { title: "Nombre", key: "name" },
          { title: "Ciudad", key: "city" },
          { title: "Acciones", key: "actions" },
        ],
        chipColumns: [],
        items: [{ id: 3, name: "Surco", city: "Lima" }],
      }
    )

    expect(cards(wrapper)[0].find(".app-card__title").text()).toBe("Surco")
    expect(cards(wrapper)[0].find(".app-card__meta").text()).toContain("Lima")
  })

  it("draws the title with the page's own slot when it has one", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable(
      [option("update", "Editar")],
      {
        headers: [
          { title: "ID", key: "id" },
          { title: "Cliente", key: "clientLabel" },
          { title: "Acciones", key: "actions" },
        ],
        chipColumns: [],
        items: [{ id: 1, clientLabel: "Rosa" }],
      },
      { "item.clientLabel": ({ item }: any) => h("button", { class: "custom-client" }, `Cliente: ${item.clientLabel}`) }
    )

    expect(cards(wrapper)[0].find(".app-card__title .custom-client").text()).toBe("Cliente: Rosa")
  })

  it("puts the flagged actions in the footer (the first with its name) and the rest in a sheet", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable(five)
    const footer = cards(wrapper)[0].find(".app-card__actions")

    const primary = footer.find(".app-card__primary")
    expect(primary.text()).toContain("Iniciar")
    expect(footer.find("[aria-label='Editar']").exists()).toBe(true)
    expect(footer.find("[aria-label='Más acciones']").exists()).toBe(true)
    // Two flagged + the more button, instead of five buttons.
    expect(footer.findAll("button")).toHaveLength(3)

    await footer.find("[aria-label='Más acciones']").trigger("click")
    await flushPromises()
    await wait(100)

    expect(sheetText()).toContain("Cancelar cita")
    expect(sheetText()).toContain("Recordar por WhatsApp")
    expect(sheetText()).toContain("Eliminar")
    expect(sheetText()).not.toContain("Iniciar")

    const items = Array.from(document.body.querySelectorAll(".app-table__sheet-item")) as HTMLElement[]
    items.find((item) => item.textContent?.includes("Eliminar"))?.click()
    await flushPromises()

    expect(wrapper.emitted("handleRowActionButton")).toEqual([[karen, "delete"]])
  })

  it("a footer button runs its action on that row", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable(five)

    await cards(wrapper)[0].find(".app-card__primary").trigger("click")
    await cards(wrapper)[0].find("[aria-label='Editar']").trigger("click")

    expect(wrapper.emitted("handleRowActionButton")).toEqual([
      [karen, "status:IN_PROGRESS"],
      [karen, "update"],
    ])
  })

  it("without flagged actions the first two stay in the footer", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([
      option("view", "Ver"),
      option("payment", "Pagar"),
      option("cancel", "Anular"),
      option("delete", "Eliminar"),
    ])
    const footer = cards(wrapper)[0].find(".app-card__actions")

    expect(footer.find(".app-card__primary").text()).toContain("Ver")
    expect(footer.find("[aria-label='Pagar']").exists()).toBe(true)
    expect(footer.find("[aria-label='Más acciones']").exists()).toBe(true)
  })

  it("three actions or fewer are all in the footer, without the more button", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([option("update", "Editar"), option("delete", "Eliminar")])
    const footer = cards(wrapper)[0].find(".app-card__actions")

    expect(footer.findAll("button")).toHaveLength(2)
    expect(footer.find("[aria-label='Más acciones']").exists()).toBe(false)
  })

  it("writes a joined column next to the one before it", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([option("update", "Editar")], {
      headers: [
        { title: "ID", key: "id" },
        { title: "Cliente", key: "name" },
        { title: "Inicio", key: "startAtDate" },
        { title: "Hora inicio", key: "startAtTime", card: "join" },
        { title: "Acciones", key: "actions" },
      ],
      chipColumns: [],
      items: [{ id: 1, name: "Rosa", startAtDate: "4 Jul, 2026", startAtTime: "9:00 AM" }],
    })

    const meta = cards(wrapper)[0].find(".app-card__meta").text()
    expect(meta).toContain("Inicio")
    expect(meta).toContain("4 Jul, 2026 · 9:00 AM")
    expect(meta).not.toContain("Hora inicio")
  })

  it("the flagged action leads and is the labelled button, even when every action fits", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([option("view", "Ver detalle"), option("payment", "Agregar pago", true), option("cancel", "Cancelar")])
    const footer = cards(wrapper)[0].find(".app-card__actions")

    expect(footer.find(".app-card__primary").text()).toContain("Agregar pago")
    expect(footer.find("[aria-label='Ver detalle']").exists()).toBe(true)
    expect(footer.find("[aria-label='Cancelar']").exists()).toBe(true)
  })

  it("a row without actions has no footer", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([])
    expect(cards(wrapper)[0].find(".app-card__actions").exists()).toBe(false)
  })

  it("keeps the class the page gives to a row (the muted ones)", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([option("update", "Editar")], { itemClass: () => "app-table__row--muted" })
    expect(cards(wrapper)[0].classes()).toContain("app-table__row--muted")
  })

  it("says what the page says when there is nothing to show", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([option("update", "Editar")], {
      items: [],
      totalItems: 0,
      emptyTitle: "Sin registros",
      emptyText: "Aún no hay actividad.",
    })

    expect(wrapper.text()).toContain("Sin registros")
    expect(wrapper.text()).toContain("Aún no hay actividad.")
  })

  it("says so when there is nothing to show", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([option("update", "Editar")], { items: [], totalItems: 0 })

    expect(cards(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain("Sin resultados")
  })
})

describe("AppTable filters", () => {
  const filters = [{ type: "select", label: "Estado", key: "status", items: ["A", "B"] }] as any

  it("on a wide screen they are in the toolbar, without a button", async () => {
    const wrapper = await mountTable([], { filters })
    expect(wrapper.find(".app-table__filters-toggle").exists()).toBe(false)
    expect(wrapper.find(".app-table__filters").attributes("style") ?? "").not.toContain("display: none")
  })

  it("on a phone they are folded behind a Filtros button, and open with it", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([], { filters })

    const toggle = wrapper.find(".app-table__filters-toggle")
    expect(toggle.text()).toContain("Filtros")
    expect(wrapper.find(".app-table__filters").attributes("style")).toContain("display: none")

    await toggle.trigger("click")
    expect(wrapper.find(".app-table__filters").attributes("style") ?? "").not.toContain("display: none")
  })

  it("the button says how many filters are applied", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([], { filters })
    expect(wrapper.find(".app-table__filters-count").exists()).toBe(false)

    await wrapper.findComponent({ name: "VSelect" }).setValue("A")
    await flushPromises()
    expect(wrapper.find(".app-table__filters-count").text()).toBe("1")
  })

  it("a table without filters has no button", async () => {
    await setViewportWidth(500)
    const wrapper = await mountTable([])
    expect(wrapper.find(".app-table__filters-toggle").exists()).toBe(false)
  })
})
