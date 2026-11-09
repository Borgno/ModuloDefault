import type { Session } from "./services/auth/session.service";
import type { PublicUser } from "./services/users/users.service";

// Tipo do Context do Hono em todo o servidor.
export type HonoEnv = {
  Variables: {
    // Usuário da sessão, preenchido pelo requireAuth.
    user: PublicUser;
    // Sessão de login do cookie, preenchida pelo requireAuth.
    session: Session;
  };
};
