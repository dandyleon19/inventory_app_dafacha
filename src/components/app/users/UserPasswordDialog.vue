<template>
  <v-dialog v-model="model" max-width="440" transition="dialog-transition" persistent>
    <v-card rounded="xl" elevation="0" class="password-dialog">
      <v-form ref="formRef" @submit.prevent="onSubmit">
        <v-card-text class="pa-6 pa-sm-7">
          <div class="text-center mb-5">
            <v-avatar size="52" color="warning" variant="tonal" class="mb-4">
              <v-icon size="26">{{ APP_ICONS.key }}</v-icon>
            </v-avatar>
            <h2 class="text-h6 font-weight-bold app-font-heading mb-2">Restablecer contraseña</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Elige una contraseña nueva para <strong>{{ userName }}</strong>. Sus sesiones abiertas se cerrarán y
              tendrá que entrar de nuevo.
            </p>
          </div>

          <v-text-field
            v-model="password"
            v-bind="field"
            label="Contraseña nueva"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :append-inner-icon="showPassword ? APP_ICONS.eyeOff : APP_ICONS.view"
            hint="Mínimo 8 caracteres"
            persistent-hint
            autofocus
            :rules="[rules.required, rules.minLength(8), rules.maxLength(255)]"
            @click:append-inner="showPassword = !showPassword"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4 pa-sm-5">
          <v-btn
            class="flex-grow-1"
            variant="tonal"
            color="primary"
            rounded="lg"
            size="large"
            :disabled="loading"
            @click="close"
          >
            Cancelar
          </v-btn>
          <v-btn
            class="flex-grow-1"
            type="submit"
            variant="flat"
            color="warning"
            rounded="lg"
            size="large"
            :loading="loading"
          >
            Restablecer
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { APP_ICONS } from "~/constants/appIcons"
import { validationRules as rules } from "~/helpers/validationFormRules"

const props = defineProps<{
  modelValue: boolean
  userName: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
  (e: "submit", password: string): void
}>()

const { field } = useFormFields()

const formRef = ref<any>(null)
const password = ref("")
const showPassword = ref(false)

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
})

// Every time it opens it starts empty: a password typed earlier must not linger.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      password.value = ""
      showPassword.value = false
      formRef.value?.resetValidation?.()
    }
  }
)

const close = () => {
  model.value = false
}

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return
  emit("submit", password.value)
}
</script>
