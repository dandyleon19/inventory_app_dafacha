import type { PurchaseOrder } from "~/interfaces/purchaseOrderInterfaces"
import type { StockLot, StockMovement, StockSummary, WarehouseValuation } from "~/interfaces/stockInterfaces"

/** GET /api/dashboard: valuation, alert counters and short lists, in one response. */
export interface DashboardSummary {
  totalValue: number
  activeProductCount: number
  warehouseCount: number

  lowStockCount: number
  expiredLotCount: number
  expiringLotCount: number
  arrivingOrderCount: number
  overdueOrderCount: number

  /** The windows (in days) the counters were computed with; they come from the company settings. */
  expiryAlertDays: number
  purchaseArrivalAlertDays: number

  warehouses: WarehouseValuation[]
  lowStock: StockSummary[]
  expiringLots: StockLot[]
  arrivingOrders: PurchaseOrder[]
  recentMovements: StockMovement[]
}
