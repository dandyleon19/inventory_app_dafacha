<script setup lang="ts">
import { resolveAuthSession } from "~/composables/useAuthTokens"

const hasSession = await resolveAuthSession()

await navigateTo(hasSession ? "/app" : "/login", { replace: true })
</script>

<template />
