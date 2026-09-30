import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

// Mesmo algoritmo e cost dos outros projetos da organização. O hash carrega o cost, então dá para
// endurecer no futuro sem invalidar os hashes antigos.
const COST = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith("$2")) return false;
  return bcrypt.compare(password, stored);
}

// Hash descartável, usado quando o e-mail não existe: o login paga o mesmo custo de bcrypt e o tempo
// de resposta não denuncia quais e-mails estão cadastrados.
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

// Senha temporária do reset: 12 caracteres sem os que se confundem (0/O, 1/l/I).
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateTemporaryPassword() {
  return Array.from(randomBytes(12), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
