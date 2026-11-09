import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// Roda contra o build de produção (SPA e API na mesma origem), como no deploy.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run build && bun run start",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      SESSION_SECRET: "e2e-secret-with-at-least-32-characters",
      SEED_PASSWORD: "e2e-password",
      // Par só do E2E, sem valor fora dele.
      VAPID_PUBLIC_KEY:
        "BJ1BVgLwITw0_FFU5rOb0MUNnIorGa-UO0jEUiirMloIaERRjqbDp7QD9tZ5P2QsNnHurZzMlwPExluJoAZCllo",
      VAPID_PRIVATE_KEY: "fdhgefuqC5yut1Z6vrq7MnylScpKQAIPK7q7MCgMZ_g",
    },
  },
});
