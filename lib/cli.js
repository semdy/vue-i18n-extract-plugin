#!/usr/bin/env node

import { createRequire } from "node:module";
import mri from "mri";
import { extractI18n } from "./extract.js";
import { autoTranslateFromFile, cleanTranslate } from "./translate.js";
import { loadConfig } from "./loadConfig.js";
import { defaultOptions } from "./options.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const helpMessage = `\
Usage: extract-i18n [OPTION]...

Parse and compile and extract i18n strings in your project.

Options:
  -h, --help                 display this help message
  -v, --version              display the current version
  -t, --translate            translate i18n strings
  -c, --clean                clean unused key-value in translated files
  --debug                    enable debug mode to display log information

  Other options please refer to https://github.com/semdy/extract-i18n-plugin/blob/main/lib/options.js
`;

const cli = async function (args) {
  const argv = mri(args, {
    boolean: ["help", "version", "translate", "clean", "debug"],
    alias: {
      h: "help",
      V: "version",
      v: "version",
      t: "translate",
      c: "clean"
    }
  });

  if (argv.help) {
    console.log(helpMessage);
    return;
  }

  if (argv.version) {
    console.log("current version:", version);
    return;
  }

  if (argv.translate) {
    await autoTranslateFromFile();
    return;
  }

  if (argv.clean) {
    await cleanTranslate();
    return;
  }

  const configFromFile = await loadConfig();
  const resolvedOptions = { ...defaultOptions, ...configFromFile, ...argv };

  if (resolvedOptions.debug) {
    console.log("🔄 extract-i18n starting extract...\n", resolvedOptions, "\n");
  }

  extractI18n(resolvedOptions).catch(err => {
    console.error("❌ Extract Failed:", err, "\n");
  });
};

cli(process.argv.slice(2));
