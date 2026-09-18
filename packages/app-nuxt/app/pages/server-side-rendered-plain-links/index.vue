<script setup lang="ts">
import { testData } from '../../../../testdata/src/ssr'

const { data } = await useAsyncData(() => testData(), { deep: false })
</script>

<template>
  <table>
    <tbody>
      <tr v-for="entry in data" :key="entry.id">
        <td>{{ entry.id }}</td>
        <td>{{ entry.name }}</td>
        <td>
          <a :href="`/server-side-rendered/${entry.id}`">View →</a>
        </td>
      </tr>
    </tbody>
  </table>
</template>
