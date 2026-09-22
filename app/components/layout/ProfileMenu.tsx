import { LogOut, Moon, User as UserIcon } from "lucide-react";
import { Link } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ROLE_LABELS } from "~/lib/labels";
import { useTheme } from "~/lib/theme";
import { cn } from "~/lib/utils";
import type { User } from "~/types/user";

type ProfileMenuProps = {
  user: User;
  onLogout: () => void;
  // O gatilho (cartão do perfil na sidebar, ícone na barra inferior). Precisa aceitar ref e props.
  children: React.ReactNode;
  side?: "top" | "right" | "bottom";
  align?: "start" | "end";
  onOpenChange?: (open: boolean) => void;
};

// Interruptor só visual: quem tem o papel de checkbox é o item do menu (menuitemcheckbox).
function SwitchIndicator({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "ml-auto flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-ui",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "size-4 rounded-full bg-background shadow-sm transition-transform duration-200 ease-ui",
          checked && "translate-x-4",
        )}
      />
    </span>
  );
}

export function ProfileMenu({
  user,
  onLogout,
  children,
  side = "bottom",
  align = "start",
  onOpenChange,
}: ProfileMenuProps) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-64 p-1.5">
        <DropdownMenuLabel className="mb-1 rounded-lg bg-muted px-3 py-2.5 font-normal">
          <p className="truncate text-sm font-bold text-foreground">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          <p className="truncate font-inter text-xs text-dim">{user.email}</p>
        </DropdownMenuLabel>

        {/* Trocar o tema não fecha o menu: dá para ver o resultado e voltar. */}
        <DropdownMenuItem
          role="menuitemcheckbox"
          aria-checked={dark}
          onSelect={(event) => {
            event.preventDefault();
            toggleTheme();
          }}
          className="gap-2.5 px-3 py-2"
        >
          <Moon className="text-primary" />
          Tema escuro
          <SwitchIndicator checked={dark} />
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="gap-2.5 px-3 py-2">
          <Link to="/profile">
            <UserIcon />
            Meu perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={onLogout} className="gap-2.5 px-3 py-2">
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
