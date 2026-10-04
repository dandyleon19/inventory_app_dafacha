export interface Supplier {
  id?: number
  name: string
  rucNumber?: string | null
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  isActive: boolean
}

/** Body for POST/PUT /api/suppliers. */
export interface SupplierRequest {
  name: string
  rucNumber: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
}
