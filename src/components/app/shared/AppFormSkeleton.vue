<template>
  <div class="app-form-skeleton" :aria-busy="true">
    <div
      v-for="section in sections"
      :key="`section-${section}`"
      class="app-form-skeleton__section"
    >
      <v-skeleton-loader type="heading" width="38%" class="mb-1" />
      <v-skeleton-loader type="text" width="58%" class="mb-4" />

      <v-row dense>
        <v-col
          v-for="field in fieldsPerSection"
          :key="`section-${section}-field-${field}`"
          cols="12"
          :md="field % 2 === 0 ? 6 : 6"
        >
          <v-skeleton-loader type="image" height="56" />
        </v-col>
      </v-row>
    </div>

    <v-skeleton-loader v-if="showButton" type="button" width="140" class="mt-2" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    sections?: number
    fieldsPerSection?: number
    showButton?: boolean
  }>(),
  {
    sections: 2,
    fieldsPerSection: 4,
    showButton: true,
  }
)
</script>

<style scoped>
.app-form-skeleton__section:not(:last-child) {
  margin-bottom: 1.5rem;
}

.app-form-skeleton :deep(.v-skeleton-loader__bone) {
  border-radius: 0.75rem;
}
</style>
