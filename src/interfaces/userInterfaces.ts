export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN_USER"
  | "WAREHOUSE_USER"
  | "PURCHASING_USER"
  | "VIEWER"

export interface User {
  id?: number
  firstName: string
  lastName: string
  fullName?: string
  email: string
  isActive: boolean
  role?: UserRole
  companyId?: number
  companyName?: string
  /** The warehouses the user is limited to; empty means all of them. */
  warehouseIds?: number[]
  createdAt?: string
}

/** Body for creating (POST) and editing (PUT) a user. The password only applies to create. */
export interface UserRequest {
  firstName: string
  lastName: string
  email: string
  password?: string | null
  role: UserRole
  isActive: boolean
  warehouseIds: number[]
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super administrador",
  ADMIN_USER: "Administrador",
  WAREHOUSE_USER: "Encargado de almacén",
  PURCHASING_USER: "Compras",
  VIEWER: "Solo lectura",
}

export const USER_ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "primary",
  ADMIN_USER: "primary",
  WAREHOUSE_USER: "info",
  PURCHASING_USER: "warning",
  VIEWER: "default",
}

/** What each role can do, in plain words (shown while choosing a role). */
export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: "Todo, incluida la gestión de usuarios y la configuración.",
  ADMIN_USER: "Todo: usuarios, configuración, catálogo, almacenes, compras, stock y ajustes.",
  WAREHOUSE_USER: "Registra ingresos, salidas y transferencias, y recibe mercadería. No cambia el catálogo ni hace ajustes.",
  PURCHASING_USER: "Gestiona proveedores y órdenes de compra, y recibe mercadería. No mueve stock por su cuenta.",
  VIEWER: "Solo consulta: puede ver todo, pero no cambiar nada.",
}

/** The roles an admin can hand out (SUPER_ADMIN is never assigned from the UI). */
export const ASSIGNABLE_ROLES: UserRole[] = ["ADMIN_USER", "WAREHOUSE_USER", "PURCHASING_USER", "VIEWER"]

export const USER_ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({
  value: role,
  title: USER_ROLE_LABELS[role],
}))

export const getUserRoleLabel = (role?: UserRole | null) =>
  role ? USER_ROLE_LABELS[role] ?? role : "—"
