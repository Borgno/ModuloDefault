import { serve } from "@hono/node-server";
import { env, listenPort } from "./env";
import { createApp } from "./app";
import { seedUsers } from "./services/users/users.service";

// Dados em memória: o seed roda em todo start.
await seedUsers(env.SEED_PASSWORD);

const app = createApp({ serveClient: env.NODE_ENV === "production", logRequests: true });

const server = serve({ fetch: app.fetch, port: listenPort }, (info) => {
  console.log(
    env.NODE_ENV === "production"
      ? `Servidor em http://localhost:${info.port}`
      : `API em http://localhost:${info.port} (o front abre em http://localhost:${env.PORT})`,
  );
});

// O Docker manda SIGTERM ao parar o container: fecha as conexões antes de sair.
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
