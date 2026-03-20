const { processFile: processVueFile } = require("./vue");
const { processFile: processSvelteFile } = require("./svelte");
const { processFile: processAngularFile } = require("./angular");
const { processFile: processMarkoFile } = require("./marko");

module.exports = {
  processVueFile,
  processSvelteFile,
  processAngularFile,
  processMarkoFile
};
