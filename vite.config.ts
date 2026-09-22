import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Lê o .env inteiro (prefixo vazio) só para a config. Nada daqui vai para o bundle do navegador.
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT || 3000);
  const apiPort = Number(env.API_PORT || 3001);

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      // Em dev o front roda no Vite (PORT) e a API no Hono (API_PORT). Em produção os dois dividem a
      // mesma origem, então o front sempre chama /api sem host.
      port,
      strictPort: true,
      proxy: {
        "/api": `http://127.0.0.1:${apiPort}`,
      },
    },
    preview: {
      // O build do React Router sobe o vite preview para renderizar o index.html. Em container,
      // "localhost" pode escutar em ::1 enquanto a requisição vai para 127.0.0.1; o IPv4 fixo evita isso.
      host: "127.0.0.1",
    },
  };
});
