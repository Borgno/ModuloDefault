import { z } from "zod";

// Em desenvolvimento as variáveis vêm do .env da raiz. Em produção vêm do ambiente do container, e o
// arquivo não existe.
try {
  process.loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Porta que o navegador acessa. Em dev é a do Vite; em produção é a do Hono, que serve SPA e API.
  PORT: z.coerce.number().int().positive().default(3000),
  // Porta do Hono em dev, atrás do proxy do Vite. Em produção não é usada.
  API_PORT: z.coerce.number().int().positive().default(3001),
  // Chave do HMAC que assina o cookie de sessão. Trocar invalida todas as sessões abertas.
  SESSION_SECRET: z.string().min(32, "use ao menos 32 caracteres"),
  // Senha dos usuários semeados na subida (admin e usuário comum). Os dados ficam em memória nesta
  // etapa, então o seed roda em todo start.
  SEED_PASSWORD: z.string().min(8, "use ao menos 8 caracteres"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(`Variáveis de ambiente inválidas:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

export const env = parsed.data;

// Em produção há um processo só (SPA e API na mesma porta); em dev o Hono fica atrás do Vite.
export const listenPort = env.NODE_ENV === "production" ? env.PORT : env.API_PORT;
