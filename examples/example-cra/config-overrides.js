const path = require("path");
const {
  override,
  addWebpackAlias,
  addWebpackPlugin
} = require("customize-cra");
const { WebpackPluginI18n } = require("vue-i18n-extract-plugin");

module.exports = override(
  addWebpackAlias({
    "@": path.resolve(__dirname, "src")
  }),
  addWebpackPlugin(new WebpackPluginI18n())
);
