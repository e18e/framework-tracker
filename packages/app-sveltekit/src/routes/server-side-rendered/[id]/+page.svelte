<script lang="ts">
  import type { PageProps } from './$types'

  let { params }: PageProps = $props()
</script>

<p id="detail-id">{params.id}</p>
