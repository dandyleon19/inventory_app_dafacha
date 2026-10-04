export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ORDER"
  | "RECEIVE"
  | "CANCEL"
  | "PASSWORD_RESET"
  | "LOGIN"

export type AuditEntity =
  | "PRODUCT"
  | "CATEGORY"
  | "SUPPLIER"
  | "WAREHOUSE"
  | "PURCHASE_ORDER"
  | "USER"
  | "COMPANY"
  | "SETTINGS"
  | "SESSION"

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Creó",
  UPDATE: "Modificó",
  DELETE: "Eliminó",
  ORDER: "Hizo el pedido",
  RECEIVE: "Recibió mercadería",
  CANCEL: "Canceló",
  PASSWORD_RESET: "Restableció la contraseña",
  LOGIN: "Inició sesión",
}

export const AUDIT_ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "error",
  ORDER: "info",
  RECEIVE: "success",
  CANCEL: "warning",
  PASSWORD_RESET: "warning",
  LOGIN: "default",
}

export const AUDIT_ENTITY_LABELS: Record<AuditEntity, string> = {
  PRODUCT: "Producto",
  CATEGORY: "Categoría",
  SUPPLIER: "Proveedor",
  WAREHOUSE: "Almacén",
  PURCHASE_ORDER: "Orden de compra",
  USER: "Usuario",
  COMPANY: "Empresa",
  SETTINGS: "Configuración",
  SESSION: "Sesión",
}

export const AUDIT_ACTION_OPTIONS = (Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((action) => ({
  value: action,
  title: AUDIT_ACTION_LABELS[action],
}))

export const AUDIT_ENTITY_OPTIONS = (Object.keys(AUDIT_ENTITY_LABELS) as AuditEntity[]).map((entity) => ({
  value: entity,
  title: AUDIT_ENTITY_LABELS[entity],
}))

export const getAuditActionLabel = (action?: AuditAction | null) =>
  action ? AUDIT_ACTION_LABELS[action] ?? action : "—"

export const getAuditEntityLabel = (entity?: AuditEntity | null) =>
  entity ? AUDIT_ENTITY_LABELS[entity] ?? entity : "—"

export interface AuditLog {
  id: number
  userId?: number | null
  userName?: string | null
  action: AuditAction
  entityType: AuditEntity
  entityId?: number | null
  entityLabel?: string | null
  /** One line per field: "Campo: antes → después". */
  details?: string | null
  createdAt: string
}

export interface AuditListParams {
  page?: number
  size?: number
  search?: string
  entityType?: AuditEntity
  action?: AuditAction
  userId?: number
  /** yyyy-mm-dd, inclusive */
  from?: string
  /** yyyy-mm-dd, inclusive */
  to?: string
}
