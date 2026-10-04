import { defineStore } from 'pinia'
import type { ProductCategory, ProductCategoryRequest } from "~/interfaces/productCategoryInterfaces"
import type { PageResponse } from "~/interfaces/PageResponse"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

const MAX_PAGE_SIZE = 100

export const useProductCategoriesStore = defineStore('product-categories', {
    state: () => ({
        data: null as PageResponse<ProductCategory> | null,
        /** Every category (up to one page of 100), for selects and filters. */
        options: [] as ProductCategory[],
        loading: false,
    }),

    actions: {
        async fetchProductCategories(page = 0, size = 10, search = "") {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string> = { page, size }

                const normalizedSearch = normalizeTableSearch(search)
                if (normalizedSearch) {
                    query.search = normalizedSearch
                }

                this.data = await $api<PageResponse<ProductCategory>>('/api/product-categories', {
                    method: 'GET',
                    query,
                })
            } catch (err) {
                console.error('Error al obtener categorías de producto:', err)
            } finally {
                this.loading = false
            }
        },

        async fetchOptions() {
            try {
                const { $api } = useNuxtApp()
                const res = await $api<PageResponse<ProductCategory>>('/api/product-categories', {
                    method: 'GET',
                    query: { page: 0, size: MAX_PAGE_SIZE },
                })
                this.options = res.content ?? []
            } catch (err) {
                console.error('Error al obtener las opciones de categoría:', err)
                this.options = []
            }
        },

        async createProductCategory(body: ProductCategoryRequest) {
            const { $api } = useNuxtApp()
            return await $api<ProductCategory>('/api/product-categories', { method: 'POST', body })
        },

        async updateProductCategory(id: number, body: ProductCategoryRequest) {
            const { $api } = useNuxtApp()
            return await $api<ProductCategory>(`/api/product-categories/${id}`, { method: 'PUT', body })
        },

        async deleteProductCategory(id: number) {
            const { $api } = useNuxtApp()
            await $api(`/api/product-categories/${id}`, { method: 'DELETE' })
        },
    },
})
