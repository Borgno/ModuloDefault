import { NotificationBell } from "./NotificationBell";

type PageHeaderProps = {
  title: string;
  description?: string;
  // Botões da tela (criar, exportar), alinhados à direita, antes do sininho.
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 font-inter text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {/* O sininho fica em todas as telas, depois dos botões da tela. */}
      <div className="flex items-center gap-2">
        {actions}
        <NotificationBell />
      </div>
    </header>
  );
}
