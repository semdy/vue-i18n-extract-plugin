import { Trans } from "@/locales";
import { component$ } from "@builder.io/qwik";

const TransTest = component$(() => {
  return <Trans component="h2" msg="欢迎使用Solid"></Trans>;
});

export default TransTest;
