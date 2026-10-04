import { defineStore } from 'pinia'
import type { Product, ProductListParams, ProductRequest } from "~/interfaces/productInterfaces"
import type { PageResponse } from "~/interfaces/PageResponse"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

export const useProductsStore = defineStore('product', {
    state: () => ({
        data: null as PageResponse<Product> | null,
        loading: false,
    }),

    actions: {
        async fetchProducts(params: ProductListParams = {}) {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string | boolean> = {
                    page: params.page ?? 0,
                    size: params.size ?? 10,
                }

                const search = normalizeTableSearch(params.search)
                if (search) query.search = search
                if (params.categoryId !== undefined) query.categoryId = params.categoryId
                if (params.isActive !== undefined) query.isActive = params.isActive

                this.data = await $api<PageResponse<Product>>('/api/products', {
                    method: 'GET',
                    query,
                })
            } catch (err) {
                console.error('Error al obtener productos:', err)
            } finally {
                this.loading = false
            }
        },

        async createProduct(body: ProductRequest) {
            const { $api } = useNuxtApp()
            return await $api<Product>('/api/products', { method: 'POST', body })
        },

        async updateProduct(id: number, body: ProductRequest) {
            const { $api } = useNuxtApp()
            return await $api<Product>(`/api/products/${id}`, { method: 'PUT', body })
        },

        async deleteProduct(id: number) {
            const { $api } = useNuxtApp()
            await $api(`/api/products/${id}`, { method: 'DELETE' })
        },
    },
})
