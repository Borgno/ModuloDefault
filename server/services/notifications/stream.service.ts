// Abas abertas de cada usuário, cada uma com o stream SSE de GET /events. Fica na memória
// do processo: com mais de um processo atrás do proxy, a aba de um não recebe o evento do outro, e
// isso pede um canal entre eles (Redis, LISTEN/NOTIFY do Postgres) antes de escalar.
import type { ConversationSummary, PublicMessage } from "../chat/chat.service";
import type { NoticeMute, PublicNotification } from "./notifications.service";

// O nome do evento SSE é o `type`; o `data` vai como JSON.
export type StreamEvent =
  // Notificação nova, com o total de não lidas depois dela.
  | { type: "notification"; data: { notification: PublicNotification; unread: number } }
  // Notificações lidas (aqui ou em outro navegador): as do sistema fecham. `ids` null = todas.
  | { type: "read"; data: { ids: string[] | null; unread: number } }
  // Uma voltou a não lida, ou foi arquivada ou desarquivada: só o contador e a lista mudam.
  | { type: "unread"; data: { unread: number } }
  // Avisos silenciados ou de volta.
  | { type: "noticeMute"; data: NoticeMute }
  // Conversa criada, lida, marcada, silenciada ou arquivada (aqui ou em outro navegador).
  | { type: "conversation"; data: { conversation: ConversationSummary } }
  // Mensagem nova numa conversa, com a conversa já como a pessoa vê.
  | { type: "message"; data: { message: PublicMessage; conversation: ConversationSummary } }
  // Reação posta ou tirada. `reaction` só quando é de outra pessoa a uma mensagem desta.
  | {
      type: "reaction";
      data: {
        message: PublicMessage;
        conversation: ConversationSummary;
        reaction: { authorName: string; emoji: string; text: string } | null;
      };
    };

type Connection = {
  send: (event: StreamEvent) => void;
  // Encerra o stream pelo servidor (desligando).
  end: () => void;
  // Inscrição de Web Push do navegador desta aba: ele é avisado pela página, não por push.
  pushEndpoint: string | null;
};

const connections = new Map<string, Set<Connection>>();

// Registra a aba e devolve a função que a remove (stream fechado).
export function openStream(
  userId: string,
  pushEndpoint: string | null,
  send: Connection["send"],
  end: Connection["end"],
): () => void {
  const connection: Connection = { send, end, pushEndpoint };
  const set = connections.get(userId) ?? new Set();
  set.add(connection);
  connections.set(userId, set);
  return () => {
    set.delete(connection);
    if (set.size === 0) connections.delete(userId);
  };
}

export function sendToUser(userId: string, event: StreamEvent) {
  for (const connection of connections.get(userId) ?? []) {
    try {
      connection.send(event);
    } catch {
      // Stream que fechou no meio do envio: some no onAbort dele.
    }
  }
}

// Inscrições de push dos navegadores do usuário que estão com o app aberto agora.
export function openPushEndpoints(userId: string): Set<string> {
  const endpoints = new Set<string>();
  for (const connection of connections.get(userId) ?? []) {
    if (connection.pushEndpoint) endpoints.add(connection.pushEndpoint);
  }
  return endpoints;
}

// Desligando: o server.close() espera as conexões abertas, e o stream não fecha sozinho. As abas
// reconectam no processo novo.
export function closeAllStreams() {
  for (const set of connections.values()) for (const connection of set) connection.end();
  connections.clear();
}
