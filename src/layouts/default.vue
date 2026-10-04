<template>
  <div class="default-layout">
    <v-container class="default-layout__container fill-height">
      <slot />
    </v-container>
  </div>
</template>

<script setup lang="ts">
useHead({
  titleTemplate: "%s - DF Inventory",
})
</script>

<style scoped>
.default-layout {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(180deg, #fff 0%, #f4f8f8 100%);
}

.default-layout__container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 1.5rem;
}
</style>
