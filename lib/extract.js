import fs from "fs-extra";
import { glob } from "tinyglobby";
import {
  globalI18nMap,
  transformScript,
  rebuildPattern,
  formatFile,
  mergeObjectWithoutEmpty
} from "./core/index.js";
import {
  setI18nUsage,
  saveI18nUsage,
  clearI18nUsage,
  getI18nUsageCount
} from "./cache.js";
import {
  processSvelteFile,
  processVueFile,
  processAngularFile,
  processMarkoFile,
  processEmberFile
} from "./parsers/index.js";
import {
  relativeCWDPath,
  getLangJsonPath,
  readJsonWithDefault,
  isScript,
  isVueLike,
  isSvelte,
  isMarko,
  isAngular,
  isEmber
} from "./utils.js";
import { defaultOptions } from "./options.js";
import { autoTranslate, cleanTranslate, cleanI18nMap } from "./translate.js";

async function writeI18nMapToFile(i18nMap, options, checkDiffs) {
  const outputJSONPath = getLangJsonPath(options.fromLang, options);
  let originalJson;

  if (checkDiffs) {
    // 检查是否有差异
    originalJson = readJsonWithDefault(outputJSONPath, null);
    if (originalJson) {
      const i18nMapKeys = Object.keys(i18nMap);
      let hasDiff = i18nMapKeys.length !== Object.keys(originalJson).length;
      if (!hasDiff) {
        hasDiff = i18nMapKeys.some(key => i18nMap[key] !== originalJson[key]);
      }
      if (!hasDiff) {
        console.warn(
          "👉 The new i18nMap has no differences from the source file, skipping file write..."
        );
        return Promise.resolve({ hasDiff: false, data: i18nMap });
      }
    }
  }

  originalJson = originalJson ?? readJsonWithDefault(outputJSONPath, {});

  if (options.cleanTranslate) {
    i18nMap = mergeObjectWithoutEmpty(
      cleanI18nMap(i18nMap, originalJson),
      i18nMap
    );
  } else {
    i18nMap = mergeObjectWithoutEmpty(originalJson, i18nMap);
  }

  await fs.outputJson(outputJSONPath, i18nMap, {
    spaces: 2
  });

  return Promise.resolve({ hasDiff: true, data: i18nMap });
}

async function handleFinalI18nMap(i18nMap, options, checkDiffs) {
  const { hasDiff, data } = await writeI18nMapToFile(
    i18nMap,
    options,
    checkDiffs
  );

  if (!hasDiff) return;

  if (options.autoTranslate) {
    await autoTranslate(data, options);
  }

  if (options.cleanTranslate) {
    await cleanTranslate(options);
  }
}

async function scanFiles(options) {
  try {
    let includePath = Array.isArray(options.includePath)
      ? options.includePath
      : [options.includePath];

    includePath = includePath.map(p => {
      if (p instanceof RegExp) {
        p = p.source.replace(/\\/g, "").replace(/\/\//, "/");
      }
      return relativeCWDPath(p);
    });

    const extensions = options.allowedExtensions
      .map(s => s.replace(/^\./, ""))
      .join(",");
    const globPattern = includePath.map(p => rebuildPattern(p, extensions));
    const files = await glob(globPattern, {
      absolute: true,
      ignore: options.excludedPath
    });

    return files;
  } catch (err) {
    console.error("❌ error with glob pattern", err);
    return [];
  }
}

async function extractI18n(options) {
  options = { ...defaultOptions, ...options };

  const files = await scanFiles(options);

  clearI18nUsage();

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");

    let changed = false;
    let code = "";

    if (!content.trim()) continue;

    try {
      if (isScript(file)) {
        const scriptContent = transformScript(content, options);
        changed = scriptContent.changed;
        code = scriptContent.code;
      } else if (isVueLike(file)) {
        const vueContent = processVueFile(content, options);
        changed = vueContent.changed;
        code = vueContent.code;
      } else if (isSvelte(file)) {
        const svelteResult = processSvelteFile(content, options);
        changed = svelteResult.changed;
        code = svelteResult.code;
      } else if (isAngular(file)) {
        const angularResult = processAngularFile(content, options, file);
        changed = angularResult.changed;
        code = angularResult.code;
      } else if (isMarko(file)) {
        const markoResult = processMarkoFile(content, options);
        changed = markoResult.changed;
        code = markoResult.code;
      } else if (isEmber(file)) {
        const emberResult = processEmberFile(content, options);
        changed = emberResult.changed;
        code = emberResult.code;
      }
    } catch (err) {
      console.error(`❌ processing error with file ${file}`, err);
    }

    if (!changed) {
      setI18nUsage(file, changed);
    }

    if (options.rewrite && changed) {
      code = await formatFile(code, file);
      await fs.writeFile(file, code, "utf8");
    }
  }

  saveI18nUsage();

  await handleFinalI18nMap(globalI18nMap, options);

  const ignoredCount = getI18nUsageCount();

  console.log(
    "\n🚀 Extract Completed!",
    "Total files:",
    files.length,
    "Extracted files:",
    files.length - ignoredCount,
    "Ignored files:",
    ignoredCount,
    "\n"
  );
}

export { extractI18n };
