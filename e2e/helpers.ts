import { expect, type Browser, type Page } from "@playwright/test";

export const PASSWORD = "e2e-password";
export const ADMIN = { email: "admin@local.test", password: PASSWORD };
export const USER = { email: "user@local.test", password: PASSWORD };

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(email);
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

// O navegador do teste não mostra notificação do sistema. Este script troca a Notification por uma
// que só registra o que seria mostrado, já com a permissão dada, e faz a janela parecer sem foco
// (com foco o app não notifica, como no WhatsApp Web).
export const FAKE_NOTIFICATIONS = `
  window.__shown = [];
  class FakeNotification {
    static permission = "granted";
    static requestPermission = async () => "granted";
    constructor(title, options) {
      this.title = title;
      this.options = options;
      window.__shown.push(this);
    }
    close() {}
  }
  window.Notification = FakeNotification;
  document.hasFocus = () => false;
`;

type Shown = { title: string; body: string; tag: string };
export const shownNotifications = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as { __shown: { title: string; options: { body: string; tag: string } }[] }
    ).__shown.map((n) => ({ title: n.title, body: n.options.body, tag: n.options.tag })),
  ) as Promise<Shown[]>;

// Pessoa nova, já com a senha inicial trocada, num navegador próprio.
export async function newPerson(browser: Browser, admin: Page, name: string, fake = true) {
  const email = uniqueEmail(name.toLowerCase().replace(/\W/g, ""));
  await createUser(admin, { fullName: name, email, password: "inicial-123" });
  const context = await browser.newContext();
  if (fake) await context.addInitScript(FAKE_NOTIFICATIONS);
  const page = await context.newPage();
  await login(page, email, "inicial-123");
  await page.getByLabel("Senha atual").fill("inicial-123");
  await page.getByLabel("Nova senha", { exact: true }).fill("nova-senha-123");
  await page.getByLabel("Confirme a nova senha").fill("nova-senha-123");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL("/");
  return { context, page };
}
