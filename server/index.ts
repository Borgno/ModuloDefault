import { serve } from "@hono/node-server";
import { env, listenPort } from "./env";
import { createApp } from "./app";
import { seedUsers } from "./services/users/users.service";

// Dados em memória: o seed roda em todo start.
await seedUsers(env.SEED_PASSWORD);

const app = createApp({ serveClient: env.NODE_ENV === "production", logRequests: true });

// Códigos ANSI do banner. NO_COLOR desliga as cores (https://no-color.org).
const semCor = Boolean(process.env.NO_COLOR);
const ansi = (code: string) => (semCor ? "" : `\x1b[${code}m`);
const cor = {
  green: ansi("32"),
  cyan: ansi("36"),
  bold: ansi("1"),
  dim: ansi("2"),
  reset: ansi("0"),
};

// Banner no estilo do Vite, para o log do BACK casar com o do FRONT no `bun run dev`.
function banner(port: number) {
  const { green, cyan, bold, dim, reset } = cor;
  const linha = (rotulo: string, url: string) =>
    `  ${green}➜${reset}  ${bold}${rotulo.padEnd(7)}${reset} ${cyan}${url}${reset}`;

  const prontoEm = Math.round(process.uptime() * 1000);

  console.log(`\n  ${green}${bold}HONO${reset}  ${dim}ready in ${prontoEm} ms${reset}\n`);
  if (env.NODE_ENV === "production") {
    console.log(linha("Local", `http://localhost:${port}/`));
  } else {
    console.log(linha("API", `http://localhost:${port}/api/v1`));
  }
  console.log(linha("Swagger", `http://localhost:${port}/api/v1/docs`));
  console.log();
}

const server = serve({ fetch: app.fetch, port: listenPort }, (info) => banner(info.port));

// O Docker manda SIGTERM ao parar o container: fecha as conexões antes de sair.
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
