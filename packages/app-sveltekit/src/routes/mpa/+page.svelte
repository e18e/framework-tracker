<script lang="ts">
  let { data } = $props()
</script>

<table>
  <tbody>
    {#each data.entries as entry (entry.id)}
      <tr>
        <td>{entry.id}</td>
        <td>{entry.name}</td>
        <td>
          <a href="/mpa/{entry.id}" data-sveltekit-reload>View →</a>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
