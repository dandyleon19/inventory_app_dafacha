/** State of a company's subscription, as computed by the backend. */
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "EXPIRED" | "SUSPENDED"

/** Keys of the features a plan can include. Core modules (catalog, stock, warehouses, users) are not gated. */
export type FeatureKey = "purchase_orders" | "audit_log"

export interface SubscriptionInfo {
  companyId: number | null
  companyName?: string | null
  planCode: string | null
  planName: string | null
  status: SubscriptionStatus
  /** True when the company cannot use the system (trial/payment over, or suspended). */
  blocked: boolean
  /** Blocked by hand. The company goes back to `resumeStatus` when it is reactivated. */
  suspended?: boolean
  resumeStatus?: SubscriptionStatus | null
  /** On the free trial (even if it already ended, or the company is suspended). */
  onTrial?: boolean
  /** Length of this company's trial in days. */
  trialDays?: number | null
  /** True while the trial days have not started: they start the first time a user of the company opens the app. */
  trialPending?: boolean
  trialStartedAt?: string | null
  trialEndsAt?: string | null
  currentPeriodEnd?: string | null
  graceEndsAt?: string | null
  /** Whole days until the trial / period / grace ends. null = no end date. */
  daysRemaining: number | null
  /** null = unlimited */
  maxWarehouses: number | null
  maxUsers: number | null
  features: string[]
  notes?: string | null
}

export interface PlanInfo {
  code: string
  name: string
  priceMonthly?: number | null
  maxWarehouses: number | null
  maxUsers: number | null
  features: string[]
}

export interface SubscriptionEvent {
  id: number
  eventType: string
  detail?: string | null
  userId?: number | null
  createdAt: string
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Prueba gratis",
  ACTIVE: "Activo",
  PAST_DUE: "Pago vencido",
  EXPIRED: "Vencido",
  SUSPENDED: "Suspendido",
}

export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  TRIAL: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  EXPIRED: "error",
  SUSPENDED: "error",
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  purchase_orders: "Proveedores y órdenes de compra",
  audit_log: "Auditoría",
}

export const EVENT_LABELS: Record<string, string> = {
  TRIAL_CREATED: "Prueba asignada",
  TRIAL_STARTED: "Prueba iniciada (primer ingreso)",
  TRIAL_EXTENDED: "Prueba extendida",
  TRIAL_DAYS_CHANGED: "Días de prueba cambiados",
  ACTIVATED: "Plan activado",
  PLAN_UPDATED: "Plan o vencimiento cambiado",
  SUSPENDED: "Suspendido",
  RESUMED: "Reactivado",
}

/** Label of a company's state; a trial that has not started yet is shown as such. */
export const subscriptionStatusText = (info: Pick<SubscriptionInfo, "status" | "trialPending">): string =>
  info.status === "TRIAL" && info.trialPending ? "Prueba sin iniciar" : SUBSCRIPTION_STATUS_LABELS[info.status]

/** The feature a page needs, or null when the page is core. Mirrors the backend's FeatureRoutes. */
export const requiredFeatureForPath = (path: string): FeatureKey | null => {
  if (path.startsWith("/app/purchase-orders") || path.startsWith("/app/suppliers") || path.startsWith("/app/receipts")) {
    return "purchase_orders"
  }
  if (path.startsWith("/app/audit")) return "audit_log"
  return null
}

/** "5 días" style text for a number of days left. */
export const formatDaysLeft = (days: number | null | undefined): string => {
  if (days === null || days === undefined) return ""
  if (days <= 0) return "hoy"
  return `${days} día${days === 1 ? "" : "s"}`
}
