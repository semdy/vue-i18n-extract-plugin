#!/usr/bin/env node

const { parseArg } = require("./utils");
const { defaultOptions } = require("./options");
const { extractI18n } = require("./extract");

const cli = function (args) {
  const options = {
    ...defaultOptions,
    rewrite: false,
    ...args.reduce((acc, arg) => {
      const [key, value] = arg.split("=");
      acc[key.replace("--", "")] = !value ? true : parseArg(value);
      return acc;
    }, {}),
  };

  console.log("开始提取国际化内容...\n", options);

  extractI18n(options)
    .then(() => {
      console.log("国际化提取完成！");
    })
    .catch((err) => {
      console.error("提取国际化失败:", err);
    });
};

cli(process.argv.slice(2));