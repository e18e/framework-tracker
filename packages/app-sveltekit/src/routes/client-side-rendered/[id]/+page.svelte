<script lang="ts">
  import { page } from '$app/state'

  const id = $derived(page.params.id)
</script>

<p id="detail-id">{id}</p>
