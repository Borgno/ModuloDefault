import { expect, type Page } from "@playwright/test";

export const PASSWORD = "e2e-password";
export const ADMIN = { email: "admin@local.test", password: PASSWORD };
export const USER = { email: "user@local.test", password: PASSWORD };

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function loginAsAdmin(page: Page) {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL("/");
}

// E-mail único por teste: os dados ficam em memória e são compartilhados entre os testes da rodada.
export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@local.test`;
}

export async function createUser(
  page: Page,
  user: { fullName: string; email: string; password: string },
) {
  await page.goto("/users");
  await page.getByRole("button", { name: "Novo usuário" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo usuário" });
  await dialog.getByLabel("Nome").fill(user.fullName);
  await dialog.getByLabel("E-mail").fill(user.email);
  await dialog.getByLabel("Senha inicial").fill(user.password);
  await dialog.getByRole("button", { name: "Criar usuário" }).click();
  await expect(dialog).toBeHidden();
}

// O botão do perfil (sidebar ou barra inferior) abre o menu com tema, meu perfil e sair.
export const profileButton = (page: Page) => page.getByRole("button", { name: /Menu do perfil/ });

export async function openProfileMenu(page: Page) {
  await profileButton(page).click();
}

export async function logout(page: Page) {
  await openProfileMenu(page);
  await page.getByRole("menuitem", { name: "Sair" }).click();
}

export async function goToProfile(page: Page) {
  await openProfileMenu(page);
  await page.getByRole("menuitem", { name: "Meu perfil" }).click();
}
