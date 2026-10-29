import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AppNotification,
  MuteOption,
  NoticeMute,
  NotificationPage,
} from "~/types/notification";
import { api } from "../api";

// Queries de notificação usadas fora da tela de Notificações: o contador da sidebar e da aba, e o
// silêncio dos avisos.

export const unreadNotificationsQuery = queryOptions({
  queryKey: ["notifications", "unread"],
  queryFn: async ({ signal }) =>
    (await api.get<NotificationPage>("/notifications?read=false&pageSize=1", { signal })).meta
      .unread,
});

// Ids das não lidas (até 100), para fechar as notificações do push que já foram lidas.
export const unreadNotificationIds = async () =>
  (await api.get<NotificationPage>("/notifications?read=false&pageSize=100")).data.map(
    (notification) => notification.id,
  );

export const noticeMuteQuery = queryOptions({
  queryKey: ["notifications", "mute"],
  queryFn: ({ signal }) => api.get<NoticeMute>("/noticeMute", { signal }),
});

// Silenciado agora: o prazo vence sozinho, sem aviso do servidor.
export function isMutedNow(mute: { muted: boolean; mutedUntil: string | null } | undefined) {
  if (!mute?.muted) return false;
  return mute.mutedUntil === null || new Date(mute.mutedUntil).getTime() > Date.now();
}

export function useUpdateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; read?: boolean; archived?: boolean }) =>
      api.patch<AppNotification>(`/notifications/${id}`, patch),
    // O contador chega pelo stream; a lista é refeita aqui para a tela não esperar por ele.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<void>("/notifications", { read: true }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSetNoticeMute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mute: MuteOption | null) => api.put<NoticeMute>("/noticeMute", { mute }),
    onSuccess: (mute) => queryClient.setQueryData(noticeMuteQuery.queryKey, mute),
  });
}
