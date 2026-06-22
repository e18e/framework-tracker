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
          <a href="/server-side-rendered/{entry.id}">View →</a>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
