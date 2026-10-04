import type { UnitOfMeasure } from "~/interfaces/productInterfaces"

export type PurchaseOrderStatus =
  | "DRAFT"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED"

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Borrador",
  ORDERED: "Pedida",
  PARTIALLY_RECEIVED: "Parcialmente recibida",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
}

export const PURCHASE_ORDER_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "default",
  ORDERED: "info",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "error",
}

export const PURCHASE_ORDER_STATUS_OPTIONS = (
  Object.keys(PURCHASE_ORDER_STATUS_LABELS) as PurchaseOrderStatus[]
).map((status) => ({
  value: status,
  title: PURCHASE_ORDER_STATUS_LABELS[status],
}))

export const getPurchaseOrderStatusLabel = (status?: PurchaseOrderStatus | null) =>
  status ? PURCHASE_ORDER_STATUS_LABELS[status] ?? status : "—"

export interface PurchaseOrderLine {
  id?: number
  productId: number
  productName?: string | null
  productSku?: string | null
  unit?: UnitOfMeasure
  /** The product keeps lots with an expiry date, so receiving it needs one. */
  tracksExpiry?: boolean
  quantity: number
  unitCost: number
  /** How the line was bought, in the user's words ("1 paquete de 12 + 6 sueltas"). Informative only. */
  packaging?: string | null
  /** What the form wrote to describe how the line was entered; editing restores the line from it. */
  entryInput?: string | null
  receivedQuantity?: number
  pendingQuantity?: number
  lineTotal?: number
}

export interface PurchaseOrder {
  id: number
  number: string
  status: PurchaseOrderStatus
  supplierId: number
  supplierName?: string | null
  warehouseId: number
  warehouseName?: string | null
  expectedDate?: string | null
  notes?: string | null
  total: number
  /** Only in the list; the detail carries `lines`. */
  lineCount?: number
  createdByName?: string | null
  orderedAt?: string | null
  cancelledAt?: string | null
  createdAt: string
  lines?: PurchaseOrderLine[]
}

/** Body for POST/PUT /api/purchase-orders. */
export interface PurchaseOrderRequest {
  supplierId: number
  warehouseId: number
  expectedDate: string | null
  notes: string | null
  lines: Array<{
    productId: number
    quantity: number
    unitCost: number
    packaging?: string | null
    entryInput?: string | null
  }>
}

/** Body for POST /api/purchase-orders/{id}/receive. */
export interface ReceiveRequest {
  /** The day the goods arrived (yyyy-mm-dd). Today by default; never in the future. */
  receivedDate?: string | null
  items: Array<{
    lineId: number
    quantity: number
    /** Required when the line's product tracks expiry (ISO date, yyyy-mm-dd). */
    expiryDate?: string | null
    lotNumber?: string | null
  }>
}

export interface PurchaseOrderListParams {
  page?: number
  size?: number
  search?: string
  status?: PurchaseOrderStatus
  supplierId?: number
}
