import { describe, expect, it } from "vitest"
import { describeLastSession } from "~/helpers/lastSessionHelpers"

const NOW = new Date(2026, 10, 8, 9, 0, 0) // 8 Nov 2026, morning

describe("describeLastSession", () => {
  it("says 'Nunca' in grey when there was no session", () => {
    for (const value of [null, undefined, "", "garbage"]) {
      expect(describeLastSession(value as any, NOW)).toEqual({ label: "Nunca", tone: "default", daysAgo: null })
    }
  })

  it("counts calendar days, not hours: late yesterday is 'Ayer'", () => {
    expect(describeLastSession("2026-11-08T00:05:00", NOW).label).toBe("Hoy")
    expect(describeLastSession("2026-11-07T23:55:00", NOW).label).toBe("Ayer")
  })

  it.each([
    ["2026-11-08T08:00:00", "Hoy", "success", 0],
    ["2026-11-07T08:00:00", "Ayer", "success", 1],
    ["2026-11-02T08:00:00", "Hace 6 días", "success", 6],
    ["2026-11-01T08:00:00", "Hace 7 días", "warning", 7],
    ["2026-10-09T08:00:00", "Hace 30 días", "warning", 30],
    ["2026-10-08T08:00:00", "Hace 31 días", "error", 31],
    ["2026-08-01T08:00:00", "Hace 3 meses", "error", 99],
  ])("%s -> %s (%s)", (value, label, tone, daysAgo) => {
    expect(describeLastSession(value, NOW)).toEqual({ label, tone, daysAgo })
  })

  it("never reports the future (the server clock may be a little ahead)", () => {
    expect(describeLastSession("2026-11-09T01:00:00", NOW)).toMatchObject({ label: "Hoy", daysAgo: 0 })
  })
})
