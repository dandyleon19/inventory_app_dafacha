import { defineStore } from 'pinia'
import type { User, UserRequest, UserRole } from "~/interfaces/userInterfaces"
import type { PageResponse } from "~/interfaces/PageResponse"
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers"

const MAX_PAGE_SIZE = 100

export interface UserListParams {
    page?: number
    size?: number
    search?: string
    role?: UserRole
    isActive?: boolean
}

export const useUsersStore = defineStore('users', {
    state: () => ({
        data: null as PageResponse<User> | null,
        /** Everyone in the company (up to one page of 100), for filters such as "who did it" in the audit log. */
        options: [] as User[],
        loading: false,
    }),

    actions: {
        async fetchUsers(params: UserListParams = {}) {
            this.loading = true
            try {
                const { $api } = useNuxtApp()
                const query: Record<string, number | string | boolean> = {
                    page: params.page ?? 0,
                    size: params.size ?? 10,
                }

                const search = normalizeTableSearch(params.search ?? "")
                if (search) query.search = search
                if (params.role) query.role = params.role
                if (params.isActive !== undefined) query.isActive = params.isActive

                this.data = await $api<PageResponse<User>>('/api/users', { method: 'GET', query })
            } catch (err) {
                console.error('Error al obtener usuarios:', err)
            } finally {
                this.loading = false
            }
        },

        async fetchOptions() {
            try {
                const { $api } = useNuxtApp()
                const res = await $api<PageResponse<User>>('/api/users', {
                    method: 'GET',
                    query: { page: 0, size: MAX_PAGE_SIZE },
                })
                this.options = res.content ?? []
            } catch (err) {
                console.error('Error al obtener las opciones de usuario:', err)
                this.options = []
            }
        },

        async createUser(body: UserRequest) {
            const { $api } = useNuxtApp()
            return await $api<User>('/api/users', { method: 'POST', body })
        },

        async updateUser(id: number, body: UserRequest) {
            const { $api } = useNuxtApp()
            return await $api<User>(`/api/users/${id}`, { method: 'PUT', body })
        },

        /** Sets a new password and ends all the user's open sessions. */
        async resetPassword(id: number, password: string) {
            const { $api } = useNuxtApp()
            await $api(`/api/users/${id}/password`, { method: 'PUT', body: { password } })
        },
    },
})
