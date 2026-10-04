export interface Company {
  id?: number
  name: string
  socialReason?: string | null
  fiscalAddress?: string | null
  rucNumber?: string | null
  phone?: string | null
}

/** Body for PUT /api/company. */
export interface CompanyRequest {
  name: string
  socialReason: string | null
  fiscalAddress: string | null
  rucNumber: string | null
  phone: string | null
}

/** Who decides what leaves on an exit or a transfer: the system (FIFO) or the user (MANUAL). */
export type CostMethod = "FIFO" | "MANUAL"

export const COST_METHOD_OPTIONS: Array<{ value: CostMethod; title: string }> = [
  { value: "FIFO", title: "Automático" },
  { value: "MANUAL", title: "Lo elijo yo en cada salida" },
]

/** Which product fields the company makes mandatory. Everything is optional by default. */
export interface CompanySettings {
  requireProductSku: boolean
  requireProductCategory: boolean
  requireProductBarcode: boolean
  /** When off (default), an exit or transfer larger than the available stock is rejected. */
  allowNegativeStock: boolean
  /** Lots expiring within this many days count as "expiring soon" in alerts. */
  expiryAlertDays: number
  /** Open purchase orders expected within this many days count as "arriving soon". */
  purchaseArrivalAlertDays: number
  /** FIFO ("Automático"): the lot that expires first / the oldest purchase leaves. MANUAL: the user picks every time. */
  costMethod: CostMethod
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  requireProductSku: false,
  requireProductCategory: false,
  requireProductBarcode: false,
  allowNegativeStock: false,
  expiryAlertDays: 30,
  purchaseArrivalAlertDays: 7,
  costMethod: "FIFO",
}
