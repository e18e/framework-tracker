<script lang="ts">
  import { goto } from '$app/navigation'
</script>

<button id="interact-btn" onclick={() => goto('/spa/result')}>
  Run Benchmark
</button>
