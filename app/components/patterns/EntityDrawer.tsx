import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

type EntityDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

// Painel lateral para ver e editar um registro sem sair da lista. Esc fecha e o foco volta para
// quem abriu (Radix).
export function EntityDrawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: EntityDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-6">
          <SheetTitle className="text-lg font-bold">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 space-y-8 overflow-y-auto p-6">{children}</div>
        {footer && <SheetFooter className="border-t p-4">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

// Seção com título dentro do drawer.
export function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
