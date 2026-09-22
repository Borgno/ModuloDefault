import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

// Campo de senha com botão para mostrar e ocultar o que foi digitado.
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-dim transition-colors duration-200 ease-ui hover:text-foreground focus-visible:text-primary"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
