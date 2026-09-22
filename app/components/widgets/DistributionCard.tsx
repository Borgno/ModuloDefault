import { Skeleton } from "~/components/ui/skeleton";
import { BarList, type BarItem } from "./BarList";

export function WidgetCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-4 truncate text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DistributionCard({
  title,
  items,
  total,
}: {
  title: string;
  items: BarItem[];
  total?: number;
}) {
  return (
    <WidgetCard title={title}>
      <BarList items={items} total={total} />
    </WidgetCard>
  );
}

export function WidgetCardSkeleton() {
  return <Skeleton className="h-64 rounded-2xl" />;
}
