<template>
  <div ref="root" class="infinite-sentinel" role="status" aria-live="polite">
    <v-progress-circular indeterminate size="16" width="2" color="primary" />
    <span>Cargando más…</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Goes at the end of a list: when the user scrolls down to it, it says `visible` so the list loads its next page.
 * Mount it again after each page (give it a new `key`) and it reports again if it is still on screen, so a short
 * page never leaves the list stuck.
 */
const emit = defineEmits<{ (e: "visible"): void }>()

const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === "undefined" || !root.value) return

  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) emit("visible")
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.infinite-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
</style>
