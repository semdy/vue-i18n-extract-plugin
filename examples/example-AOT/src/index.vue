<template>
  <div label="测试1" label2="test">测试2</div>
  <div :label="$t('插值，{name}', { name: test })">{{ $t("插件") }}</div>
  <div>{{ $t("插件，{name}", { name: "xxxx测试" }) }}</div>
  <div>{{ c ? "成功" : "失败" }}</div>
  <div>{{ c ? $t("成功1") : $t("失败1") }}</div>
  <div :label="c ? $t('表达式1') : $t('表达式2, {name}', { name: '111测试' })">
    表达式text
  </div>
  <div>{{ "插值表达式" }}</div>
  <div>{{ `插值表达式1` }}</div>
  <div>{{ `插值表达${$t("插值表达内容")}式2` }}</div>
  <el-form-item>
    <template>
      <el-button @click="greet" label="按钮label">{{ $t("按钮") }}</el-button>
      <el-button @click="greet">按钮2</el-button>
      <el-button @click="greet">{{ `按钮3` }}</el-button>
    </template>
  </el-form-item>
</template>

<script>
export default {
  name: "Test",
  data() {
    return {
      c: true,
      test: "test测试",
      message: "信息来自Test组件",
    };
  },
  methods: {
    greet() {
      console.log("Hello from Test!");
    },
  },
};
</script>
<style lang="scss" scoped></style>
