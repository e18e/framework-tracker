<script lang="ts">
  import { page } from '$app/state'

  const id = page.url.searchParams.get('id')
</script>

<p id="detail-id">{id}</p>
