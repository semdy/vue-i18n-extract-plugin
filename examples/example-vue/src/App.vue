<script setup>
import I18nTest from "@/components/I18nTest.vue";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import TextView from "./components/TextView.vue";
</script>

<template>
  <div>
    <LanguageSwitcher />
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <I18nTest />
  <p>------------------------------</p>
  <TextView />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
