import { BellRing, Volume2, VolumeX } from "lucide-react";
import { useId, useState } from "react";
import { SearchableSelect } from "~/components/patterns/SearchableSelect";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { requestPermission, updatePreferences, useNotifierState } from "~/lib/notifier/preferences";
import { previewSound, SOUND_LABELS } from "~/lib/notifier/sounds";
import {
  isMuted,
  NOTIFICATION_SOUNDS,
  type NotificationKind,
  type NotificationSound,
} from "~/types/notification";

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

// Silêncio temporário, em minutos. "0" desliga o silêncio.
const MUTE_DURATIONS = [
  { value: "0", label: "Não silenciar" },
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "480", label: "8 horas" },
  { value: "1440", label: "24 horas" },
];

const SOUND_OPTIONS = NOTIFICATION_SOUNDS.map((sound) => ({
  value: sound,
  label: SOUND_LABELS[sound],
}));

const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

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

  // O volume muda na tela enquanto arrasta e só grava ao soltar: cada gravação reenvia a inscrição
  // de push ao servidor.
  const [dragVolume, setDragVolume] = useState<number | null>(null);
  const volume = dragVolume ?? prefs.volume;

  const muted = isMuted(prefs);
  const mutedHint = !muted
    ? "Desliga o som de todos os avisos. As notificações continuam aparecendo."
    : prefs.mutedUntil === null
      ? "Silenciado até você desligar."
      : `Silenciado até ${timeFormat.format(prefs.mutedUntil)}.`;

  const setMuteDuration = (value: string) => {
    const minutes = Number(value);
    updatePreferences({
      ...prefs,
      muted: minutes > 0,
      mutedUntil: minutes > 0 ? Date.now() + minutes * 60_000 : null,
    });
  };

  const setSound = (sound: NotificationSound) => {
    updatePreferences({ ...prefs, sound });
    previewSound(sound, volume);
  };

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
          <section aria-label="Som" className="space-y-3 pb-3">
            <ToggleRow
              label="Silenciar notificações"
              description={mutedHint}
              checked={muted}
              onChange={(value) => updatePreferences({ ...prefs, muted: value, mutedUntil: null })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Silêncio temporário</Label>
                <SearchableSelect
                  aria-label="Silêncio temporário"
                  options={MUTE_DURATIONS}
                  value=""
                  onChange={setMuteDuration}
                  placeholder="Escolher"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Som</Label>
                <SearchableSelect
                  aria-label="Som"
                  options={SOUND_OPTIONS}
                  value={prefs.sound}
                  onChange={(value) => setSound(value as NotificationSound)}
                />
              </div>
            </div>
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Volume</Label>
                <span className="font-inter text-xs text-muted-foreground">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                {volume === 0 ? (
                  <VolumeX className="size-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="size-4 text-muted-foreground" />
                )}
                <Slider
                  aria-label="Volume"
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={([value]) => setDragVolume(value)}
                  onValueCommit={([value]) => {
                    setDragVolume(null);
                    updatePreferences({ ...prefs, volume: value });
                    previewSound(prefs.sound, value);
                  }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => previewSound(prefs.sound, volume)}
            >
              <Volume2 />
              Testar som
            </Button>
          </section>
          {KINDS.map(({ kind, title, description }) => (
            <section key={kind} aria-label={title} className="border-t py-1">
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
