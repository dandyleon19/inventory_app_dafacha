<template>
  <v-form
    ref="formRef"
    v-model="isValid"
    class="app-form"
    @submit.prevent="onSubmit"
  >
    <AppFormSection title="Categoría" subtitle="Agrupa los productos del catálogo">
      <v-row dense>
        <v-col cols="12">
          <v-text-field
            v-model="form.name"
            v-bind="field"
            label="Nombre de la categoría"
            :rules="[rules.required, rules.maxLength(100)]"
          />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="form.description"
            v-bind="textarea"
            label="Descripción"
            rows="3"
            :rules="[rules.maxLength(1000)]"
          />
        </v-col>
      </v-row>
    </AppFormSection>

    <AppFormActions>
      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        rounded="lg"
        class="app-form-btn--primary"
      >
        {{ action === "create" ? "Crear categoría" : "Guardar cambios" }}
      </v-btn>
    </AppFormActions>
  </v-form>
</template>

<script setup lang="ts">
import type { ProductCategory, ProductCategoryRequest } from "~/interfaces/productCategoryInterfaces"
import { validationRules as rules } from "~/helpers/validationFormRules"

const props = defineProps<{
  action: "create" | "update"
  category?: ProductCategory | null
}>()

const emit = defineEmits<{
  (e: "submit", payload: ProductCategoryRequest): void
}>()

const { field, textarea } = useFormFields()

const isValid = ref(false)
const formRef = ref<any>(null)

const form = reactive({
  name: props.category?.name ?? "",
  description: props.category?.description ?? "",
})

const onSubmit = async () => {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  emit("submit", {
    name: form.name.trim(),
    description: form.description.trim() || null,
  })
}
</script>
