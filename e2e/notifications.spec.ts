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
  await expect(page.getByRole("button", { name: "Notificações", exact: true })).toBeVisible();

  await changeRole(admin, "Elisa Aviso", "Administrador");

  // Sem recarregar: o stream traz a notificação.
  await expect(page.getByRole("button", { name: "Notificações (1)" })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Notificações", exact: true })).toBeVisible();
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

test("silêncio temporário, som e volume ficam no navegador; silenciado, a notificação continua", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Gilda Silencio");
  const { page } = person;

  const dialog = page.getByRole("dialog", { name: "Notificações" });
  const openSettings = async () => {
    await openProfileMenu(page);
    await page.getByRole("menuitem", { name: "Notificações" }).click();
  };
  await openSettings();
  await dialog.getByRole("combobox", { name: "Silêncio temporário" }).click();
  await page.getByRole("option", { name: "1 hora" }).click();
  await dialog.getByRole("combobox", { name: "Som" }).click();
  await page.getByRole("option", { name: "Sino" }).click();
  await dialog.getByRole("slider", { name: "Volume" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("switch", { name: "Silenciar notificações" })).toBeChecked();
  await expect(dialog.getByText(/^Silenciado até /)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.reload();
  await openSettings();
  await expect(dialog.getByRole("switch", { name: "Silenciar notificações" })).toBeChecked();
  await expect(dialog.getByRole("combobox", { name: "Som" })).toHaveText("Sino");
  await expect(dialog.getByText("60%")).toBeVisible();
  await page.keyboard.press("Escape");

  await changeRole(admin, "Gilda Silencio", "Administrador");
  await expect.poll(() => shownNotifications(page)).toHaveLength(1);

  await openSettings();
  await dialog.getByRole("switch", { name: "Silenciar notificações" }).click();
  await expect(dialog.getByRole("switch", { name: "Silenciar notificações" })).not.toBeChecked();
});

test("sininho: painel com as notificações, marca como não lida e marca todas como lidas", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Gabi Lista");
  const { page } = person;
  await changeRole(admin, "Gabi Lista", "Administrador");
  await changeRole(admin, "Gabi Lista", "Usuário");
  await expect(page.getByRole("button", { name: "Notificações (2)" })).toBeVisible();

  await page.getByRole("button", { name: "Notificações (2)" }).click();
  const panel = page.getByRole("dialog", { name: "Painel de notificações" });
  await expect(panel.getByRole("button", { name: /Agora você é Usuário/ })).toBeVisible();

  await panel.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await expect(page.getByRole("button", { name: "Notificações", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Marcar todas como lidas" })).toBeDisabled();

  await panel.getByRole("button", { name: "Ações de Seu cargo mudou" }).first().click();
  await page.getByRole("menuitem", { name: "Marcar como não lida" }).click();
  await expect(page.getByRole("button", { name: "Notificações (1)" })).toBeVisible();

  // A lupa abre a busca, no título e no texto.
  await panel.getByRole("button", { name: "Buscar notificações" }).click();
  const search = page.getByRole("dialog", { name: "Buscar notificações" });
  await search.getByRole("searchbox", { name: "Buscar notificações" }).fill("usuário");
  await expect(search.getByRole("button", { name: /Agora você é Usuário/ })).toBeVisible();
  await expect(search.getByRole("button", { name: /Agora você é Administrador/ })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // A engrenagem abre as mesmas configurações do menu do perfil.
  await page.getByRole("button", { name: "Notificações (1)" }).click();
  await panel.getByRole("button", { name: "Configurações de notificação" }).click();
  await expect(page.getByRole("dialog", { name: "Notificações" })).toBeVisible();
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

test("menu da notificação no painel: arquivar; e silenciar os avisos", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Karla Menu");
  const { page } = person;
  await changeRole(admin, "Karla Menu", "Administrador");
  await page.getByRole("button", { name: "Notificações (1)" }).click();
  const panel = page.getByRole("dialog", { name: "Painel de notificações" });

  await panel.getByRole("button", { name: "Ações de Seu cargo mudou" }).click();
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await expect(panel.getByRole("button", { name: /Seu cargo mudou/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Notificações", exact: true })).toBeVisible();

  // A arquivada aparece na busca, na pasta Arquivadas, e volta pelo menu.
  await panel.getByRole("button", { name: "Buscar notificações" }).click();
  const search = page.getByRole("dialog", { name: "Buscar notificações" });
  await search.getByRole("button", { name: "Arquivadas" }).click();
  await search.getByRole("button", { name: "Ações de Seu cargo mudou" }).click();
  await page.getByRole("menuitem", { name: "Desarquivar" }).click();
  await expect(search.getByText("Nenhuma notificação arquivada")).toBeVisible();
  await page.keyboard.press("Escape");

  await changeRole(admin, "Karla Menu", "Usuário");
  await page.getByRole("button", { name: "Notificações (2)" }).click();
  await panel.getByRole("button", { name: "Ações de Seu cargo mudou" }).first().click();
  await page.getByRole("menuitem", { name: "Silenciar avisos" }).click();
  await page.getByRole("menuitem", { name: "8 horas" }).click();
  await expect(panel.getByText(/Avisos silenciados até/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => ((window as unknown as { __shown: unknown[] }).__shown.length = 0));

  await changeRole(admin, "Karla Menu", "Administrador");
  await expect(page.getByRole("button", { name: "Notificações (3)" })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await shownNotifications(page)).toEqual([]);
});
