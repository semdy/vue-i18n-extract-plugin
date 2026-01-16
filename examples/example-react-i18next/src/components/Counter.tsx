import { useState } from "react";
import { t } from "@/locales";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count => count + 1)}>
      {t("计数器{count}", { count })}
    </button>
  );
}

export default Counter;
