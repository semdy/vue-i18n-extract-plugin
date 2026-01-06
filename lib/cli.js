#!/usr/bin/env node

const { parseArg } = require("./utils");
const { extractI18n } = require("./extract");
const { autoTranslateFromFile, cleanTranslate } = require("./translate");
const { defaultOptions } = require("./options");
const { version, bin } = require("../package.json");

const cli = async function (args) {
  let options = args.reduce((acc, arg) => {
    const [key, value] = arg.split("=");
    acc[key.replace(/\-\-|\-/, "")] = !value ? true : parseArg(value);
    return acc;
  }, {});

  const hasVersion = options.version || options.V || options.v;

  if (hasVersion) {
    console.log("current version:", version);
  }

  if (Object.keys(options).length === 1) {
    if (hasVersion) {
      return;
    }
    if (options.translate || options.t) {
      await autoTranslateFromFile();
      return;
    }
    if (options.clean || options.c) {
      await cleanTranslate();
      return;
    }
  }

  const { loadConfig } = await import("c12");

  const { config: configFromFile } = await loadConfig({
    name: Object.keys(bin)[0]
  });

  const resolvedOptions = { ...defaultOptions, configFromFile, options };

  if (resolvedOptions.debug) {
    console.log("开始提取国际化内容...\n", resolvedOptions, "\n");
  }

  extractI18n(resolvedOptions)
    .then(() => {
      console.log("国际化提取完成！\n");
    })
    .catch(err => {
      console.error("提取国际化失败:", err, "\n");
    });
};

cli(process.argv.slice(2));
