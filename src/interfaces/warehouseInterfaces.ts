export interface Warehouse {
  id?: number
  name: string
  address?: string | null
  isActive: boolean
  /** Which company it belongs to (the platform owner sees every company's warehouses). */
  companyId?: number
  companyName?: string | null
}

/** Body for POST/PUT /api/warehouses. */
export interface WarehouseRequest {
  name: string
  address: string | null
  isActive: boolean
  /** Only the platform owner (SUPER_ADMIN) sends it, when creating: the company the warehouse belongs to. */
  companyId?: number
}
