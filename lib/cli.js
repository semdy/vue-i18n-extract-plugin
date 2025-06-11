#!/usr/bin/env node

const { parseArg } = require("./utils");
const { extractI18n } = require("./extract");

const cli = function (args) {
  const options = {
    ...args.reduce((acc, arg) => {
      const [key, value] = arg.split("=");
      acc[key.replace(/\-\-|\-/, "")] = !value ? true : parseArg(value);
      return acc;
    }, {}),
  };

  const hasVersion = options.version || options.V;

  if (hasVersion) {
    console.log("current version:", require("../package.json").version);
  }

  if (Object.keys(options).length === 1 && hasVersion) {
    return;
  }

  Object.assign(options, { rewrite: false })

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