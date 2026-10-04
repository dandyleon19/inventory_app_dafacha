<template>
  <v-app>
    <div class="error-page">
      <div class="error-page__card">
        <img :src="logoDfMark" alt="DF Inventory" class="error-page__logo">

        <p class="error-page__code">{{ code }}</p>
        <h1 class="error-page__title">{{ content.title }}</h1>
        <p class="error-page__text">{{ content.text }}</p>

        <div class="error-page__actions">
          <v-btn color="primary" variant="flat" rounded="lg" size="large" class="text-none" @click="goHome">
            {{ authStore.token ? "Ir al inicio" : "Ir a iniciar sesión" }}
          </v-btn>
          <v-btn variant="tonal" rounded="lg" size="large" class="text-none" @click="goBack">
            Volver atrás
          </v-btn>
        </div>
      </div>
    </div>
  </v-app>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app"
import logoDfMark from "~/assets/img/logo-df-mark.png"
import { useAuthStore } from "~/store/modules/auth"

/**
 * The page shown when navigation fails: a route that doesn't exist (404) or one the user's role can't open
 * (403, raised by the `role` middleware). Anything else gets a generic message.
 */
const props = defineProps<{
  error: NuxtError
}>()

const authStore = useAuthStore()

const code = computed(() => props.error?.statusCode ?? 500)

const content = computed(() => {
  switch (code.value) {
    case 404:
      return {
        title: "Página no encontrada",
        text: "La página que buscas no existe o fue movida. Revisa la dirección o vuelve al inicio.",
      }
    case 401:
    case 403:
      return {
        title: "No autorizado",
        text: "No tienes permiso para ver esta página. Si crees que deberías tenerlo, pide a un administrador que revise tu rol.",
      }
    default:
      return {
        title: "Algo salió mal",
        text: "Ocurrió un error inesperado. Vuelve al inicio e inténtalo de nuevo.",
      }
  }
})

useHead({ title: content.value.title })

const goHome = () => clearError({ redirect: authStore.token ? "/app" : "/login" })

const goBack = () => {
  // Clear the error first, otherwise the error page stays on top of whatever we go back to.
  clearError()
  if (window.history.length > 1) window.history.back()
  else navigateTo(authStore.token ? "/app" : "/login")
}
</script>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 1.5rem;
  background: linear-gradient(180deg, #fff 0%, #f4f8f8 100%);
}

.error-page__card {
  width: 100%;
  max-width: 460px;
  padding: 2.5rem 2rem;
  text-align: center;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 24px;
}

.error-page__logo {
  width: 150px;
  max-width: 55%;
  height: auto;
  margin-bottom: 1.5rem;
}

.error-page__code {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1;
  color: rgb(var(--v-theme-primary));
}

.error-page__title {
  margin: 0.75rem 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.error-page__text {
  margin: 0 0 1.75rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.error-page__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}
</style>
