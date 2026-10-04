import { defineStore } from 'pinia'
import type { Company, CompanyRequest, CompanySettings } from "~/interfaces/companyInterfaces"
import { DEFAULT_COMPANY_SETTINGS } from "~/interfaces/companyInterfaces"
import { useAuthStore } from "~/store/modules/auth"

export const useCompanyStore = defineStore('company', {
    state: () => ({
        company: null as Company | null,
        /** Falls back to the defaults (nothing mandatory) until the real ones are loaded. */
        settings: { ...DEFAULT_COMPANY_SETTINGS } as CompanySettings,
        loading: false,
    }),

    actions: {
        async fetchCompany() {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                this.company = await $api<Company>('/api/company', { method: 'GET' })
            } catch (err) {
                console.error('Error al obtener la empresa:', err)
            } finally {
                this.loading = false
            }
        },

        async updateCompany(body: CompanyRequest) {
            const { $api } = useNuxtApp()
            const company = await $api<Company>('/api/company', { method: 'PUT', body })
            this.company = company

            // The company name is shown in the navbar, which reads it from the logged-in user.
            const authStore = useAuthStore()
            if (authStore.user) {
                authStore.user = { ...authStore.user, companyName: company.name }
            }
            return company
        },

        async fetchSettings() {
            try {
                const { $api } = useNuxtApp()
                this.settings = await $api<CompanySettings>('/api/company/settings', { method: 'GET' })
            } catch (err) {
                console.error('Error al obtener la configuración:', err)
            }
        },

        async updateSettings(body: CompanySettings) {
            const { $api } = useNuxtApp()
            this.settings = await $api<CompanySettings>('/api/company/settings', { method: 'PUT', body })
            return this.settings
        },
    },
})
