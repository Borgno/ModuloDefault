import { Bell, LayoutDashboard, MessageCircle, Users, type LucideIcon } from "lucide-react";
import type { Role } from "~/types/user";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  // Casa só o caminho exato (para "/", que é prefixo de tudo).
  end?: boolean;
  // Sem roles, todo usuário vê. Esconder o item é só conforto: o backend é quem barra.
  roles?: Role[];
  // Contador ao lado do item: notificações não lidas ou conversas com mensagem não lida.
  counter?: "unreadNotifications" | "unreadConversations";
};

export type NavSection = { title: string; items: NavItem[] };

// Itens da sidebar. Tela nova entra aqui.
export const NAVIGATION: NavSection[] = [
  {
    title: "Principal",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/chat", label: "Conversas", icon: MessageCircle, counter: "unreadConversations" },
      { to: "/notifications", label: "Notificações", icon: Bell, counter: "unreadNotifications" },
    ],
  },
  {
    title: "Administração",
    items: [{ to: "/users", label: "Usuários", icon: Users, roles: ["admin"] }],
  },
];

export function visibleNavigation(role: Role): NavSection[] {
  return NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
