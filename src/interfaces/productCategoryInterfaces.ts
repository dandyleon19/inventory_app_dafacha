export interface ProductCategory {
  id?: number
  name: string
  description?: string | null
}

export interface ProductCategoryRequest {
  name: string
  description: string | null
}

export interface productCategoryDataModalForm {
  action: "create" | "update"
  rowId?: number
}
