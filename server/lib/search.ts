// Gramática da caixa de busca das listas, a mesma do IntraNet: uma caixa só, com texto livre e
// `campo:valor`. Cada lista declara as próprias chaves e aplica o resultado na sua consulta; este
// arquivo não conhece banco nem domínio.
//
// `campo:valor` é ferramenta de precisão, não obrigação: o texto livre continua achando. O filtro
// serve para desempatar quando o termo é ambíguo.

// Mínimo por parte, não para o termo inteiro: `cargo:adm` vale mesmo com o texto livre vazio, e um
// texto livre curto não descarta os filtros junto. Com Postgres, é também o mínimo do índice
// trigram.
export const MIN_SEARCH_LENGTH = 3;
export const MAX_SEARCH_LENGTH = 100;

// O dia da empresa começa e termina em -03:00. Sem isto, `ate:05/08` em UTC perderia o que foi
// criado depois das 21h daquele dia. O Brasil não tem horário de verão desde 2019.
const COMPANY_OFFSET = "-03:00";

// Chaves reservadas do período, testadas antes das chaves da lista: uma lista com campo `de` não
// pode roubar o início do intervalo.
const KEY_FROM = "de";
const KEY_TO = "ate";

export type SearchFilter = { key: string; value: string };

export type SearchPeriod = { from: Date | null; to: Date | null };

export type ParsedSearch = {
  // Texto livre normalizado, ou null quando não há texto útil.
  text: string | null;
  filters: SearchFilter[];
  period: SearchPeriod;
};

// Minúsculo e sem acento. Quem compara aplica a mesma normalização dos dois lados; se um lado
// normalizar diferente, a busca não acha nada e não dá erro.
export function normalizeTerm(raw: string) {
  return raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// O texto normalizado contém o termo já normalizado (o `text` ou o `value` de um filtro).
export function matchesTerm(haystack: string | null | undefined, term: string) {
  return normalizeTerm(haystack ?? "").includes(term);
}

// `DD/MM/AAAA` ou `AAAA-MM-DD` vira a borda do dia. Data que não existe (31/02) dá null, em vez de o
// Date rolar para março em silêncio.
function dayBoundary(value: string, endOfDay: boolean) {
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!br && !iso) return null;

  const [year, month, day] = br
    ? [Number(br[3]), Number(br[2]), Number(br[1])]
    : [Number(iso![1]), Number(iso![2]), Number(iso![3])];

  const check = new Date(Date.UTC(year, month - 1, day));
  const real =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;
  if (!real) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${year}-${pad(month)}-${pad(day)}T${time}${COMPANY_OFFSET}`);
}

type Token = { key?: string; value: string; raw: string };

// Quatro formas, nesta ordem: `chave:"valor com espaço"`, `chave:valor`, `"frase"` e `palavra`. Sem
// a primeira, `nome:"ana souza"` seria cortado no espaço.
function tokenize(raw: string) {
  const tokens: Token[] = [];
  const re = /([^\s:"]+):"([^"]*)"|([^\s:"]+):(\S+)|"([^"]*)"|(\S+)/g;
  for (const m of raw.matchAll(re)) {
    const [whole, quotedKey, quotedValue, key, value, phrase, word] = m;
    if (quotedKey !== undefined) tokens.push({ key: quotedKey, value: quotedValue, raw: whole });
    else if (key !== undefined) tokens.push({ key, value, raw: whole });
    else if (phrase !== undefined) tokens.push({ value: phrase, raw: phrase });
    else if (word !== undefined) tokens.push({ value: word, raw: word });
  }
  return tokens;
}

// Separa a caixa em texto livre, filtros e período. `x:y` só vira filtro quando `x` é chave da
// lista; chave desconhecida volta inteira para o texto, o que preserva `14:30` e `http://x`.
export function parseSearch(raw: string | null | undefined, keys: readonly string[]): ParsedSearch {
  const known = new Set(keys.map((key) => key.toLowerCase()));
  const filters: SearchFilter[] = [];
  const period: SearchPeriod = { from: null, to: null };
  const loose: string[] = [];

  for (const token of tokenize(raw ?? "")) {
    const key = token.key ? normalizeTerm(token.key) : null;

    // Data inválida descarta só o filtro e não volta como texto: o resto da consulta ainda serve.
    if (key === KEY_FROM || key === KEY_TO) {
      const boundary = dayBoundary(token.value, key === KEY_TO);
      if (boundary) {
        if (key === KEY_FROM) period.from = boundary;
        else period.to = boundary;
      }
      continue;
    }

    if (key && known.has(key)) {
      // Valor curto não vira filtro nem volta como texto. A caixa avisa antes de enviar.
      const value = normalizeTerm(token.value);
      if (value.length >= MIN_SEARCH_LENGTH) filters.push({ key, value });
      continue;
    }

    loose.push(token.raw);
  }

  const text = normalizeTerm(loose.join(" "));
  return { text: text.length >= MIN_SEARCH_LENGTH ? text : null, filters, period };
}

// O instante cai no período, com as duas bordas inclusivas.
export function inPeriod(date: Date, period: SearchPeriod) {
  if (period.from && date < period.from) return false;
  if (period.to && date > period.to) return false;
  return true;
}
