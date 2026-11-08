import { describe, expect, it } from "vitest"
import { validationRules as rules } from "~/helpers/validationFormRules"

const REQUIRED = "Este campo es requerido"

describe("rules.required", () => {
  it.each([null, undefined, "", "   ", "\t\n"])("rejects %j", (value) => {
    expect(rules.required(value as any)).toBe(REQUIRED)
  })

  // The backend uses @NotBlank, so a name made only of spaces must not pass the form either.
  it("treats a text made only of spaces as empty", () => {
    expect(rules.required("   ")).toBe(REQUIRED)
  })

  it.each(["a", " a ", 0, 12.5, true, false])("accepts %j", (value) => {
    expect(rules.required(value as any)).toBe(true)
  })
})

describe("rules.email", () => {
  it.each(["a@b.co", "usuario.nombre@empresa.com.pe"])("accepts %s", (value) => {
    expect(rules.email(value)).toBe(true)
  })

  it.each(["", "a", "a@b", "a b@c.com", "@c.com"])("rejects %j", (value) => {
    expect(rules.email(value)).toBe("Correo inválido")
  })
})

describe("rules.number / nonNegative", () => {
  it("number accepts numeric text and rejects words", () => {
    expect(rules.number("12.5")).toBe(true)
    expect(rules.number("abc")).toBe("Debe ser un número válido")
  })

  it("nonNegative accepts 0 and empty, rejects negatives", () => {
    expect(rules.nonNegative(0)).toBe(true)
    expect(rules.nonNegative("")).toBe(true)
    expect(rules.nonNegative(null)).toBe(true)
    expect(rules.nonNegative("-0.01")).toBe("Debe ser mayor o igual a 0")
  })
})

describe("rules.maxDecimals", () => {
  const two = rules.maxDecimals(2)
  const four = rules.maxDecimals(4)

  it("accepts values within the decimals allowed", () => {
    expect(two("10")).toBe(true)
    expect(two("10.5")).toBe(true)
    expect(two("10.55")).toBe(true)
    expect(four("0.1234")).toBe(true)
    expect(two("")).toBe(true)
    expect(two(null)).toBe(true)
  })

  it("rejects more decimals than allowed", () => {
    expect(two("10.555")).toBe("Máximo 2 decimales")
    expect(four("0.12345")).toBe("Máximo 4 decimales")
  })
})

describe("rules.maxLength / minLength", () => {
  it("maxLength lets empty values pass and cuts at the limit", () => {
    expect(rules.maxLength(3)("")).toBe(true)
    expect(rules.maxLength(3)(null)).toBe(true)
    expect(rules.maxLength(3)("abc")).toBe(true)
    expect(rules.maxLength(3)("abcd")).toBe("Máximo 3 caracteres")
  })

  it("minLength counts characters and treats missing as empty", () => {
    expect(rules.minLength(8)("12345678")).toBe(true)
    expect(rules.minLength(8)("1234567")).toBe("Debe tener al menos 8 caracteres")
    expect(rules.minLength(8)(null)).toBe("Debe tener al menos 8 caracteres")
  })
})
