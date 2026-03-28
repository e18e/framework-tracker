<script setup lang="ts">
definePageMeta({ ssr: false })

type Entry = { id: string; name: string }

const entries: Entry[] = Array.from({ length: 1000 }, () => ({
  id: crypto.randomUUID(),
  name: crypto.randomUUID(),
}))
</script>

<template>
  <table>
    <tbody>
      <tr v-for="entry in entries" :key="entry.id">
        <td>{{ entry.id }}</td>
        <td>{{ entry.name }}</td>
        <td>
          <NuxtLink :to="`/spa/detail?id=${entry.id}`">View →</NuxtLink>
        </td>
      </tr>
    </tbody>
  </table>
</template>
