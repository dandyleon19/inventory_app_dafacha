import { defineStore } from 'pinia'
import type { DashboardSummary } from "~/interfaces/dashboardInterfaces"

/** The alerts bell asks on every navigation; within this window it reuses what it already has. */
const FRESH_FOR_MS = 30_000

export const useDashboardStore = defineStore('dashboard', {
    state: () => ({
        summary: null as DashboardSummary | null,
        loading: false,
        lastFetchedAt: 0,
    }),

    getters: {
        /** What the alerts bell shows: one number per kind of alert, and the grand total. */
        alertCounts: (state) => {
            const s = state.summary
            const lowStock = s?.lowStockCount ?? 0
            const expiry = (s?.expiredLotCount ?? 0) + (s?.expiringLotCount ?? 0)
            const arrivals = s?.arrivingOrderCount ?? 0

            return { lowStock, expiry, arrivals, total: lowStock + expiry + arrivals }
        },
    },

    actions: {
        /** `force` skips the freshness window (the dashboard page itself, or right after a change). */
        async fetchSummary(force = false) {
            if (this.loading) return
            if (!force && this.summary && Date.now() - this.lastFetchedAt < FRESH_FOR_MS) return

            this.loading = true
            try {
                const { $api } = useNuxtApp()
                this.summary = await $api<DashboardSummary>('/api/dashboard', { method: 'GET' })
                this.lastFetchedAt = Date.now()
            } catch (err) {
                console.error('Error al obtener el dashboard:', err)
            } finally {
                this.loading = false
            }
        },
    },
})
