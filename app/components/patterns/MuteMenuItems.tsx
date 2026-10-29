import { BellOff, BellRing } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "~/components/ui/dropdown-menu";
import { MUTE_LABELS, type MuteOption } from "~/types/notification";

const OPTIONS = Object.entries(MUTE_LABELS) as [MuteOption, string][];

// "Silenciar" com 8 horas, 1 semana e Sempre, ou "Voltar a avisar" quando já está silenciado. Usado
// no menu das conversas e no dos avisos.
export function MuteMenuItems({
  muted,
  label = "Silenciar",
  onChange,
}: {
  muted: boolean;
  label?: string;
  onChange: (option: MuteOption | null) => void;
}) {
  if (muted) {
    return (
      <DropdownMenuItem onSelect={() => onChange(null)}>
        <BellRing />
        Voltar a avisar
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <BellOff />
        {label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {OPTIONS.map(([option, text]) => (
          <DropdownMenuItem key={option} onSelect={() => onChange(option)}>
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

// "até 14:30 de 28/10" ou "sempre", para dizer até quando está silenciado.
export function mutedUntilLabel(mutedUntil: string | null) {
  if (!mutedUntil) return "para sempre";
  const date = new Date(mutedUntil);
  return `até ${date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
}
