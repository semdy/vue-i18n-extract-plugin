import { createSignal } from "solid-js";
import { useI18n } from "@/locales";
function Counter() {
  const [count, setCount] = createSignal(0);
  const { t } = useI18n();

  return (
    <button onClick={() => setCount(count => count + 1)}>
      {t("计数器{count}", { count: count() })}
    </button>
  );
}

export default Counter;
