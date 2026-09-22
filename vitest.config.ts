import { defineConfig } from "vitest/config";

// Config separada do vite.config.ts: o plugin do React Router não roda dentro do Vitest.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["app/**/*.test.{ts,tsx}", "server/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
    env: {
      NODE_ENV: "test",
      SESSION_SECRET: "test-secret-with-at-least-32-characters",
      SEED_PASSWORD: "seed-password",
    },
  },
});
