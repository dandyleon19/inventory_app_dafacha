<template>
  <v-dialog
    v-model="model"
    max-width="400"
    transition="dialog-transition"
  >
    <v-card class="confirm-modal" rounded="xl" elevation="0">
      <v-card-text class="confirm-modal__body text-center pa-6 pa-sm-7">
        <div class="confirm-modal__icon-wrap mb-4">
          <v-avatar size="52" :color="color" variant="tonal">
            <v-icon size="26">{{ icon }}</v-icon>
          </v-avatar>
        </div>

        <h2 class="confirm-modal__title text-h6 font-weight-bold mb-2 app-font-heading">
          {{ title }}
        </h2>

        <p class="confirm-modal__message text-body-2 text-medium-emphasis mb-0">
          {{ message }}
        </p>

        <v-text-field
          v-if="requireText"
          v-model="confirmationText"
          class="confirm-modal__input mt-5"
          label="Escribe ELIMINAR para confirmar"
          placeholder="ELIMINAR"
          variant="outlined"
          density="compact"
          rounded="lg"
          hide-details
          autofocus
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="confirm-modal__actions pa-4 pa-sm-5">
        <v-btn
          class="confirm-modal__btn confirm-modal__btn--cancel flex-grow-1"
          variant="tonal"
          color="primary"
          rounded="lg"
          size="large"
          @click="handleCancelDialog"
        >
          Cancelar
        </v-btn>

        <v-btn
          class="confirm-modal__btn confirm-modal__btn--confirm flex-grow-1"
          variant="flat"
          :color="color"
          rounded="lg"
          size="large"
          :disabled="confirmDisabled"
          @click="handleConfirmDialog"
        >
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

// Defaults give the original "delete" look; other confirmations (e.g. reset settings) override them.
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    message?: string;
    requireText?: boolean;
    confirmLabel?: string;
    icon?: string;
    color?: string;
  }>(),
  {
    confirmLabel: "Eliminar",
    icon: "tabler:trash",
    color: "error",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
}>();

const confirmationText = ref<string>("");

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const confirmDisabled = computed(() => {
  if (!props.requireText) return false;
  return confirmationText.value !== "ELIMINAR";
});

const handleCancelDialog = () => {
  model.value = false;
};

const handleConfirmDialog = () => {
  emit("confirm");
  model.value = false;
};

watch(model, (val) => {
  if (!val) confirmationText.value = "";
});
</script>

<style scoped>
.confirm-modal {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
}

.confirm-modal__body {
  padding-top: 2rem !important;
}

.confirm-modal__icon-wrap {
  display: flex;
  justify-content: center;
}

.confirm-modal__title {
  line-height: 1.35;
  letter-spacing: normal;
}

.confirm-modal__message {
  line-height: 1.55;
  max-width: 300px;
  margin-inline: auto;
}

.confirm-modal__input :deep(.v-field) {
  text-align: left;
}

.confirm-modal__actions {
  gap: 10px;
}

.confirm-modal__btn {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 600;
}

.confirm-modal__btn--cancel {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.confirm-modal__btn--confirm {
  color: #fff !important;
}
</style>
