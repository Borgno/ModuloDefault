import { ApiProblem } from "../../lib/problem";
import {
  findUserByEmail,
  normalizeEmail,
  toPublicUser,
  type PublicUser,
} from "../users/users.service";
import { store } from "../../lib/memoryStore";
import { recordFailure, recordSuccess, retryAfterSeconds } from "./loginThrottle.service";
import { getDummyHash, verifyPassword } from "./password.service";
import { createSessionToken, readSessionToken } from "./session.service";

const INVALID_CREDENTIALS = "E-mail ou senha incorretos.";

export async function login(input: { email: string; password: string; ip: string }) {
  const email = normalizeEmail(input.email);

  const retryAfter = retryAfterSeconds(email, input.ip);
  if (retryAfter !== null) {
    throw new ApiProblem(429, "TOO_MANY_ATTEMPTS", "Muitas tentativas. Tente de novo mais tarde.", {
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  const user = findUserByEmail(email);
  // E-mail inexistente também paga o custo do bcrypt: a resposta leva o mesmo tempo nos dois casos.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));

  if (!user || !valid) {
    recordFailure(email, input.ip);
    throw new ApiProblem(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS);
  }

  recordSuccess(email);

  // Só quem acertou a senha descobre que a conta está desativada.
  if (!user.active) {
    throw new ApiProblem(403, "USER_INACTIVE", "Este usuário está desativado.");
  }

  user.lastLoginAt = new Date();
  return { user: toPublicUser(user), token: createSessionToken(user.id, user.sessionVersion) };
}

// Usuário da sessão, ou null se o token é inválido, o usuário sumiu, foi desativado ou teve a senha
// resetada depois do login (sessionVersion mudou).
export function resolveSession(token: string | undefined): PublicUser | null {
  const session = readSessionToken(token);
  if (!session) return null;
  const user = store.users.get(session.userId);
  if (!user || !user.active || user.sessionVersion !== session.version) return null;
  return toPublicUser(user);
}

// Token novo para o próprio usuário, depois de uma troca de senha que derrubou as outras sessões.
export function issueSessionToken(userId: string) {
  const user = store.users.get(userId);
  if (!user) throw new ApiProblem(404, "USER_NOT_FOUND", "Usuário não encontrado.");
  return createSessionToken(user.id, user.sessionVersion);
}
