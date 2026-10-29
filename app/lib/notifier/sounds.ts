// Som de notificação gerado aqui (Web Audio), sem arquivo. O navegador só deixa tocar depois de um
// clique ou tecla na página; antes disso, a notificação sai com o som do sistema (notifier.ts).
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

// Duas notas subindo.
export function playIncoming() {
  const ctx = audio();
  if (!ctx || !pageActivated()) return;
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  note(ctx, 880, t, 0.12, 0.18);
  note(ctx, 1318.5, t + 0.1, 0.22, 0.16);
}
