<template>
  <div class="login-page">
    <v-card class="login-page__card" rounded="xl" elevation="0">
      <v-card-text class="login-page__body">
        <div class="login-page__brand">
          <div class="login-page__logo-wrap">
            <img :src="logoDfMark" alt="DF Inventory" class="login-page__logo" />
          </div>

          <h1 class="login-page__title">Ingresa a tu cuenta</h1>
          <p class="login-page__subtitle">
            Usa tus credenciales para acceder al sistema
          </p>
        </div>

        <LoginForm />
      </v-card-text>
    </v-card>

    <p class="login-page__footer">
      Control de inventario para tu negocio
    </p>
  </div>
</template>

<script setup lang="ts">
import logoDfMark from "../assets/img/logo-df-mark.png"

useHead({ title: "Iniciar sesión" })
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 420px;
  margin-inline: auto;
}

.login-page__card {
  width: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 48px rgba(31, 111, 120, 0.1);
}

.login-page__body {
  padding: 2.25rem 2rem 2rem !important;
}

.login-page__brand {
  text-align: center;
  margin-bottom: 1.75rem;
}

.login-page__logo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.login-page__logo {
  width: 170px;
  max-width: 60%;
  height: auto;
}

.login-page__title {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.login-page__subtitle {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.login-page__footer {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
</style>
