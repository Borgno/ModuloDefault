import { ChevronDown, ChevronsUpDown, Layers, PanelLeft, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { APP_NAME } from "~/config/app";
import { visibleNavigation, type NavItem, type NavSection } from "~/config/navigation";
import { cn } from "~/lib/utils";
import type { User } from "~/types/user";
import { ProfileMenu } from "./ProfileMenu";

export type SidebarMode = "expanded" | "collapsed" | "hover";

export const SIDEBAR_MODES: { value: SidebarMode; label: string }[] = [
  { value: "expanded", label: "Expandido" },
  { value: "collapsed", label: "Recolhido" },
  { value: "hover", label: "Expandir ao passar o mouse" },
];

type SidebarProps = {
  user: User;
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  onLogout: () => void;
};

// Recolhida, a sidebar mostra só o ícone; o nome vai para o tooltip.
function WithTooltip({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function isItemActive(item: NavItem, pathname: string) {
  return item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`);
}

// Caixa com contorno em volta do ícone, igual em todos os botões da sidebar. Ativa, fica preenchida.
function IconBox({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border p-1.5 transition-colors duration-200 ease-ui",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-primary-glow"
          : "border-sidebar-border bg-accent text-muted-foreground group-hover/item:border-primary/30 group-hover/item:text-primary",
      )}
    >
      {children}
    </span>
  );
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname } = useLocation();
  // Estado ativo calculado aqui, e não pela função de className do NavLink: recolhida, o link fica
  // dentro do TooltipTrigger (Slot do Radix), que mescla className como texto e quebraria a função.
  const active = isItemActive(item, pathname);
  const Icon = item.icon;
  return (
    <WithTooltip label={item.label} show={collapsed}>
      <NavLink
        to={item.to}
        end={item.end}
        aria-label={collapsed ? item.label : undefined}
        className={cn(
          "group/item relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-all duration-200 ease-ui",
          collapsed && "justify-center px-0",
          active
            ? "bg-primary/10 text-primary before:absolute before:top-1/2 before:-left-2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <IconBox active={active}>
          <Icon size={14} />
        </IconBox>
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    </WithTooltip>
  );
}

const SECTIONS_KEY = "sidebar-sections";

// Categorias recolhidas pelo título, guardadas no navegador. A sidebar só renderiza no navegador
// (o layout tem clientLoader), então ler o localStorage no estado inicial é seguro.
function useClosedSections() {
  const [closed, setClosed] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? "[]");
      return Array.isArray(saved)
        ? saved.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  });

  function toggle(title: string) {
    setClosed((current) => {
      const next = current.includes(title)
        ? current.filter((value) => value !== title)
        : [...current, title];
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
      } catch {
        // Sem localStorage: vale só até recarregar.
      }
      return next;
    });
  }

  return [closed, toggle] as const;
}

function SidebarSection({
  section,
  collapsed,
  open,
  onToggle,
}: {
  section: NavSection;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { pathname } = useLocation();
  const id = `sidebar-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`;
  // Recolhida com a página atual dentro: o título fica azul para não perder onde se está.
  const hidesActive = !open && section.items.some((item) => isItemActive(item, pathname));

  // Com a sidebar só em ícones não há título; a categoria ocultada continua oculta.
  if (collapsed) {
    if (!open) return null;
    return (
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          "mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[9px] font-bold tracking-[0.1em] uppercase transition-colors duration-200 ease-ui hover:bg-accent",
          hidesActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {section.title}
        <ChevronDown
          size={14}
          className={cn("transition-transform duration-200 ease-ui", !open && "-rotate-90")}
        />
      </button>
      {open && (
        <div id={id} className="space-y-0.5">
          {section.items.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ user, mode, onModeChange, onLogout }: SidebarProps) {
  const { pathname } = useLocation();
  const sections = visibleNavigation(user.role);
  const [closedSections, toggleSection] = useClosedSections();

  // No modo "hover", a sidebar recolhida abre por cima do conteúdo enquanto o mouse (ou o foco do
  // teclado) está nela, e fica aberta enquanto um dos menus estiver aberto.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Última interação: teclado ou ponteiro. O foco só segura a sidebar aberta quando veio do teclado.
  // Olhar :focus-visible no momento do foco não basta: quando o Radix devolve o foco ao botão depois
  // de um clique no menu, o navegador ainda pode tratar esse foco como de teclado.
  const lastInputWasKeyboard = useRef(false);
  useEffect(() => {
    const onKeyDown = () => (lastInputWasKeyboard.current = true);
    const onPointerDown = () => (lastInputWasKeyboard.current = false);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);
  const [controlMenuOpen, setControlMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const peeking = mode === "hover" && (hovered || focused || controlMenuOpen || profileMenuOpen);
  const collapsed = mode === "collapsed" || (mode === "hover" && !peeking);
  const onProfile = pathname === "/profile";

  // Entrada e saída do ponteiro pelos eventos nativos. O onMouseEnter/onMouseLeave do React é emulado
  // a partir de mouseover/mouseout; quando a sidebar abre, os links são recriados embaixo do ponteiro,
  // e um evento vindo de um nó já removido gerava uma "entrada" falsa depois da saída, prendendo a
  // sidebar aberta. Sair também limpa o foco (quem navega por teclado não gera pointerleave).
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    const onEnter = () => setHovered(true);
    const onLeave = () => {
      setHovered(false);
      setFocused(false);
    };
    aside.addEventListener("pointerenter", onEnter);
    aside.addEventListener("pointerleave", onLeave);
    return () => {
      aside.removeEventListener("pointerenter", onEnter);
      aside.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const profileButton = (
    <button
      type="button"
      aria-label={`Menu do perfil: ${user.fullName}`}
      className={cn(
        "group/item flex w-full items-center gap-2.5 overflow-hidden rounded-lg border text-left shadow-sm transition-all duration-200 ease-ui",
        collapsed ? "justify-center border-transparent p-1.5 shadow-none" : "px-3 py-2",
        onProfile
          ? "border-primary/30 bg-primary/10"
          : cn(
              !collapsed && "border-sidebar-border bg-muted",
              "hover:border-primary/50 hover:bg-accent",
            ),
      )}
    >
      <IconBox active={onProfile}>
        <UserIcon size={14} />
      </IconBox>
      {!collapsed && (
        <>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "mb-1 text-[9px] leading-none font-bold tracking-[0.1em] uppercase",
                onProfile ? "text-primary" : "text-muted-foreground",
              )}
            >
              Perfil
            </p>
            <p className="truncate text-[11px] font-bold">{user.fullName}</p>
          </div>
          <ChevronsUpDown size={14} className="shrink-0 text-dim" />
        </>
      )}
    </button>
  );

  return (
    // O wrapper reserva o espaço no layout; no modo "hover" a sidebar aberta passa por cima do conteúdo.
    <div
      className={cn(
        "relative z-20 h-full shrink-0 transition-[width] duration-300 ease-layout",
        mode === "expanded" ? "w-[240px]" : "w-[72px]",
      )}
    >
      <aside
        ref={asideRef}
        data-collapsed={collapsed}
        onFocus={() => setFocused(lastInputWasKeyboard.current)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        className={cn(
          "absolute inset-y-0 left-0 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-layout",
          collapsed ? "w-[72px]" : "w-[240px]",
          peeking && "shadow-card-elevated",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border",
            collapsed ? "justify-center" : "justify-between pr-3 pl-4",
          )}
        >
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="shrink-0 rounded-lg bg-primary p-1.5 text-primary-foreground shadow-primary-glow">
                <Layers size={18} strokeWidth={2.5} />
              </div>
              <span className="truncate text-lg font-bold tracking-tighter uppercase">
                {APP_NAME}
              </span>
            </div>
          )}
          <DropdownMenu open={controlMenuOpen} onOpenChange={setControlMenuOpen}>
            <DropdownMenuTrigger
              aria-label="Controle do menu lateral"
              className="group/item flex shrink-0 items-center justify-center rounded-lg p-1 transition-colors duration-200 ease-ui"
            >
              <IconBox active={false}>
                <PanelLeft size={14} />
              </IconBox>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? "right" : "bottom"}
              align="start"
              className="w-64"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Menu lateral
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(value) => onModeChange(value as SidebarMode)}
              >
                {SIDEBAR_MODES.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-2 shrink-0 border-b border-sidebar-border p-2">
          {collapsed ? (
            <Tooltip>
              <ProfileMenu
                user={user}
                onLogout={onLogout}
                side="right"
                onOpenChange={setProfileMenuOpen}
              >
                <TooltipTrigger asChild>{profileButton}</TooltipTrigger>
              </ProfileMenu>
              <TooltipContent side="right">Perfil</TooltipContent>
            </Tooltip>
          ) : (
            <ProfileMenu user={user} onLogout={onLogout} onOpenChange={setProfileMenuOpen}>
              {profileButton}
            </ProfileMenu>
          )}
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto px-2.5">
          {sections.map((section) => (
            <SidebarSection
              key={section.title}
              section={section}
              collapsed={collapsed}
              open={!closedSections.includes(section.title)}
              onToggle={() => toggleSection(section.title)}
            />
          ))}
        </nav>
      </aside>
    </div>
  );
}
