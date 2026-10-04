<template>
  <div class="login-form position-relative">
    <v-overlay
      :model-value="isSubmitting"
      contained
      persistent
      class="align-center justify-center login-form__overlay"
      scrim="rgba(255, 255, 255, 0.88)"
    >
      <div class="d-flex flex-column align-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="48"
          width="3"
        />
        <span class="text-body-2 mt-3 font-weight-medium text-medium-emphasis">
          Iniciando sesión...
        </span>
      </div>
    </v-overlay>

    <v-form v-model="valid" class="login-form__form" @submit.prevent="handleLogin">
      <v-text-field
        v-model="credentials.email"
        v-bind="field"
        :rules="emailRules"
        label="Correo electrónico"
        placeholder="tu@correo.com"
        autocomplete="email"
        :prepend-inner-icon="APP_ICONS.email"
        :disabled="isSubmitting"
      />

      <v-text-field
        v-model="credentials.password"
        v-bind="field"
        :rules="passwordRules"
        label="Contraseña"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="current-password"
        :prepend-inner-icon="APP_ICONS.lock"
        :append-inner-icon="showPassword ? APP_ICONS.eyeOff : APP_ICONS.view"
        :disabled="isSubmitting"
        @click:append-inner="showPassword = !showPassword"
      />

      <v-btn
        type="submit"
        size="large"
        block
        rounded="lg"
        color="primary"
        variant="flat"
        class="login-form__submit"
        :loading="isSubmitting"
        :disabled="!valid || isSubmitting"
      >
        Ingresar
      </v-btn>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { APP_ICONS } from "~/constants/appIcons"
import { getApiErrorMessage, getApiErrorTitle } from "~/helpers/apiErrorHelpers"

const { login: authLogin } = useAuth()
const { success, error: showError } = useNotification()
const { field } = useFormFields()

const credentials = reactive({
  email: "",
  password: "",
})

const valid = ref(false)
const isSubmitting = ref(false)
const showPassword = ref(false)

const emailRules = ref([
  (value: string) => {
    if (value?.trim()) return true
    return "El correo es obligatorio."
  },
  (value: string) => {
    if (/.+@.+\..+/.test(value)) return true
    return "Ingresa un correo válido."
  },
])

const passwordRules = ref([
  (value: string) => {
    if (value) return true
    return "La contraseña es obligatoria."
  },
])

const handleLogin = async () => {
  if (!valid.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    const response = await authLogin(credentials.email, credentials.password)

    const userName =
      response.user?.fullName ||
      [response.user?.firstName, response.user?.lastName].filter(Boolean).join(" ")

    success(
      userName ? `Bienvenido, ${userName}` : "Has iniciado sesión correctamente",
      "Inicio de sesión exitoso"
    )

    await new Promise((resolve) => setTimeout(resolve, 800))
    await navigateTo("/app")
  } catch (e) {
    showError(
      getApiErrorMessage(
        e,
        "No se pudo iniciar sesión. Verifica tus credenciales e inténtalo de nuevo."
      ),
      getApiErrorTitle(e)
    )
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.login-form {
  min-height: 200px;
}

.login-form__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-form__form :deep(.v-field) {
  background: rgb(var(--v-theme-surface));
}

.login-form__form :deep(.v-field--variant-outlined .v-field__outline) {
  --v-field-border-opacity: 0.2;
}

.login-form__form :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 0.5;
}

.login-form__submit {
  color: #fff !important;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 600;
  min-height: 48px;
  margin-top: 0.75rem !important;
  box-shadow: 0 10px 24px rgba(31, 111, 120, 0.24);
}

.login-form__overlay {
  border-radius: 20px;
}
</style>
