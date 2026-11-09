import type { Conversation, Message } from "~/types/chat";
import type { AppNotification, NoticeMute } from "~/types/notification";

// Stream SSE de GET /api/v1/events, aberto enquanto há sessão, em qualquer tela.
// O EventSource reconecta sozinho em queda de rede, mas desiste em resposta de erro (502 no deploy,
// 401) e não percebe conexão que morre calada. Aqui ele é recriado com espera crescente de 1 s a 30 s,
// e a conexão sem nenhum evento por 45 s (o servidor manda `ping` a cada 20 s) é descartada.

export type RealtimeEvent =
  | { type: "notification"; notification: AppNotification; unread: number }
  | { type: "read"; ids: string[] | null; unread: number }
  | { type: "unread"; unread: number }
  | ({ type: "noticeMute" } & NoticeMute)
  | { type: "conversation"; conversation: Conversation }
  | { type: "message"; message: Message; conversation: Conversation }
  | {
      type: "reaction";
      message: Message;
      conversation: Conversation;
      // Só quando é de outra pessoa a uma mensagem sua.
      reaction: { authorName: string; emoji: string; text: string } | null;
    };

const EVENT_TYPES = [
  "notification",
  "read",
  "unread",
  "noticeMute",
  "conversation",
  "message",
  "reaction",
] as const;

type Options = {
  // Inscrição de push deste navegador: com a aba aberta, o servidor não manda push para ele.
  pushEndpoint: string | null;
  onEvent: (event: RealtimeEvent) => void;
  // Conectou (também depois de cair): a tela refaz o que pode ter perdido.
  onOpen: () => void;
  onOffline: () => void;
};

const MIN_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
const SILENCE_MS = 45_000;

export function connectRealtime({ pushEndpoint, onEvent, onOpen, onOffline }: Options) {
  let source: EventSource | null = null;
  let retryMs = MIN_RETRY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const url = `/api/v1/events${
    pushEndpoint ? `?pushEndpoint=${encodeURIComponent(pushEndpoint)}` : ""
  }`;

  function heard() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => drop(), SILENCE_MS);
  }

  function drop() {
    source?.close();
    source = null;
    clearTimeout(silenceTimer);
    if (stopped) return;
    onOffline();
    retryTimer = setTimeout(open, retryMs);
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
  }

  function parse(event: MessageEvent<string>) {
    heard();
    try {
      return JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  function open() {
    if (stopped) return;
    source = new EventSource(url);
    heard();
    source.addEventListener("ready", (event) => {
      parse(event);
      retryMs = MIN_RETRY_MS;
      onOpen();
    });
    source.addEventListener("ping", (event) => parse(event));
    for (const type of EVENT_TYPES) {
      source.addEventListener(type, (event) => {
        const data = parse(event);
        if (data) onEvent({ type, ...data } as RealtimeEvent);
      });
    }
    // Queda de rede o EventSource tenta sozinho (CONNECTING); resposta de erro fecha (CLOSED).
    source.addEventListener("error", () => {
      if (source?.readyState === EventSource.CLOSED) drop();
      else onOffline();
    });
  }

  open();
  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    clearTimeout(silenceTimer);
    source?.close();
  };
}
