import { APP_NAME } from "~/config/app";

// Título e ícone da aba: "(N) App" e o ícone com o número de não lidas, ou com "!" sem conexão.
const BASE_ICON = "/favicon.ico";

let baseImage: Promise<HTMLImageElement> | null = null;

function loadBaseIcon() {
  baseImage ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = BASE_ICON;
  });
  return baseImage;
}

// Cores fixas: o ícone da aba fica fora do tema do app, e o canvas não lê variável CSS.
const BADGE_COLOR = "#ef4444";
const OFFLINE_COLOR = "#9ca3af";

// Ícone com o número (1 a 99, depois "99+") ou com o "!" de conexão caída.
async function drawIcon(count: number, offline: boolean) {
  const img = await loadBaseIcon();
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.min(size / img.width, size / img.height);
  ctx.drawImage(
    img,
    (size - img.width * scale) / 2,
    (size - img.height * scale) / 2,
    img.width * scale,
    img.height * scale,
  );

  const label = offline ? "!" : count > 99 ? "99+" : String(count);
  ctx.font = `bold ${label.length > 2 ? 24 : 34}px sans-serif`;
  const width = Math.max(40, ctx.measureText(label).width + 16);
  const height = 40;
  const x = size - width;
  ctx.fillStyle = offline ? OFFLINE_COLOR : BADGE_COLOR;
  ctx.beginPath();
  ctx.roundRect(x, 0, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + width / 2, height / 2 + 2);
  return canvas.toDataURL("image/png");
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

let shown = { count: 0, offline: false };
let drawSeq = 0;

// O título base é o da tela (meta da rota): "(N) " vai na frente dele e sai quando zera.
const COUNT_PREFIX = /^\(\d+\+?\) /;

export function renderDocumentBadge(count: number, offline: boolean) {
  const base = document.title.replace(COUNT_PREFIX, "") || APP_NAME;
  const title = count > 0 ? `(${count > 999 ? "999+" : count}) ${base}` : base;
  // Gravar o mesmo título ainda conta como mudança para o MutationObserver de quem chama.
  if (document.title !== title) document.title = title;
  if (shown.count === count && shown.offline === offline) return;
  shown = { count, offline };

  // Instalado como app: o número vai para o ícone do app (só lá a API existe).
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (count > 0) nav.setAppBadge?.(count).catch(() => {});
  else nav.clearAppBadge?.().catch(() => {});

  const seq = ++drawSeq;
  if (count === 0 && !offline) {
    setFavicon(BASE_ICON);
    return;
  }
  drawIcon(count, offline)
    .then((href) => {
      if (seq === drawSeq) setFavicon(href);
    })
    .catch(() => {});
}
