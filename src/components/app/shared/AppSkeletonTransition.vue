<template>
  <Transition name="skeleton-fade" mode="out-in" appear>
    <slot />
  </Transition>
</template>

<style scoped>
.skeleton-fade-enter-active,
.skeleton-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.skeleton-fade-enter-from,
.skeleton-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
