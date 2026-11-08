import { defineStore } from 'pinia'
import type { Company, CompanyRequest } from "~/interfaces/companyInterfaces"
import type { PageResponse } from "~/interfaces/PageResponse"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

/** The first administrator of a new company. */
export interface CompanyAdminRequest {
    firstName: string
    lastName: string
    email: string
    password: string
}

/** Every company of the platform (SUPER_ADMIN only). */
export const useCompanyAdminStore = defineStore('companyAdmin', {
    state: () => ({
        data: null as PageResponse<Company> | null,
        loading: false,
    }),

    actions: {
        async fetchCompanies(page = 0, size = 10, search = "") {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string> = { page, size }

                const normalizedSearch = normalizeTableSearch(search)
                if (normalizedSearch) {
                    query.search = normalizedSearch
                }

                this.data = await $api<PageResponse<Company>>('/api/companies', { method: 'GET', query })
            } catch (err) {
                console.error('Error al obtener las empresas:', err)
            } finally {
                this.loading = false
            }
        },

        async createCompany(company: CompanyRequest, admin: CompanyAdminRequest) {
            const { $api } = useNuxtApp()
            return await $api<Company>('/api/companies', { method: 'POST', body: { company, admin } })
        },

        async updateCompany(id: number, body: CompanyRequest) {
            const { $api } = useNuxtApp()
            return await $api<Company>(`/api/companies/${id}`, { method: 'PUT', body })
        },

        async deleteCompany(id: number) {
            const { $api } = useNuxtApp()
            await $api(`/api/companies/${id}`, { method: 'DELETE' })
        },
    },
})
