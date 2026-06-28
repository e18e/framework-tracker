<script lang="ts">
  let { data } = $props()
</script>

<svelte:head>
  <title>SvelteKit SSR Benchmark</title>
</svelte:head>

<table>
  <tbody>
    {#each data.entries as entry}
      <tr>
        <td>{entry.id}</td>
        <td>{entry.name}</td>
        <td><a href={`/server-side-rendered/${entry.id}`}>View →</a></td>
      </tr>
    {/each}
  </tbody>
</table>
