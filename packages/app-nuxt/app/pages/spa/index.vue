<script setup lang="ts">
definePageMeta({ ssr: false })
</script>

<template>
  <button id="interact-btn" @click="navigateTo('/spa/result')">
    Run Benchmark
  </button>
</template>
