import { defineStore } from 'pinia'
import type {
    PurchaseOrder,
    PurchaseOrderListParams,
    PurchaseOrderRequest,
    ReceiveRequest,
} from "~/interfaces/purchaseOrderInterfaces"
import type { PageResponse } from "~/interfaces/PageResponse"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

export const usePurchaseOrdersStore = defineStore('purchase-orders', {
    state: () => ({
        data: null as PageResponse<PurchaseOrder> | null,
        loading: false,
    }),

    actions: {
        async fetchOrders(params: PurchaseOrderListParams = {}) {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string> = {
                    page: params.page ?? 0,
                    size: params.size ?? 10,
                }

                const search = normalizeTableSearch(params.search)
                if (search) query.search = search
                if (params.status !== undefined) query.status = params.status
                if (params.supplierId !== undefined) query.supplierId = params.supplierId

                this.data = await $api<PageResponse<PurchaseOrder>>('/api/purchase-orders', {
                    method: 'GET',
                    query,
                })
            } catch (err) {
                console.error('Error al obtener órdenes de compra:', err)
            } finally {
                this.loading = false
            }
        },

        /** The order with its lines. Throws, so the page can show "not found". */
        async fetchOrder(id: number) {
            const { $api } = useNuxtApp()
            return await $api<PurchaseOrder>(`/api/purchase-orders/${id}`, { method: 'GET' })
        },

        async createOrder(body: PurchaseOrderRequest) {
            const { $api } = useNuxtApp()
            return await $api<PurchaseOrder>('/api/purchase-orders', { method: 'POST', body })
        },

        async updateOrder(id: number, body: PurchaseOrderRequest) {
            const { $api } = useNuxtApp()
            return await $api<PurchaseOrder>(`/api/purchase-orders/${id}`, { method: 'PUT', body })
        },

        async deleteOrder(id: number) {
            const { $api } = useNuxtApp()
            await $api(`/api/purchase-orders/${id}`, { method: 'DELETE' })
        },

        async markOrdered(id: number) {
            const { $api } = useNuxtApp()
            return await $api<PurchaseOrder>(`/api/purchase-orders/${id}/order`, { method: 'POST' })
        },

        async receive(id: number, body: ReceiveRequest) {
            const { $api } = useNuxtApp()
            return await $api<PurchaseOrder>(`/api/purchase-orders/${id}/receive`, { method: 'POST', body })
        },

        async cancelOrder(id: number) {
            const { $api } = useNuxtApp()
            return await $api<PurchaseOrder>(`/api/purchase-orders/${id}/cancel`, { method: 'POST' })
        },
    },
})
