#!/usr/bin/env node

const { parseArg } = require("./utils");
const { extractI18n } = require("./extract");
const { version, bin } = require("../package.json");

const cli = async function (args) {
  const options = {
    ...args.reduce((acc, arg) => {
      const [key, value] = arg.split("=");
      acc[key.replace(/\-\-|\-/, "")] = !value ? true : parseArg(value);
      return acc;
    }, {}),
  };

  const hasVersion = options.version || options.V;

  if (hasVersion) {
    console.log("current version:", version);
  }

  if (Object.keys(options).length === 1 && hasVersion) {
    return;
  }

  const { loadConfig } = await import('c12');

  const { config: configFromFile } = await loadConfig({
    name: Object.keys(bin)[0],
  });
  
  Object.assign(options, { rewrite: false }, configFromFile)
  
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