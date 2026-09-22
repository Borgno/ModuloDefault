import { expect, test } from "@playwright/test";
import { login, loginAsAdmin, USER } from "./helpers";

test("admin vê os números de usuários; o card de último acesso leva ao drawer", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Visão geral do sistema.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Usuários por cargo" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Administrador" })).toBeVisible();

  const recent = page.getByRole("heading", { name: "Últimos acessos" }).locator("..");
  await recent.getByRole("link", { name: /Administrador/ }).click();
  await expect(page).toHaveURL(/\/users\?userId=/);
  await expect(page.getByRole("dialog", { name: "Administrador" })).toBeVisible();
});

test("usuário comum vê o resumo do próprio acesso, sem os números do sistema", async ({ page }) => {
  await login(page, USER.email, USER.password);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Resumo do seu acesso.")).toBeVisible();
  await expect(page.getByText("Conta criada em")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Usuários por cargo" })).toHaveCount(0);
});
