<script context="module" lang="ts">
  export const prerender = true;
  export const type = "类型定义";
</script>

<script lang="ts">
  let count: number = $state(0)
  const increment = () => {
    count += 1
  }
  const text = "计数器文本"

  $: doubled = count * 2

  $: if (count > 5) {
    const msg = "计数器的值是大于5了";
    console.log(msg)
  }
</script>

<button onclick={increment}>
  {$t("计数器{count}", { count })}
  {$doubled}
</button>
