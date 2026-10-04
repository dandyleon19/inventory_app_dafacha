import type { UnitOfMeasure } from "~/interfaces/productInterfaces"

export type MovementType = "ENTRY" | "PURCHASE" | "EXIT" | "ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT"

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  ENTRY: "Ingreso",
  PURCHASE: "Compra",
  EXIT: "Salida",
  ADJUSTMENT: "Ajuste",
  TRANSFER_IN: "Transferencia (entrada)",
  TRANSFER_OUT: "Transferencia (salida)",
}

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  ENTRY: "success",
  PURCHASE: "primary",
  EXIT: "error",
  ADJUSTMENT: "warning",
  TRANSFER_IN: "info",
  TRANSFER_OUT: "info",
}

export const MOVEMENT_TYPE_OPTIONS = (Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map((type) => ({
  value: type,
  title: MOVEMENT_TYPE_LABELS[type],
}))

export const getMovementTypeLabel = (type?: MovementType | null) =>
  type ? MOVEMENT_TYPE_LABELS[type] ?? type : "—"

/** The four things a user can do to stock from the UI. */
export type StockOperationKind = "entry" | "exit" | "adjustment" | "transfer"

export const STOCK_OPERATION_TITLES: Record<StockOperationKind, string> = {
  entry: "Registrar ingreso",
  exit: "Registrar salida",
  adjustment: "Ajuste por conteo físico",
  transfer: "Transferir entre almacenes",
}

/** A product's stock, summed over all warehouses or limited to one. */
export interface StockSummary {
  productId: number
  sku?: string | null
  productName: string
  unit: UnitOfMeasure
  minStock: number
  costPrice: number
  tracksExpiry?: boolean
  isActive: boolean
  quantity: number
  value: number
  lowStock: boolean
}

export type LotScope = "ALL" | "EXPIRED" | "EXPIRING" | "ATTENTION"

export const LOT_SCOPE_OPTIONS: Array<{ value: LotScope; title: string }> = [
  { value: "ATTENTION", title: "Vencidos y por vencer" },
  { value: "EXPIRED", title: "Solo vencidos" },
  { value: "EXPIRING", title: "Solo por vencer" },
  { value: "ALL", title: "Todos (cualquier fecha)" },
]

/** What is left of one batch of an expiry-tracked product. */
export interface StockLot {
  id: number
  warehouseId: number
  warehouseName?: string | null
  productId: number
  productName?: string | null
  productSku?: string | null
  unit: UnitOfMeasure
  /** Empty when the lot has no number. */
  lotNumber?: string | null
  expiryDate: string
  quantity: number
  /** Negative when already expired. */
  daysToExpiry: number
}

export interface StockLotListParams {
  page?: number
  size?: number
  productId?: number
  warehouseId?: number
  scope?: LotScope
}

/** Human text for the days left of a lot: "Vence hoy", "Vence en 12 días", "Venció hace 3 días". */
export const describeDaysToExpiry = (days: number): string => {
  if (days === 0) return "Vence hoy"
  if (days > 0) return `Vence en ${days} día${days === 1 ? "" : "s"}`
  const ago = Math.abs(days)
  return `Venció hace ${ago} día${ago === 1 ? "" : "s"}`
}

/** Chip colour for a lot: red once expired, amber when it is inside the alert window, green otherwise. */
export const expiryColor = (days: number, alertDays: number): string => {
  if (days < 0) return "error"
  if (days <= alertDays) return "warning"
  return "success"
}

export interface WarehouseValuation {
  warehouseId: number
  warehouseName: string
  value: number
  productCount: number
}

export interface InventoryValuation {
  totalValue: number
  warehouses: WarehouseValuation[]
}

export interface StockMovement {
  id: number
  warehouseId: number
  warehouseName?: string | null
  productId: number
  productName?: string | null
  productSku?: string | null
  type: MovementType
  /** Signed: positive = stock in, negative = stock out. */
  quantity: number
  balanceAfter: number
  unitCost: number
  notes?: string | null
  transferRef?: string | null
  purchaseOrderId?: number | null
  purchaseOrderNumber?: string | null
  supplierName?: string | null
  lotNumber?: string | null
  expiryDate?: string | null
  userId?: number | null
  userName?: string | null
  createdAt: string
}

export interface StockListParams {
  page?: number
  size?: number
  search?: string
  productId?: number
  warehouseId?: number
  isActive?: boolean
  lowStockOnly?: boolean
}

export interface StockMovementListParams {
  page?: number
  size?: number
  productId?: number
  warehouseId?: number
  type?: MovementType
  purchaseOrderId?: number
}

/** One purchase of a product in a warehouse, with what is left of it and what each unit cost. */
export interface StockCostLayer {
  id: number
  unitCost: number
  quantity: number
  expiryDate?: string | null
  lotNumber?: string | null
  receivedAt: string
}

/** How much to take from one purchase (company cost method MANUAL). */
export interface StockLayerPick {
  layerId: number
  quantity: number
}

/** How much to take from one lot. A null lotId means the units that have no expiry date. */
export interface StockLotPick {
  lotId: number | null
  quantity: number
}

/** Body for POST /api/stock/entries and /exits. */
export interface StockMovementRequest {
  warehouseId: number
  productId: number
  quantity: number
  /** Entries of a product that tracks expiry (ISO date, yyyy-mm-dd). */
  expiryDate?: string | null
  lotNumber?: string | null
  /** Exits of a product that tracks expiry: the lots to take from. Missing = the ones that expire first. */
  lots?: StockLotPick[]
  /** Entries: what each unit cost. Missing = the product's current cost. */
  unitCost?: number | null
  /** Exits of a product without expiry control: the purchases to take from (cost method MANUAL). */
  layers?: StockLayerPick[]
  notes: string | null
}

/** What was counted in one lot. A null lotId means the units without an expiry date. */
export interface StockLotCount {
  lotId: number | null
  countedQuantity: number
}

/** A lot found in the count that the system did not have. */
export interface StockNewLot {
  expiryDate: string
  lotNumber?: string | null
  quantity: number
}

export interface StockAdjustmentRequest {
  warehouseId: number
  productId: number
  countedQuantity: number
  /** Needed when the count is higher than the stock and the product tracks expiry. */
  expiryDate?: string | null
  lotNumber?: string | null
  /** Product that tracks expiry, counted lot by lot: `countedQuantity` is their total plus `newLots`. */
  lotCounts?: StockLotCount[]
  newLots?: StockNewLot[]
  notes: string | null
}

export interface StockTransferRequest {
  fromWarehouseId: number
  toWarehouseId: number
  productId: number
  quantity: number
  /** Product that tracks expiry: the lots to move. Missing = the ones that expire first. */
  lots?: StockLotPick[]
  /** Product without expiry control: the purchases to move (cost method MANUAL). */
  layers?: StockLayerPick[]
  notes: string | null
}

/** What the operation form emits; the page maps it to the right endpoint by kind. */
export type StockOperationPayload =
  | { kind: "entry" | "exit"; body: StockMovementRequest }
  | { kind: "adjustment"; body: StockAdjustmentRequest }
  | { kind: "transfer"; body: StockTransferRequest }

/** A product picked in the operation form (also used to pre-select one from a table row). */
export interface StockProductOption {
  id: number
  name: string
  sku?: string | null
  unit: UnitOfMeasure
  tracksExpiry?: boolean
}
