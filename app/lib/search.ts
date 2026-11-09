// Apoio da caixa de busca das listas. A gramática (texto livre mais `campo:valor`) vive no servidor,
// em server/lib/search.ts; aqui só se reconhece o que foi digitado para avisar e para o calendário.

// Os mesmos limites do servidor: mínimo por parte e máximo do termo.
export const MIN_SEARCH_LENGTH = 3;
export const MAX_SEARCH_LENGTH = 100;

// Uma chave de `campo:valor` aceita pela lista, com o nome que aparece no painel.
export type SearchKey = { key: string; label: string };

// As duas formas com chave do tokenizador do servidor, sem as de texto livre.
const KEYED_TOKEN = /([^\s:"]+):"([^"]*)"|([^\s:"]+):(\S+)/g;

// Chaves com valor curto demais: o servidor descarta só esse filtro e devolve a lista sem ele, sem
// erro. A caixa avisa antes.
export function shortValueKeys(term: string, keys: readonly SearchKey[]) {
  const known = new Set(keys.map((k) => k.key.toLowerCase()));
  const short = new Set<string>();
  for (const m of term.matchAll(KEYED_TOKEN)) {
    const key = (m[1] ?? m[3] ?? "").toLowerCase();
    const value = m[2] ?? m[4] ?? "";
    // Valor vazio (`cargo:`) é filtro sendo digitado, não filtro errado.
    if (known.has(key) && value.length > 0 && value.length < MIN_SEARCH_LENGTH) short.add(key);
  }
  return [...short];
}

// `de:` e `ate:` como tokens inteiros: `grande:x` e `14:30` ficam de fora.
const PERIOD_TOKEN = /(^|\s)(de|ate):(\S+)/gi;

// Período em `AAAA-MM-DD`, o formato do <input type="date">.
export type SearchPeriod = { from: string; to: string };

const brToIso = (value: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
};

const isoToBr = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

// O período já escrito na caixa, para o painel abrir mostrando o que está valendo.
export function periodFromTerm(term: string): SearchPeriod {
  const period = { from: "", to: "" };
  for (const m of term.matchAll(PERIOD_TOKEN)) {
    const iso = brToIso(m[3]);
    if (!iso) continue;
    if (m[2].toLowerCase() === "de") period.from = iso;
    else period.to = iso;
  }
  return period;
}

// Reescreve o termo com o período escolhido. Substitui os `de:`/`ate:` que já estavam, em vez de
// acrescentar: dois `de:` na caixa e o servidor obedeceria ao último sem ninguém entender por quê.
export function withPeriod(term: string, period: SearchPeriod) {
  const parts = [term.replace(PERIOD_TOKEN, " ").replace(/\s+/g, " ").trim()];
  if (period.from) parts.push(`de:${isoToBr(period.from)}`);
  if (period.to) parts.push(`ate:${isoToBr(period.to)}`);
  return parts.filter(Boolean).join(" ");
}
