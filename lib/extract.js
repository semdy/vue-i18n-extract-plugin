import fs from "fs-extra";
import glob from "fast-glob";
import {
  globalI18nMap,
  transformScript,
  rebuildPattern,
  formatFile
} from "./core/index.js";
import {
  processSvelteFile,
  processVueFile,
  processAngularFile,
  processMarkoFile
} from "./parsers/index.js";
import {
  relativeCWDPath,
  getLangJsonPath,
  readJsonWithDefault,
  isVueLike,
  isSvelte,
  isMarko,
  isAngular
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
        console.warn("👉 新的 i18nMap 与源文件没有差异，跳过写入文件...");
        return Promise.resolve({ hasDiff: false, data: i18nMap });
      }
    }
  }

  originalJson = originalJson ?? readJsonWithDefault(outputJSONPath, null);
  if (originalJson) {
    if (options.cleanTranslate) {
      i18nMap = Object.assign(cleanI18nMap(i18nMap, originalJson), i18nMap);
    } else {
      i18nMap = Object.assign(originalJson, i18nMap);
    }
  }

  await fs.outputJson(outputJSONPath, i18nMap, {
    spaces: 2
  });

  return Promise.resolve({ hasDiff: true, data: i18nMap });
}

async function handleFinalI18nMap(i18nMap, options, checkDiffs) {
  const { hasDiff } = await writeI18nMapToFile(i18nMap, options, checkDiffs);

  if (!hasDiff) return;

  if (options.autoTranslate) {
    await autoTranslate(i18nMap, options);
  }

  if (options.cleanTranslate) {
    await cleanTranslate(options);
  }
}

async function extractI18n(options) {
  options = { ...defaultOptions, ...options };

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
  const files = await glob(globPattern, { ignore: options.excludedPath });

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");

    let changed = false;
    let code = "";

    if (!content.trim()) continue;

    try {
      if (isVueLike(file)) {
        const vueContent = processVueFile(content, options);
        changed = vueContent.changed;
        code = vueContent.code;
      } else if (isSvelte(file)) {
        const svelteResult = processSvelteFile(content, options);
        changed = svelteResult.changed;
        code = svelteResult.code;
      } else if (isMarko(file)) {
        const svelteResult = processMarkoFile(content, options);
        changed = svelteResult.changed;
        code = svelteResult.code;
      } else if (isAngular(file)) {
        const angularResult = processAngularFile(content, options, file);
        changed = angularResult.changed;
        code = angularResult.code;
      } else {
        const scriptContent = transformScript(content, options);
        changed = scriptContent.changed;
        code = scriptContent.code;
      }
    } catch (err) {
      console.error(`❌ processing error with file ${file}`, err);
    }

    if (options.rewrite && changed) {
      code = await formatFile(code, file);
      await fs.writeFile(file, code, "utf8");
    }
  }

  await handleFinalI18nMap(globalI18nMap, options);
}

export { extractI18n };
