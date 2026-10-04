import { defineStore } from 'pinia'
import type { Supplier, SupplierRequest } from "~/interfaces/supplierInterfaces"
import type { PageResponse } from "~/interfaces/PageResponse"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

const MAX_PAGE_SIZE = 100

export const useSuppliersStore = defineStore('suppliers', {
    state: () => ({
        data: null as PageResponse<Supplier> | null,
        /** All suppliers (up to one page of 100), for selects in purchase orders and filters. */
        options: [] as Supplier[],
        loading: false,
    }),

    getters: {
        activeOptions: (state): Supplier[] => state.options.filter((supplier) => supplier.isActive),
    },

    actions: {
        async fetchSuppliers(page = 0, size = 10, search = "") {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string> = { page, size }

                const normalizedSearch = normalizeTableSearch(search)
                if (normalizedSearch) {
                    query.search = normalizedSearch
                }

                this.data = await $api<PageResponse<Supplier>>('/api/suppliers', { method: 'GET', query })
            } catch (err) {
                console.error('Error al obtener proveedores:', err)
            } finally {
                this.loading = false
            }
        },

        async fetchOptions() {
            try {
                const { $api } = useNuxtApp()
                const res = await $api<PageResponse<Supplier>>('/api/suppliers', {
                    method: 'GET',
                    query: { page: 0, size: MAX_PAGE_SIZE },
                })
                this.options = res.content ?? []
            } catch (err) {
                console.error('Error al obtener las opciones de proveedor:', err)
                this.options = []
            }
        },

        async createSupplier(body: SupplierRequest) {
            const { $api } = useNuxtApp()
            return await $api<Supplier>('/api/suppliers', { method: 'POST', body })
        },

        async updateSupplier(id: number, body: SupplierRequest) {
            const { $api } = useNuxtApp()
            return await $api<Supplier>(`/api/suppliers/${id}`, { method: 'PUT', body })
        },

        async deleteSupplier(id: number) {
            const { $api } = useNuxtApp()
            await $api(`/api/suppliers/${id}`, { method: 'DELETE' })
        },
    },
})
