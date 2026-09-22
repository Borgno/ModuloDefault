import { User as UserIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { visibleNavigation } from "~/config/navigation";
import { cn } from "~/lib/utils";
import type { User } from "~/types/user";
import { ProfileMenu } from "./ProfileMenu";

const itemClass = (isActive: boolean) =>
  cn(
    "relative flex size-11 items-center justify-center rounded-lg transition-colors duration-200 ease-ui",
    isActive
      ? "text-primary before:absolute before:-top-2.5 before:left-1/2 before:h-[3px] before:w-5 before:-translate-x-1/2 before:rounded-b before:bg-primary"
      : "text-muted-foreground hover:text-foreground",
  );

// Abaixo de md a sidebar some e a navegação vira uma barra inferior (design system, seção responsivo).
// O ícone de perfil abre o mesmo menu da sidebar: tema, meu perfil e sair.
export function MobileNav({ user, onLogout }: { user: User; onLogout: () => void }) {
  const items = visibleNavigation(user.role).flatMap((section) => section.items);
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t bg-card px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] md:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          aria-label={item.label}
          className={({ isActive }) => itemClass(isActive)}
        >
          <item.icon size={20} />
        </NavLink>
      ))}
      <ProfileMenu user={user} onLogout={onLogout} side="top" align="end">
        <button
          type="button"
          aria-label={`Menu do perfil: ${user.fullName}`}
          className={itemClass(pathname === "/profile")}
        >
          <UserIcon size={20} />
        </button>
      </ProfileMenu>
    </nav>
  );
}
