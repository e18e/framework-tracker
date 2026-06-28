<script lang="ts">
  type Entry = { id: string; name: string }

  const entries: Entry[] = Array.from({ length: 1000 }, () => ({
    id: crypto.randomUUID(),
    name: crypto.randomUUID(),
  }))
</script>

<table>
  <tbody>
    {#each entries as entry (entry.id)}
      <tr>
        <td>{entry.id}</td>
        <td>{entry.name}</td>
        <td><a href={`/client-side-rendered/${entry.id}`}>View →</a></td>
      </tr>
    {/each}
  </tbody>
</table>
