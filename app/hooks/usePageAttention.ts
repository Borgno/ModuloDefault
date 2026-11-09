import { useEffect, useState } from "react";

// O usuário está olhando o app: janela em foco e aba visível.
const attentive = () =>
  typeof document !== "undefined" && document.hasFocus() && document.visibilityState === "visible";

export function usePageAttention() {
  const [value, setValue] = useState(attentive);
  useEffect(() => {
    const update = () => setValue(attentive());
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return value;
}
