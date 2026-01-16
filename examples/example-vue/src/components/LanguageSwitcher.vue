<template>
  <select
    :value="locale"
    @change="onChange"
    style="
      position: absolute;
      right: 30px;
      top: 30px;
      padding: 6px;
      font-size: 15px;
    "
  >
    <option
      v-for="option in normalizedOptions"
      :key="option.value"
      class="bg-[#1f1208] text-white"
      :value="option.value"
    >
      {{ option.label }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  locale,
  changeLanguage,
  languageList,
  type SupportLocale
} from "@/locales";

const props = withDefaults(
  defineProps<{
    options?: Array<{ label: string; value: string }>;
  }>(),
  {}
);

const emit = defineEmits<{ (e: "change", value: string): void }>();

const normalizedOptions = computed(() => {
  if (props.options?.length) return props.options;
  return languageList;
});

const onChange = (event: Event) => {
  const locale = (event.target as HTMLSelectElement).value as SupportLocale;
  changeLanguage(locale);
  emit("change", locale);
};
</script>
