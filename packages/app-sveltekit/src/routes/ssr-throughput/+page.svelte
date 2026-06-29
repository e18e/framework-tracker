<script lang="ts">
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<table>
  <tbody>
    {#each data.entries as entry}
      <tr>
        <td>{entry.id}</td>
        <td>{entry.name}</td>
      </tr>
    {/each}
  </tbody>
</table>
