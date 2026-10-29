import { BellRing } from "lucide-react";
import { useId } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { requestPermission, updatePreferences, useNotifierState } from "~/lib/notifier/preferences";
import type { NotificationKind } from "~/types/notification";

const KINDS: { kind: NotificationKind; title: string; description: string }[] = [
  { kind: "messages", title: "Mensagens", description: "Conversas de duas pessoas" },
  { kind: "groups", title: "Grupos", description: "Conversas em grupo" },
  { kind: "notices", title: "Avisos", description: "Avisos do sistema, na tela Notificações" },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {description && (
          <p className="mt-0.5 font-inter text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// Configurações de notificação (menu do perfil). Cada mudança vale na hora e fica neste navegador.
export function NotificationSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { prefs, permission } = useNotifierState();
  const setKind = (kind: NotificationKind, field: "show" | "sound", value: boolean) =>
    updatePreferences({ ...prefs, [kind]: { ...prefs[kind], [field]: value } });

  const permissionHint =
    permission === "unsupported"
      ? "Este navegador não mostra notificações, ou o site não está em HTTPS. O contador continua."
      : permission === "denied"
        ? "Bloqueadas neste navegador: clique no cadeado ao lado do endereço do site, em Notificações escolha Permitir e recarregue a página."
        : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl p-8 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Notificações</DialogTitle>
          <DialogDescription>
            Só com a janela sem foco, como no WhatsApp Web. Valem só neste navegador.
          </DialogDescription>
        </DialogHeader>
        <div>
          {permission === "default" && (
            <Button
              variant="outline"
              className="mb-3 w-full"
              onClick={() => void requestPermission()}
            >
              <BellRing />
              Permitir notificações neste navegador
            </Button>
          )}
          {permissionHint && (
            <p className="mb-3 rounded-lg bg-muted px-4 py-3 font-inter text-xs text-muted-foreground">
              {permissionHint}
            </p>
          )}
          {KINDS.map(({ kind, title, description }) => (
            <section
              key={kind}
              aria-label={title}
              className="border-t py-1 first-of-type:border-t-0"
            >
              <h3 className="pt-2 text-sm font-bold">{title}</h3>
              <p className="font-inter text-xs text-muted-foreground">{description}</p>
              <ToggleRow
                label={`Mostrar notificações de ${title.toLowerCase()}`}
                checked={prefs[kind].show}
                onChange={(value) => setKind(kind, "show", value)}
              />
              <ToggleRow
                label={`Tocar som de ${title.toLowerCase()}`}
                checked={prefs[kind].sound}
                onChange={(value) => setKind(kind, "sound", value)}
              />
            </section>
          ))}
          <div className="border-t pt-1">
            <ToggleRow
              label="Mostrar prévias"
              description="Desligado, a notificação diz só quantas há, ou de quem é"
              checked={prefs.previews}
              onChange={(value) => updatePreferences({ ...prefs, previews: value })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
