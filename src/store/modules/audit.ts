import { defineStore } from 'pinia'
import type { AuditListParams, AuditLog } from "~/interfaces/auditInterfaces"
import type { PageResponse } from "~/interfaces/PageResponse"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

export const useAuditStore = defineStore('audit', {
    state: () => ({
        data: null as PageResponse<AuditLog> | null,
        loading: false,
    }),

    actions: {
        async fetchLogs(params: AuditListParams = {}) {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string> = {
                    page: params.page ?? 0,
                    size: params.size ?? 20,
                }

                const search = normalizeTableSearch(params.search ?? "")
                if (search) query.search = search
                if (params.entityType) query.entityType = params.entityType
                if (params.action) query.action = params.action
                if (params.userId) query.userId = params.userId
                if (params.from) query.from = params.from
                if (params.to) query.to = params.to

                this.data = await $api<PageResponse<AuditLog>>('/api/audit', { method: 'GET', query })
            } catch (err) {
                console.error('Error al obtener la auditoría:', err)
            } finally {
                this.loading = false
            }
        },
    },
})
