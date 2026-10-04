export interface Warehouse {
  id?: number
  name: string
  address?: string | null
  isActive: boolean
}

/** Body for POST/PUT /api/warehouses. */
export interface WarehouseRequest {
  name: string
  address: string | null
  isActive: boolean
}
