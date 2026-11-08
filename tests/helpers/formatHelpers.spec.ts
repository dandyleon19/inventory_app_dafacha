import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  daysFromToday,
  formatDateDisplay,
  formatDateOnly,
  formatDateTime,
  formatMoney,
  formatPercent,
  formatQuantity,
  todayIso,
} from "~/helpers/formatHelpers"

const normalizeSpaces = (text: string) => text.replace(/ /g, " ")

describe("formatMoney", () => {
  it("formats soles with two decimals", () => {
    expect(normalizeSpaces(formatMoney(1234.5))).toBe("S/ 1,234.50")
  })

  it("shows up to the decimals asked for (unit costs carry four)", () => {
    expect(normalizeSpaces(formatMoney(1.2345, 4))).toBe("S/ 1.2345")
  })

  it.each([null, undefined, "", "abc", Number.NaN])("shows a dash for %j", (value) => {
    expect(formatMoney(value as any)).toBe("—")
  })

  it("keeps 0 as money, not as missing", () => {
    expect(normalizeSpaces(formatMoney(0))).toBe("S/ 0.00")
  })
})

describe("formatPercent / formatQuantity", () => {
  it("formats percentages", () => {
    expect(formatPercent(12.5)).toBe("12.5%")
    expect(formatPercent(0)).toBe("0%")
    expect(formatPercent(null)).toBe("—")
  })

  it("formats quantities with up to three decimals", () => {
    expect(formatQuantity(1.2345)).toBe("1.235")
    expect(formatQuantity(1000)).toBe("1,000")
    expect(formatQuantity("")).toBe("—")
  })
})

describe("dates without time", () => {
  it("formatDateOnly turns yyyy-mm-dd into dd/mm/yyyy without going through Date", () => {
    expect(formatDateOnly("2026-10-02")).toBe("02/10/2026")
  })

  it.each([null, undefined, "", "2026-10", "garbage"])("formatDateOnly shows a dash for %j", (value) => {
    expect(formatDateOnly(value as any)).toBe("—")
  })

  it("formatDateDisplay ignores the time part", () => {
    expect(formatDateDisplay("2026-11-05T23:59:00")).toBe(formatDateDisplay("2026-11-05"))
    expect(formatDateDisplay("2026-11-05")).toMatch(/^5 nov\w*, 2026$/i)
  })

  it("formatDateDisplay returns empty for nothing and the raw value when it is not a date", () => {
    expect(formatDateDisplay(null)).toBe("")
    expect(formatDateDisplay("hola")).toBe("hola")
  })

  it("formatDateTime shows a dash for invalid values", () => {
    expect(formatDateTime(null)).toBe("—")
    expect(formatDateTime("not a date")).toBe("—")
    expect(formatDateTime("2026-11-05T10:30:00")).not.toBe("—")
  })
})

describe("todayIso / daysFromToday", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Late evening local time: toISOString() would already say tomorrow in timezones behind UTC.
    vi.setSystemTime(new Date(2026, 10, 8, 23, 30, 0))
  })
  afterEach(() => vi.useRealTimers())

  it("todayIso is the local day", () => {
    expect(todayIso()).toBe("2026-11-08")
  })

  it("daysFromToday counts whole local days", () => {
    expect(daysFromToday("2026-11-08")).toBe(0)
    expect(daysFromToday("2026-11-09")).toBe(1)
    expect(daysFromToday("2026-11-01")).toBe(-7)
    expect(daysFromToday("2026-12-08")).toBe(30)
  })

  it("daysFromToday is null without a usable date", () => {
    expect(daysFromToday(null)).toBeNull()
    expect(daysFromToday("")).toBeNull()
    expect(daysFromToday("nope")).toBeNull()
  })
})
