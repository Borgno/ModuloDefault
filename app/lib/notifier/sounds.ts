// Som de notificação gerado aqui (Web Audio), sem arquivo. O navegador só deixa tocar depois de um
// clique ou tecla na página; antes disso, a notificação sai com o som do sistema (notifier.ts).
import type { NotificationSound } from "~/types/notification";

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  context ??= new AudioContext();
  return context;
}

// Já houve clique ou tecla nesta página. Sem a API (navegador antigo), tenta e o navegador decide.
const pageActivated = () =>
  (navigator.userActivation as UserActivation | undefined)?.hasBeenActive ?? true;

export function canPlaySound() {
  return !!audio() && pageActivated();
}

// Primeira interação: libera o áudio.
export function installAudioUnlock() {
  const unlock = () => {
    const ctx = audio();
    if (ctx?.state === "suspended") void ctx.resume();
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
}

// Uma nota curta, com ataque rápido e queda suave.
function note(ctx: AudioContext, freq: number, start: number, duration: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

type Note = { freq: number; at: number; duration: number; level: number };

// Cada som é uma sequência de notas. `level` é relativo: o volume da configuração multiplica.
const PATTERNS: Record<NotificationSound, Note[]> = {
  // Duas notas subindo.
  padrao: [
    { freq: 880, at: 0, duration: 0.12, level: 0.36 },
    { freq: 1318.5, at: 0.1, duration: 0.22, level: 0.32 },
  ],
  // Uma nota longa, com a oitava por cima.
  sino: [
    { freq: 1046.5, at: 0, duration: 0.9, level: 0.34 },
    { freq: 2093, at: 0, duration: 0.6, level: 0.12 },
  ],
  // Três notas subindo.
  chime: [
    { freq: 784, at: 0, duration: 0.18, level: 0.3 },
    { freq: 987.8, at: 0.12, duration: 0.18, level: 0.3 },
    { freq: 1318.5, at: 0.24, duration: 0.3, level: 0.3 },
  ],
  // Uma nota curta.
  pop: [{ freq: 660, at: 0, duration: 0.07, level: 0.4 }],
};

export const SOUND_LABELS: Record<NotificationSound, string> = {
  padrao: "Padrão",
  sino: "Sino",
  chime: "Chime",
  pop: "Pop",
};

function play(sound: NotificationSound, volume: number) {
  const ctx = audio();
  if (!ctx || volume <= 0) return;
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  for (const n of PATTERNS[sound]) note(ctx, n.freq, t + n.at, n.duration, n.level * volume);
}

// Aviso chegando. Sem clique ou tecla na página o navegador não deixa tocar.
export function playIncoming(sound: NotificationSound, volume: number) {
  if (pageActivated()) play(sound, volume);
}

// Botão "Testar som" e troca de som ou volume na configuração: já vem de um clique.
export function previewSound(sound: NotificationSound, volume: number) {
  play(sound, volume);
}
