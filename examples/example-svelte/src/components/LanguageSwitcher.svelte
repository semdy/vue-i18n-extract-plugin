<script lang="ts">
  import {
    locale,
    changeLanguage,
    languageList,
    type SupportLocale
  } from "@/locales";

  let { options, onChange } = $props<{
    options?: Array<{ label: string; value: string }>;
    onChange?: (value: string) => void;
  }>();

  const normalizedOptions = $derived(
    options?.length ? options : languageList
  );

  function handleChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as SupportLocale;
    changeLanguage(value);
    onChange?.(value);
  }
</script>

<select
  value={$locale}
  onchange={handleChange}
  style="
    position: absolute;
    right: 30px;
    top: 30px;
    padding: 6px;
    font-size: 15px;
  "
>
  {#each normalizedOptions as option (option.value)}
    <option
      class="bg-[#1f1208] text-white"
      value={option.value}
    >
      {option.label}
    </option>
  {/each}
</select>