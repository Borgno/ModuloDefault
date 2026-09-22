import type { LucideIcon } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  // warning destaca um número que pede atenção (pendências).
  tone?: "default" | "warning";
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && (
          <Icon size={16} className={cn("text-dim", tone === "warning" && "text-warning")} />
        )}
      </div>
      <p className={cn("mt-2 font-mono text-3xl font-bold", tone === "warning" && "text-warning")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] font-bold text-dim">{hint}</p>}
    </div>
  );
}

export function StatCardSkeleton() {
  return <Skeleton className="h-[118px] rounded-2xl" />;
}
