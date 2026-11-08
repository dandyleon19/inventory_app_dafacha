import { defineStore } from 'pinia'
import type {
    FeatureKey,
    PlanInfo,
    SubscriptionEvent,
    SubscriptionInfo,
} from '~/interfaces/subscriptionInterfaces'

/** How long the subscription of the signed-in company is trusted before it is read again (ms). */
const REFRESH_AFTER_MS = 5 * 60 * 1000

export const useSubscriptionStore = defineStore('subscription', {
    state: () => ({
        /** Subscription of the signed-in user's company. */
        current: null as SubscriptionInfo | null,
        loaded: false,
        loading: false,
        fetchedAt: 0,

        // SUPER_ADMIN management
        all: [] as SubscriptionInfo[],
        allLoading: false,
        plans: [] as PlanInfo[],
        events: [] as SubscriptionEvent[],
        eventsLoading: false,
    }),

    getters: {
        isBlocked: (state) => state.current?.blocked === true,
        status: (state) => state.current?.status ?? null,
        daysRemaining: (state) => state.current?.daysRemaining ?? null,
        planName: (state) => state.current?.planName ?? null,
        isStale: (state) => !state.loaded || Date.now() - state.fetchedAt > REFRESH_AFTER_MS,

        /**
         * Before the subscription is known everything is shown (the backend enforces the plan anyway), so the menu
         * does not flicker while it loads.
         */
        hasFeature: (state) => (feature: FeatureKey): boolean => {
            if (!state.loaded || !state.current) return true
            return state.current.features.includes(feature)
        },
    },

    actions: {
        async fetchMine(force: boolean = false) {
            if (this.loading) return
            if (!force && !this.isStale) return

            this.loading = true
            try {
                const { $api } = useNuxtApp()
                this.current = await $api<SubscriptionInfo>('/api/subscription/me', { method: 'GET' })
                this.loaded = true
                this.fetchedAt = Date.now()
            } catch (err) {
                console.error('Error al obtener la suscripción:', err)
            } finally {
                this.loading = false
            }
        },

        /** The API said 402: block locally even if reading the subscription fails. */
        async markBlocked() {
            await this.fetchMine(true)
            if (!this.current?.blocked) {
                this.current = {
                    ...(this.current ?? ({
                        companyId: null,
                        planCode: null,
                        planName: null,
                        daysRemaining: 0,
                        maxWarehouses: null,
                        maxUsers: null,
                        features: [],
                    } as unknown as SubscriptionInfo)),
                    status: this.current?.status ?? 'EXPIRED',
                    blocked: true,
                }
                this.loaded = true
                this.fetchedAt = Date.now()
            }
        },

        reset() {
            this.current = null
            this.loaded = false
            this.fetchedAt = 0
            this.all = []
            this.events = []
        },

        // ---------------------------------------------------------------- SUPER_ADMIN

        async fetchAll() {
            this.allLoading = true
            try {
                const { $api } = useNuxtApp()
                this.all = await $api<SubscriptionInfo[]>('/api/subscriptions', { method: 'GET' })
            } catch (err) {
                console.error('Error al obtener las suscripciones:', err)
            } finally {
                this.allLoading = false
            }
        },

        async fetchPlans() {
            if (this.plans.length) return
            try {
                const { $api } = useNuxtApp()
                this.plans = await $api<PlanInfo[]>('/api/plans', { method: 'GET' })
            } catch (err) {
                console.error('Error al obtener los planes:', err)
            }
        },

        async fetchEvents(companyId: number) {
            this.eventsLoading = true
            try {
                const { $api } = useNuxtApp()
                this.events = await $api<SubscriptionEvent[]>(`/api/subscriptions/${companyId}/events`, { method: 'GET' })
            } catch (err) {
                console.error('Error al obtener el historial:', err)
                this.events = []
            } finally {
                this.eventsLoading = false
            }
        },

        /**
         * Sets the plan and the day it is paid until (yyyy-MM-dd). `paidUntil` null = the plan never expires (a company
         * that does not pay). It sets the date, it does not add to it: sending the same thing twice changes nothing.
         */
        async activate(companyId: number, planCode: string, paidUntil: string | null) {
            const { $api } = useNuxtApp()
            return await $api<SubscriptionInfo>(`/api/subscriptions/${companyId}/activate`, {
                method: 'POST',
                body: paidUntil === null ? { planCode, noExpiry: true } : { planCode, paidUntil },
            })
        },

        async setTrialDays(companyId: number, days: number) {
            const { $api } = useNuxtApp()
            return await $api<SubscriptionInfo>(`/api/subscriptions/${companyId}/trial-days`, {
                method: 'POST',
                body: { days },
            })
        },

        async suspend(companyId: number, reason: string | null) {
            const { $api } = useNuxtApp()
            return await $api<SubscriptionInfo>(`/api/subscriptions/${companyId}/suspend`, {
                method: 'POST',
                body: { reason },
            })
        },

        /** Lifts a suspension: the company goes back to the state it had before. */
        async resume(companyId: number) {
            const { $api } = useNuxtApp()
            return await $api<SubscriptionInfo>(`/api/subscriptions/${companyId}/resume`, { method: 'POST' })
        },
    },
})
