import { defineStore } from 'pinia'
import type { User } from "~/interfaces/userInterfaces"

const resolveAuthRole = (state: {
    role: string | null
    user: User | null
}) => state.role ?? state.user?.role ?? null

const isAdminRole = (role: string | null) => role === 'ADMIN_USER' || role === 'SUPER_ADMIN'

/**
 * What the UI offers for each role. It mirrors the API's permission matrix (SecurityConfig in the backend), which
 * is what really enforces it: hiding a button here is only about not showing things that would be refused.
 *
 *                               admin  warehouse  purchasing  viewer
 *   canManage                     x
 *   canManagePurchases            x                    x
 *   canOperateStock               x        x
 *   canReceiveGoods               x        x           x
 */
export const useAuthStore = defineStore('auth', {
    state: () => ({
        role: null as string | null,
        token: null as string | null,
        user: null as User | null
    }),

    getters: {
        effectiveRole: (state) => resolveAuthRole(state),
        isSuperAdmin: (state) => resolveAuthRole(state) === 'SUPER_ADMIN',
        isAdmin: (state) => resolveAuthRole(state) === 'ADMIN_USER',
        isViewer: (state) => resolveAuthRole(state) === 'VIEWER',
        /** Admins: users, settings, catalog, warehouses and stock adjustments. */
        canManage: (state) => isAdminRole(resolveAuthRole(state)),
        /** Suppliers and purchase orders (create, edit, order, cancel). */
        canManagePurchases: (state) => {
            const role = resolveAuthRole(state)
            return isAdminRole(role) || role === 'PURCHASING_USER'
        },
        /** Entries, exits and transfers. */
        canOperateStock: (state) => {
            const role = resolveAuthRole(state)
            return isAdminRole(role) || role === 'WAREHOUSE_USER'
        },
        /** Receiving the goods of a purchase order. */
        canReceiveGoods: (state) => {
            const role = resolveAuthRole(state)
            return isAdminRole(role) || role === 'WAREHOUSE_USER' || role === 'PURCHASING_USER'
        },
        /** Limited to some warehouses (the API only returns those). */
        isLimitedToWarehouses: (state) => (state.user?.warehouseIds?.length ?? 0) > 0,
    },

    actions: {
        setAuth(data: { token: string; role?: string | null; user?: User | null }) {
            this.token = data.token

            if (!data.user) {
                this.user = null
                this.role = data.role ?? null
                return
            }

            const user = data.user
            this.user = {
                ...user,
                fullName:
                    user.fullName ||
                    [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
            }
            // The user's own role (from /api/auth/me, read from the database) wins over the one in the token,
            // which can be a day old if an admin has changed the role since.
            this.role = user.role ?? data.role ?? null
        },

        logout() {
            this.role = null
            this.token = null
            this.user = null
        }
    }
})
