import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { loginAsAdmin, newPerson, openProfileMenu, shownNotifications } from "./helpers";

async function changeRole(admin: Page, name: string, role: "Administrador" | "Usuário") {
  await admin.goto("/users");
  await admin.getByRole("row", { name: new RegExp(name) }).click();
  const drawer = admin.getByRole("dialog", { name });
  await drawer.getByRole("combobox", { name: "Cargo" }).click();
  await admin.getByRole("option", { name: role }).click();
  await drawer.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(admin.getByText("Alterações salvas")).toBeVisible();
}

let person: { context: BrowserContext; page: Page } | null = null;
test.afterEach(async () => {
  await person?.context.close();
  person = null;
});

test("cargo trocado por um admin chega na hora: contador, título, notificação e clique", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Elisa Aviso");
  const { page } = person;
  await expect(page.getByRole("link", { name: "Notificações", exact: true })).toBeVisible();

  await changeRole(admin, "Elisa Aviso", "Administrador");

  // Sem recarregar: o stream traz a notificação.
  await expect(page.getByRole("link", { name: "Notificações (1)" })).toBeVisible();
  await expect(page).toHaveTitle(/^\(1\) /);
  await expect
    .poll(() => shownNotifications(page))
    .toEqual([
      expect.objectContaining({ title: "Seu cargo mudou", body: "Agora você é Administrador." }),
    ]);

  // O clique na notificação abre o caminho dela e marca como lida.
  await page.evaluate(() =>
    (window as unknown as { __shown: { onclick: () => void }[] }).__shown[0].onclick(),
  );
  await expect(page).toHaveURL("/profile");
  await expect(page.getByRole("link", { name: "Notificações", exact: true })).toBeVisible();
  await expect(page).not.toHaveTitle(/^\(/);
});

test("sem prévia, a notificação diz só de quem é; a configuração fica no navegador", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Fabio Previa");
  const { page } = person;

  await openProfileMenu(page);
  await page.getByRole("menuitem", { name: "Notificações" }).click();
  const dialog = page.getByRole("dialog", { name: "Notificações" });
  await dialog.getByRole("switch", { name: "Mostrar prévias" }).click();
  await expect(dialog.getByRole("switch", { name: "Mostrar prévias" })).not.toBeChecked();
  await page.keyboard.press("Escape");

  await page.reload();
  await openProfileMenu(page);
  await page.getByRole("menuitem", { name: "Notificações" }).click();
  await expect(dialog.getByRole("switch", { name: "Mostrar prévias" })).not.toBeChecked();
  await page.keyboard.press("Escape");

  await changeRole(admin, "Fabio Previa", "Administrador");
  await expect
    .poll(() => shownNotifications(page))
    .toEqual([
      expect.objectContaining({
        title: "Nova notificação",
        body: "Notificação de Administrador",
      }),
    ]);
});

test("tela de Notificações: lista, marca como não lida e marca todas como lidas", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Gabi Lista");
  const { page } = person;
  await changeRole(admin, "Gabi Lista", "Administrador");
  await changeRole(admin, "Gabi Lista", "Usuário");
  await expect(page.getByRole("link", { name: "Notificações (2)" })).toBeVisible();

  await page.getByRole("link", { name: "Notificações (2)" }).click();
  await expect(page.getByRole("heading", { name: "Notificações" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Agora você é Usuário/ })).toBeVisible();

  await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await expect(page.getByRole("link", { name: "Notificações", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar todas como lidas" })).toBeDisabled();

  await page
    .getByRole("row", { name: /Agora você é Usuário/ })
    .getByRole("button", { name: /^Ações de/ })
    .click();
  await page.getByRole("menuitem", { name: "Marcar como não lida" }).click();
  await expect(page.getByRole("link", { name: "Notificações (1)" })).toBeVisible();

  // Filtro de status pela busca da lista.
  await page.getByPlaceholder("Buscar no título ou no texto").fill("administrador");
  await expect(page.getByRole("row", { name: /Agora você é Administrador/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Agora você é Usuário/ })).toHaveCount(0);
});

test("sem permissão, a faixa pede para ativar; bloqueada, ensina a desbloquear", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Helena Faixa", false);
  const { page } = person;
  // O Chromium do teste responde "denied" ou "default", conforme a versão e o modo headless.
  const permission = await page.evaluate(() => Notification.permission);
  if (permission === "denied") {
    await expect(page.getByText("As notificações estão bloqueadas")).toBeVisible();
  } else {
    await expect(page.getByText("Receba notificações na área de trabalho")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ativar notificações" })).toBeVisible();
  }
});

test("uma aba por navegador: a segunda mostra Usar aqui e toma o lugar da primeira", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Igor Abas");
  const first = person.page;
  const second = await person.context.newPage();
  await second.goto("/");
  await expect(second.getByRole("button", { name: "Usar aqui" })).toBeVisible();

  await second.getByRole("button", { name: "Usar aqui" }).click();
  await expect(second.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(first.getByRole("button", { name: "Usar aqui" })).toBeVisible();
});

test("menu da notificação pelo clique direito: arquivar; e silenciar os avisos", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Karla Menu");
  const { page } = person;
  await changeRole(admin, "Karla Menu", "Administrador");
  await page.getByRole("link", { name: "Notificações (1)" }).click();

  await page.getByRole("row", { name: /Seu cargo mudou/ }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await expect(page.getByRole("row", { name: /Seu cargo mudou/ })).toBeHidden();
  await expect(page.getByRole("link", { name: "Notificações", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Silenciar avisos" }).click();
  await page.getByRole("menuitem", { name: "Silenciar por" }).click();
  await page.getByRole("menuitem", { name: "8 horas" }).click();
  await expect(page.getByText(/Avisos silenciados até/)).toBeVisible();
  await page.evaluate(() => ((window as unknown as { __shown: unknown[] }).__shown.length = 0));

  await changeRole(admin, "Karla Menu", "Usuário");
  await expect(page.getByRole("link", { name: "Notificações (1)" })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await shownNotifications(page)).toEqual([]);
});
