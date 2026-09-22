import type { PublicUser } from "./services/users/users.service";

// Tipo do Context do Hono em todo o servidor.
export type HonoEnv = {
  Variables: {
    // Usuário da sessão, preenchido pelo requireAuth.
    user: PublicUser;
  };
};
