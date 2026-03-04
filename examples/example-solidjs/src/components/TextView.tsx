// import { t } from "@/locales"; 插件会自动导入

function TextView() {
  // 无需显示调用 useI18n 获取 t 函数，插件会自动注入
  // const { t } = useI18n();
  return <div>{t("纯文本测试")}</div>;
}

export default TextView;
