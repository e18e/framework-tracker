<script setup lang="ts">
definePageMeta({ ssr: false })

const route = useRoute()
const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
</script>

<template>
  <p id="detail-id">{{ id }}</p>
</template>
