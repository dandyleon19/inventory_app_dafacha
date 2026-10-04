import { defineStore } from 'pinia'
import type { PageResponse } from "~/interfaces/PageResponse"
import type {
    InventoryValuation,
    StockAdjustmentRequest,
    StockCostLayer,
    StockListParams,
    StockLot,
    StockLotListParams,
    StockMovement,
    StockMovementListParams,
    StockMovementRequest,
    StockOperationPayload,
    StockSummary,
    StockTransferRequest,
} from "~/interfaces/stockInterfaces"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

export const useStockStore = defineStore('stock', {
    state: () => ({
        data: null as PageResponse<StockSummary> | null,
        valuation: null as InventoryValuation | null,
        movements: null as PageResponse<StockMovement> | null,
        lots: null as PageResponse<StockLot> | null,
        loading: false,
        movementsLoading: false,
        lotsLoading: false,
    }),

    actions: {
        async fetchStock(params: StockListParams = {}) {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string | boolean> = {
                    page: params.page ?? 0,
                    size: params.size ?? 10,
                }

                const search = normalizeTableSearch(params.search)
                if (search) query.search = search
                if (params.productId !== undefined) query.productId = params.productId
                if (params.warehouseId !== undefined) query.warehouseId = params.warehouseId
                if (params.isActive !== undefined) query.isActive = params.isActive
                if (params.lowStockOnly) query.lowStockOnly = true

                this.data = await $api<PageResponse<StockSummary>>('/api/stock', { method: 'GET', query })
            } catch (err) {
                console.error('Error al obtener el stock:', err)
            } finally {
                this.loading = false
            }
        },

        /** Stock of one product in one warehouse; 0 when it has never had any. Used to guide the forms. */
        async fetchQuantity(productId: number, warehouseId: number): Promise<number> {
            try {
                const { $api } = useNuxtApp()
                const res = await $api<PageResponse<StockSummary>>('/api/stock', {
                    method: 'GET',
                    query: { page: 0, size: 1, productId, warehouseId },
                })
                return res.content?.[0]?.quantity ?? 0
            } catch (err) {
                console.error('Error al obtener el stock actual:', err)
                return 0
            }
        },

        /** The lots a product has in one warehouse, earliest expiry first. For the exit / transfer forms. */
        async fetchLotsOf(productId: number, warehouseId: number): Promise<StockLot[]> {
            try {
                const { $api } = useNuxtApp()
                const res = await $api<PageResponse<StockLot>>('/api/stock/lots', {
                    method: 'GET',
                    query: { page: 0, size: 100, scope: "ALL", productId, warehouseId },
                })
                return res.content ?? []
            } catch (err) {
                console.error('Error al obtener los lotes del producto:', err)
                return []
            }
        },

        /** The purchases (what each cost, how much is left) of a product in a warehouse, oldest first. */
        async fetchCostLayers(productId: number, warehouseId: number): Promise<StockCostLayer[]> {
            try {
                const { $api } = useNuxtApp()
                return await $api<StockCostLayer[]>('/api/stock/cost-layers', {
                    method: 'GET',
                    query: { productId, warehouseId },
                })
            } catch (err) {
                console.error('Error al obtener las compras del producto:', err)
                return []
            }
        },

        async fetchValuation() {
            try {
                const { $api } = useNuxtApp()
                this.valuation = await $api<InventoryValuation>('/api/stock/valuation', { method: 'GET' })
            } catch (err) {
                console.error('Error al obtener la valorización:', err)
            }
        },

        /** Drops the loaded history so a table that remounts for another product doesn't flash the previous one. */
        clearMovements() {
            this.movements = null
        },

        async fetchLots(params: StockLotListParams = {}) {
            this.lotsLoading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string> = {
                    page: params.page ?? 0,
                    size: params.size ?? 10,
                    scope: params.scope ?? "ATTENTION",
                }

                if (params.productId !== undefined) query.productId = params.productId
                if (params.warehouseId !== undefined) query.warehouseId = params.warehouseId

                this.lots = await $api<PageResponse<StockLot>>('/api/stock/lots', { method: 'GET', query })
            } catch (err) {
                console.error('Error al obtener los lotes:', err)
            } finally {
                this.lotsLoading = false
            }
        },

        async fetchMovements(params: StockMovementListParams = {}) {
            this.movementsLoading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string> = {
                    page: params.page ?? 0,
                    size: params.size ?? 10,
                }

                if (params.productId !== undefined) query.productId = params.productId
                if (params.warehouseId !== undefined) query.warehouseId = params.warehouseId
                if (params.type !== undefined) query.type = params.type
                if (params.purchaseOrderId !== undefined) query.purchaseOrderId = params.purchaseOrderId

                this.movements = await $api<PageResponse<StockMovement>>('/api/stock/movements', {
                    method: 'GET',
                    query,
                })
            } catch (err) {
                console.error('Error al obtener los movimientos:', err)
            } finally {
                this.movementsLoading = false
            }
        },

        /** Sends the operation to the endpoint that matches its kind. */
        async register(payload: StockOperationPayload) {
            const { $api } = useNuxtApp()

            switch (payload.kind) {
                case "entry":
                    return await $api<StockMovement[]>('/api/stock/entries', {
                        method: 'POST',
                        body: payload.body satisfies StockMovementRequest,
                    })
                case "exit":
                    return await $api<StockMovement[]>('/api/stock/exits', {
                        method: 'POST',
                        body: payload.body satisfies StockMovementRequest,
                    })
                case "adjustment":
                    return await $api<StockMovement[]>('/api/stock/adjustments', {
                        method: 'POST',
                        body: payload.body satisfies StockAdjustmentRequest,
                    })
                case "transfer":
                    return await $api<StockMovement[]>('/api/stock/transfers', {
                        method: 'POST',
                        body: payload.body satisfies StockTransferRequest,
                    })
            }
        },
    },
})
