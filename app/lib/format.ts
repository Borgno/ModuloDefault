const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const number = new Intl.NumberFormat("pt-BR");

export function formatDateTime(iso: string | null | undefined, fallback = "Nunca") {
  return iso ? dateTime.format(new Date(iso)) : fallback;
}

export function formatNumber(value: number) {
  return number.format(value);
}
