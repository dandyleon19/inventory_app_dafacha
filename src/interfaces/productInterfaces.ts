export type UnitOfMeasure =
  | "UNIT"
  | "KILOGRAM"
  | "GRAM"
  | "LITER"
  | "MILLILITER"
  | "METER"
  | "BOX"
  | "PACK"
  | "DOZEN"

export const UNIT_LABELS: Record<UnitOfMeasure, string> = {
  UNIT: "Unidad",
  KILOGRAM: "Kilogramo (kg)",
  GRAM: "Gramo (g)",
  LITER: "Litro (L)",
  MILLILITER: "Mililitro (ml)",
  METER: "Metro (m)",
  BOX: "Caja",
  PACK: "Paquete",
  DOZEN: "Docena",
}

/** Short form for tables, where the full label is too wide. */
export const UNIT_SHORT_LABELS: Record<UnitOfMeasure, string> = {
  UNIT: "und",
  KILOGRAM: "kg",
  GRAM: "g",
  LITER: "L",
  MILLILITER: "ml",
  METER: "m",
  BOX: "caja",
  PACK: "paq",
  DOZEN: "doc",
}

export const UNIT_OPTIONS = (Object.keys(UNIT_LABELS) as UnitOfMeasure[]).map((unit) => ({
  value: unit,
  title: UNIT_LABELS[unit],
}))

export const getUnitLabel = (unit?: UnitOfMeasure | null) =>
  unit ? UNIT_LABELS[unit] ?? unit : "—"

export const getUnitShortLabel = (unit?: UnitOfMeasure | null) =>
  unit ? UNIT_SHORT_LABELS[unit] ?? unit : "—"

export interface Product {
  id?: number
  categoryId: number | null
  categoryName?: string | null
  name: string
  description?: string | null
  sku?: string | null
  barcode?: string | null
  unit: UnitOfMeasure
  costPrice: number
  salePrice: number
  marginAmount?: number | null
  marginPercent?: number | null
  minStock: number
  /** Stock is kept in lots with an expiry date, and exits take the earliest-expiring lot first. */
  tracksExpiry: boolean
  isActive: boolean
}

/** Body for POST/PUT /api/products. */
export interface ProductRequest {
  categoryId: number | null
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  unit: UnitOfMeasure
  costPrice: number
  salePrice: number
  minStock: number
  tracksExpiry: boolean
  isActive: boolean
}

/** A product as offered by pickers (search results): just what a form needs to show and fill in. */
export interface ProductOption {
  id: number
  name: string
  sku?: string | null
  unit: UnitOfMeasure
  costPrice?: number
  tracksExpiry?: boolean
}

export interface ProductListParams {
  page?: number
  size?: number
  search?: string
  categoryId?: number
  isActive?: boolean
}
