<script setup lang="ts">
const route = useRoute()
const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id
</script>

<template>
  <p id="detail-id">{{ id }}</p>
</template>
