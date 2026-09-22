import { expect, test } from "@playwright/test";
import { ADMIN, logout, profileButton } from "./helpers";

test("sem sessão, a tela inicial manda para o login guardando a volta", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2F$/);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("senha errada mostra o erro da API", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
});

test("login, sessão sobrevive ao reload, e logout encerra", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(profileButton(page)).toContainText("Administrador");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(profileButton(page)).toContainText("Administrador");

  // Endereço inexistente mostra a 404 dentro do app.
  await page.goto("/nao-existe");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();

  // Com sessão, o login devolve para a tela inicial.
  await page.goto("/login");
  await expect(page).toHaveURL("/");

  await logout(page);
  await expect(page).toHaveURL("/login");

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("o botão do olho mostra e oculta a senha digitada", async ({ page }) => {
  await page.goto("/login");
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill("segredo-123");
  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("segredo-123");

  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(password).toHaveAttribute("type", "password");
});
