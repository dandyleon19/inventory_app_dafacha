import { useAuthStore } from "~/store/modules/auth"

/**
 * Per-page guard: `definePageMeta({ middleware: "role", allowedRoles: ["ADMIN_USER"] })`.
 * A signed-in user whose role isn't allowed gets the "No autorizado" page (see error.vue), instead of being
 * silently sent somewhere else. (Not being signed in at all is handled by the global auth middleware.)
 */
export default defineNuxtRouteMiddleware((to) => {
    const allowedRoles = to.meta.allowedRoles as string[] | undefined
    if (!allowedRoles || allowedRoles.length === 0) return

    const authStore = useAuthStore()
    const role = authStore.role

    if (!role || !allowedRoles.includes(role)) {
        throw createError({ statusCode: 403, statusMessage: "No autorizado", fatal: true })
    }
})
