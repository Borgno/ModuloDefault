import { Users } from "lucide-react";
import { cn } from "~/lib/utils";
import { initials } from "../_lib/unread";

export function Avatar({
  name,
  group,
  className,
}: {
  name: string;
  group?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary",
        className,
      )}
    >
      {group ? <Users size={16} /> : initials(name)}
    </span>
  );
}
