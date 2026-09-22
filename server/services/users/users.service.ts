import { randomUUID } from "node:crypto";
import { ApiProblem } from "../../lib/problem";
import { store, type RoleCode, type UserRecord } from "../../lib/memoryStore";
import { recordAudit } from "../audit/audit.service";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "../auth/password.service";
import { paginate, sortBy } from "../pagination";

export type { RoleCode };

// O que sai do servidor. Nunca inclui o hash da senha nem o sessionVersion.
export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: RoleCode;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  for (const user of store.users.values()) if (user.email === normalized) return user;
  return undefined;
}

export function getUserRecord(id: string) {
  const user = store.users.get(id);
  if (!user) throw new ApiProblem(404, "USER_NOT_FOUND", "Usuário não encontrado.");
  return user;
}

export function getUser(id: string) {
  return toPublicUser(getUserRecord(id));
}

function assertEmailAvailable(email: string) {
  if (findUserByEmail(email)) {
    throw new ApiProblem(409, "EMAIL_TAKEN", "Já existe um usuário com este e-mail.", {
      errors: [{ field: "email", message: "Já existe um usuário com este e-mail." }],
    });
  }
}

async function insertUser(input: {
  email: string;
  fullName: string;
  password: string;
  role: RoleCode;
  mustChangePassword: boolean;
}) {
  assertEmailAvailable(input.email);
  const now = new Date();
  const user: UserRecord = {
    id: randomUUID(),
    email: normalizeEmail(input.email),
    fullName: input.fullName.trim(),
    passwordHash: await hashPassword(input.password),
    role: input.role,
    active: true,
    mustChangePassword: input.mustChangePassword,
    sessionVersion: 1,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };
  store.users.set(user.id, user);
  return user;
}

// Usuários da subida: um admin e um comum, com a mesma senha de SEED_PASSWORD.
export async function seedUsers(password: string) {
  await insertUser({
    email: "admin@local.test",
    fullName: "Administrador",
    password,
    role: "admin",
    mustChangePassword: false,
  });
  await insertUser({
    email: "user@local.test",
    fullName: "Usuário Comum",
    password,
    role: "user",
    mustChangePassword: false,
  });
}

// --- Gestão (admin) -------------------------------------------------------------------------

export type ListUsersQuery = {
  search?: string;
  role?: RoleCode;
  active?: boolean;
  sort: string;
  page: number;
  pageSize: number;
};

export function listUsers(query: ListUsersQuery) {
  const search = query.search?.trim().toLowerCase();
  const filtered = [...store.users.values()]
    .filter(
      (user) =>
        !search || user.fullName.toLowerCase().includes(search) || user.email.includes(search),
    )
    .filter((user) => !query.role || user.role === query.role)
    .filter((user) => query.active === undefined || user.active === query.active);

  const sorted = sortBy(filtered, query.sort, (user, field) => {
    switch (field) {
      case "fullName":
        return user.fullName.toLowerCase();
      case "email":
        return user.email;
      case "lastLoginAt":
        return user.lastLoginAt?.getTime() ?? null;
      default:
        return user.createdAt.getTime();
    }
  });

  const page = paginate(sorted, query.page, query.pageSize);
  return { data: page.data.map(toPublicUser), meta: page.meta };
}

// O usuário criado entra com a senha definida pelo admin e troca no primeiro login.
export async function createUser(
  actorId: string,
  input: { email: string; fullName: string; role: RoleCode; password: string },
) {
  const user = await insertUser({ ...input, mustChangePassword: true });
  recordAudit({
    actorId,
    action: "user.created",
    targetType: "user",
    targetId: user.id,
    data: { email: user.email, role: user.role },
  });
  return toPublicUser(user);
}

export function updateUser(
  actorId: string,
  id: string,
  patch: { fullName?: string; role?: RoleCode; active?: boolean },
) {
  const user = getUserRecord(id);
  const losesAdmin =
    user.role === "admin" &&
    user.active &&
    ((patch.role !== undefined && patch.role !== "admin") || patch.active === false);

  // O admin não tira o próprio acesso: sem essa trava, um clique errado tranca a pessoa para fora.
  // Isso também garante que sempre sobra ao menos um admin ativo: quem chama já é um.
  if (id === actorId && losesAdmin) {
    throw new ApiProblem(
      409,
      "SELF_LOCKOUT",
      "Você não pode desativar nem remover o próprio acesso de admin.",
    );
  }

  if (patch.fullName !== undefined && patch.fullName.trim() !== user.fullName) {
    const from = user.fullName;
    user.fullName = patch.fullName.trim();
    recordAudit({
      actorId,
      action: "user.updated",
      targetType: "user",
      targetId: id,
      data: { from, to: user.fullName },
    });
  }
  if (patch.role !== undefined && patch.role !== user.role) {
    const from = user.role;
    user.role = patch.role;
    recordAudit({
      actorId,
      action: "user.roleChanged",
      targetType: "user",
      targetId: id,
      data: { from, to: patch.role },
    });
  }
  if (patch.active !== undefined && patch.active !== user.active) {
    user.active = patch.active;
    recordAudit({
      actorId,
      action: patch.active ? "user.activated" : "user.deactivated",
      targetType: "user",
      targetId: id,
    });
  }

  user.updatedAt = new Date();
  return toPublicUser(user);
}

// Gera uma senha temporária, obriga a troca no próximo login e derruba as sessões abertas do usuário.
// A senha é devolvida uma única vez: o servidor só guarda o hash.
export async function resetPassword(actorId: string, id: string) {
  const user = getUserRecord(id);
  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.sessionVersion += 1;
  user.updatedAt = new Date();
  recordAudit({ actorId, action: "user.passwordReset", targetType: "user", targetId: id });
  return { temporaryPassword };
}

// --- Próprio usuário ------------------------------------------------------------------------

export function updateOwnProfile(userId: string, input: { fullName: string }) {
  return updateUser(userId, userId, { fullName: input.fullName });
}

// Derruba as outras sessões do usuário. Quem trocou recebe um token novo (o handler reemite o cookie).
export async function changeOwnPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
) {
  const user = getUserRecord(userId);

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ApiProblem(422, "INVALID_CURRENT_PASSWORD", "A senha atual não confere.", {
      errors: [{ field: "currentPassword", message: "A senha atual não confere." }],
    });
  }
  if (input.currentPassword === input.newPassword) {
    throw new ApiProblem(422, "SAME_PASSWORD", "A nova senha precisa ser diferente da atual.", {
      errors: [{ field: "newPassword", message: "A nova senha precisa ser diferente da atual." }],
    });
  }

  user.passwordHash = await hashPassword(input.newPassword);
  user.mustChangePassword = false;
  user.sessionVersion += 1;
  user.updatedAt = new Date();
  recordAudit({
    actorId: userId,
    action: "user.passwordChanged",
    targetType: "user",
    targetId: userId,
  });
}

// --- Números para o dashboard ------------------------------------------------------------------

export function getUserStats() {
  const users = [...store.users.values()];
  const active = users.filter((user) => user.active);
  return {
    total: users.length,
    active: active.length,
    inactive: users.length - active.length,
    pendingPasswordChange: active.filter((user) => user.mustChangePassword).length,
    byRole: (["admin", "user"] as const).map((role) => ({
      role,
      count: users.filter((user) => user.role === role).length,
    })),
    recentLogins: users
      .filter((user) => user.lastLoginAt)
      .sort((a, b) => b.lastLoginAt!.getTime() - a.lastLoginAt!.getTime())
      .slice(0, 5)
      .map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        lastLoginAt: user.lastLoginAt!.toISOString(),
      })),
  };
}
