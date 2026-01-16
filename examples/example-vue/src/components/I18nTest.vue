<script setup>
import { ref } from "vue";
import { $t } from "@/locales";

defineProps({
  msg: String
});

const count = ref(0);
</script>

<template>
  <div>
    <button type="button" @click="count++">
      {{ $t("计数{count}", { count }) }}
    </button>
    <p>计数测试</p>
  </div>
</template>
