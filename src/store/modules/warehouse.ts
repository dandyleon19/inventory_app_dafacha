import { defineStore } from 'pinia'
import type { Warehouse, WarehouseRequest } from "~/interfaces/warehouseInterfaces"
import type { PageResponse } from "~/interfaces/PageResponse"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

const MAX_PAGE_SIZE = 100

export const useWarehousesStore = defineStore('warehouses', {
    state: () => ({
        data: null as PageResponse<Warehouse> | null,
        /** All warehouses (up to one page of 100), for selects in the stock forms and filters. */
        options: [] as Warehouse[],
        loading: false,
    }),

    getters: {
        activeOptions: (state): Warehouse[] => state.options.filter((warehouse) => warehouse.isActive),
    },

    actions: {
        async fetchWarehouses(page = 0, size = 10, search = "") {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string> = { page, size }

                const normalizedSearch = normalizeTableSearch(search)
                if (normalizedSearch) {
                    query.search = normalizedSearch
                }

                this.data = await $api<PageResponse<Warehouse>>('/api/warehouses', { method: 'GET', query })
            } catch (err) {
                console.error('Error al obtener almacenes:', err)
            } finally {
                this.loading = false
            }
        },

        async fetchOptions() {
            try {
                const { $api } = useNuxtApp()
                const res = await $api<PageResponse<Warehouse>>('/api/warehouses', {
                    method: 'GET',
                    query: { page: 0, size: MAX_PAGE_SIZE },
                })
                this.options = res.content ?? []
            } catch (err) {
                console.error('Error al obtener las opciones de almacén:', err)
                this.options = []
            }
        },

        async createWarehouse(body: WarehouseRequest) {
            const { $api } = useNuxtApp()
            return await $api<Warehouse>('/api/warehouses', { method: 'POST', body })
        },

        async updateWarehouse(id: number, body: WarehouseRequest) {
            const { $api } = useNuxtApp()
            return await $api<Warehouse>(`/api/warehouses/${id}`, { method: 'PUT', body })
        },

        async deleteWarehouse(id: number) {
            const { $api } = useNuxtApp()
            await $api(`/api/warehouses/${id}`, { method: 'DELETE' })
        },
    },
})
