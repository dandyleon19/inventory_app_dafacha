import { describe, expect, it } from "vitest"
import { getApiErrorMessage, getApiErrorTitle, parseApiError } from "~/helpers/apiErrorHelpers"
import { areTableSearchEqual, normalizeTableSearch } from "~/helpers/tableSearchHelpers"

const fetchError = (data: Record<string, unknown> | null, status?: number) => ({ data, status })

describe("parseApiError", () => {
  it("is null for anything that is not an API error body", () => {
    expect(parseApiError(null)).toBeNull()
    expect(parseApiError("x")).toBeNull()
    expect(parseApiError(new Error("boom"))).toBeNull()
    expect(parseApiError(fetchError(null))).toBeNull()
  })

  it("takes the status from the body, then from the response", () => {
    expect(parseApiError(fetchError({ status: 409 }, 500))?.status).toBe(409)
    expect(parseApiError(fetchError({ code: "X" }, 404))?.status).toBe(404)
  })
})

describe("getApiErrorMessage", () => {
  it("falls back when the API sent no message", () => {
    expect(getApiErrorMessage(new Error("boom"), "No se pudo guardar")).toBe("No se pudo guardar")
    expect(getApiErrorMessage(fetchError({}), "No se pudo guardar")).toBe("No se pudo guardar")
  })

  it("joins the field messages the backend separates with ;", () => {
    const err = fetchError({ message: "El nombre es obligatorio; El correo no es válido ;;" })
    expect(getApiErrorMessage(err, "x")).toBe("El nombre es obligatorio El correo no es válido")
  })
})

describe("getApiErrorTitle", () => {
  it.each([
    ["CONFLICT", "Conflicto"],
    ["VALIDATION_ERROR", "Datos inválidos"],
    ["BAD_REQUEST", "Solicitud inválida"],
    ["NOT_FOUND", "No encontrado"],
    ["FORBIDDEN", "Sin permisos"],
    ["UNAUTHORIZED", "No autorizado"],
  ])("code %s -> %s", (code, title) => {
    expect(getApiErrorTitle(fetchError({ code }))).toBe(title)
  })

  it.each([
    [409, "Conflicto"],
    [404, "No encontrado"],
    [403, "Sin permisos"],
    [401, "No autorizado"],
    [400, "Solicitud inválida"],
    [500, "Error"],
  ])("status %i -> %s", (status, title) => {
    expect(getApiErrorTitle(fetchError({}, status))).toBe(title)
  })
})

describe("table search", () => {
  it("trims and cuts at 255 characters (the backend's limit)", () => {
    expect(normalizeTableSearch("  hola  ")).toBe("hola")
    expect(normalizeTableSearch(null)).toBe("")
    expect(normalizeTableSearch("a".repeat(300))).toHaveLength(255)
  })

  it("compares searches after normalizing", () => {
    expect(areTableSearchEqual(" a ", "a")).toBe(true)
    expect(areTableSearchEqual("a", "b")).toBe(false)
    expect(areTableSearchEqual(null, "")).toBe(true)
  })
})
