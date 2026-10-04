<template>
  <v-navigation-drawer
    v-model="model"
    :location="location"
    :temporary="temporary"
    :width="resolvedWidth"
    :scrim="true"
    class="app-form-drawer pa-4 pa-sm-5"
    disable-resize-watcher
  >
    <v-overlay
      v-if="loading"
      contained
      :model-value="loading"
      class="align-center justify-center"
      persistent
      scrim="white"
      opacity="0.72"
    >
      <v-progress-circular indeterminate size="40" width="3" color="primary" />
    </v-overlay>

    <div class="app-form-drawer__header d-flex justify-space-between align-center mb-4">
      <h2 class="text-h6 text-sm-h5 font-weight-bold app-form-drawer__title">
        {{ title }}
      </h2>
      <v-btn
        icon="tabler:x"
        variant="text"
        aria-label="Cerrar panel"
        @click="close"
      />
    </div>

    <div v-if="model" class="app-form-drawer__content">
      <AppSkeletonTransition>
        <AppFormSkeleton
          v-if="contentLoading"
          key="drawer-content-skeleton"
          :sections="skeletonSections"
          :fields-per-section="skeletonFields"
          :show-button="skeletonShowButton"
        />
        <slot v-else key="drawer-content-slot" />
      </AppSkeletonTransition>
    </div>

    <div v-if="$slots.footer" class="app-form-drawer__footer mt-4 pt-2">
      <slot name="footer" />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useDisplay } from "vuetify"

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    size?: "small" | "medium" | "large" | "xlarge" | "full"
    location?: "start" | "end" | "left" | "right"
    temporary?: boolean
    loading?: boolean
    contentLoading?: boolean
    skeletonSections?: number
    skeletonFields?: number
    skeletonShowButton?: boolean
  }>(),
  {
    title: "",
    size: "medium",
    location: "end",
    temporary: true,
    skeletonSections: 2,
    skeletonFields: 4,
    skeletonShowButton: true,
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
  (e: "close"): void
}>()

const display = useDisplay()

// While this panel is open the phone's bottom bar hides, so it never covers the panel's own buttons.
const { opened, closed } = useOverlayState()
watch(
  () => props.modelValue,
  (open, wasOpen) => {
    if (open && !wasOpen) opened()
    else if (!open && wasOpen) closed()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  if (props.modelValue) closed()
})

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
})

const resolvedWidth = computed(() => {
  const viewport = display.width.value || 360

  if (display.xs.value) {
    return viewport
  }

  if (display.smAndDown.value) {
    // "full" holds wide tables, so on small screens it takes the whole viewport instead of the 480px cap.
    return props.size === "full" ? viewport : Math.min(viewport, 480)
  }

  switch (props.size) {
    case "small":
      return 320
    case "medium":
      return 480
    case "large":
      return Math.min(720, Math.round(viewport * 0.92))
    case "xlarge":
      return Math.min(960, Math.round(viewport * 0.94))
    case "full":
      return Math.min(1280, Math.round(viewport * 0.96))
    default:
      return 420
  }
})

const close = () => {
  emit("update:modelValue", false)
  emit("close")
}
</script>

<style scoped>
.app-form-drawer__header {
  gap: 12px;
}

.app-form-drawer__title {
  line-height: 1.3;
  padding-right: 8px;
}

.app-form-drawer__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.app-form-drawer__footer {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

:deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
