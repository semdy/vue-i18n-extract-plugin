<script lang="ts">
  let count: number = $state(0)
  const increment = () => {
    count += 1
  }
</script>

<button onclick={increment}>
  {$t("计数器{count}", { count })}
</button>
