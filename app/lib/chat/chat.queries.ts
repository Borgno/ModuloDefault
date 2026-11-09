import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  Contact,
  Conversation,
  ConversationFilter,
  ConversationPage,
  Message,
  MessagePage,
} from "~/types/chat";
import type { MuteOption } from "~/types/notification";
import { api } from "../api";

// Queries do chat usadas fora da tela de Conversas também: o contador da sidebar e da aba, e o stream
// de eventos, que atualiza o cache sem buscar de novo.

const LIST_PAGE_SIZE = 100;
const MESSAGES_PAGE_SIZE = 50;

export const conversationsQuery = (filter: ConversationFilter, search?: string) =>
  queryOptions({
    queryKey: ["chat", "conversations", { filter, search: search ?? "" }],
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({ filter, pageSize: String(LIST_PAGE_SIZE) });
      if (search) query.set("search", search);
      return api.get<ConversationPage>(`/conversations?${query}`, { signal });
    },
    placeholderData: keepPreviousData,
  });

// Conversas que contam no "(N)" da aba e na sidebar.
export const unreadConversationsQuery = queryOptions({
  queryKey: ["chat", "unread"],
  queryFn: async ({ signal }) =>
    (await api.get<ConversationPage>("/conversations?pageSize=1", { signal })).meta
      .unreadConversations,
});

// Ids das conversas não lidas, para fechar as notificações do push das que já foram lidas.
export const unreadConversationIds = async () =>
  (await api.get<ConversationPage>(`/conversations?filter=unread&pageSize=${LIST_PAGE_SIZE}`)).data
    .filter((c) => c.unreadCount > 0 || c.markedUnread)
    .map((c) => c.id);

export const conversationQuery = (id: string) =>
  queryOptions({
    queryKey: ["chat", "conversation", id],
    queryFn: ({ signal }) => api.get<Conversation>(`/conversations/${id}`, { signal }),
  });

// Páginas da mais nova (pages[0]) para as mais antigas. O stream acrescenta as novas, e voltar à
// conversa mantém as páginas antigas já carregadas.
export const messagesQuery = (id: string) =>
  infiniteQueryOptions({
    queryKey: ["chat", "messages", id],
    queryFn: ({ pageParam, signal }) =>
      api.get<MessagePage>(
        `/conversations/${id}/messages?limit=${MESSAGES_PAGE_SIZE}${pageParam ? `&before=${pageParam}` : ""}`,
        { signal },
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.meta.hasMore ? last.data[0]?.seq : undefined),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

export const contactsQuery = (search: string) =>
  queryOptions({
    queryKey: ["chat", "contacts", search],
    queryFn: ({ signal }) =>
      api.get<{ data: Contact[] }>(
        `/contacts?pageSize=100${search.length >= 3 ? `&search=${encodeURIComponent(search)}` : ""}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });

// Mensagens carregadas, da mais antiga para a mais nova, sem repetição.
export function flattenMessages(data: InfiniteData<MessagePage> | undefined): Message[] {
  if (!data) return [];
  const byId = new Map<string, Message>();
  for (const page of data.pages) for (const message of page.data) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.seq - b.seq);
}

// Conversa mudou (stream ou resposta): a conversa e as listas que a mostram. As listas são refeitas
// em segundo plano, para a ordem e os filtros virem do servidor.
export function applyConversation(queryClient: QueryClient, conversation: Conversation) {
  queryClient.setQueryData(conversationQuery(conversation.id).queryKey, conversation);
  queryClient.setQueriesData<ConversationPage>(
    { queryKey: ["chat", "conversations"] },
    (page) =>
      page && {
        ...page,
        data: page.data.map((c) => (c.id === conversation.id ? conversation : c)),
      },
  );
  void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
  void queryClient.invalidateQueries({ queryKey: unreadConversationsQuery.queryKey });
}

// Mensagem nova ou alterada (reação) na conversa já carregada.
export function applyMessage(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<InfiniteData<MessagePage>>(
    messagesQuery(message.conversationId).queryKey,
    (data) => {
      if (!data) return data;
      const exists = data.pages.some((page) => page.data.some((m) => m.id === message.id));
      const pages = exists
        ? data.pages.map((page) => ({
            ...page,
            data: page.data.map((m) => (m.id === message.id ? message : m)),
          }))
        : data.pages.map((page, i) =>
            i === 0 ? { ...page, data: [...page.data, message] } : page,
          );
      return { ...data, pages };
    },
  );
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      read?: boolean;
      readUntil?: number;
      mute?: MuteOption | null;
      archived?: boolean;
    }) => api.patch<Conversation>(`/conversations/${id}`, patch),
    onSuccess: (conversation) => applyConversation(queryClient, conversation),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input:
        { kind: "direct"; memberId: string } | { kind: "group"; name: string; memberIds: string[] },
    ) => api.post<Conversation>("/conversations", input),
    onSuccess: (conversation) => applyConversation(queryClient, conversation),
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      text: string;
      replyToId?: string | null;
      mentionIds?: string[];
      mentionsAll?: boolean;
    }) => api.post<Message>(`/conversations/${conversationId}/messages`, input),
    onSuccess: (message) => applyMessage(queryClient, message),
  });
}

export function useReact(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string | null }) => {
      const path = `/conversations/${conversationId}/messages/${messageId}/myReaction`;
      if (emoji) return api.put<Message>(path, { emoji });
      await api.delete<void>(path);
      return null;
    },
    onSuccess: (message) => {
      if (message) applyMessage(queryClient, message);
    },
  });
}
