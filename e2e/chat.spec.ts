import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { loginAsAdmin, newPerson, openProfileMenu, shownNotifications } from "./helpers";

// A pessoa de cada teste usa a Notification falsa e a janela sem foco (helpers.ts): sem foco, o app
// notifica, e a conversa aberta só é lida depois do primeiro clique.

async function startChat(page: Page, name: string) {
  await page.goto("/chat");
  await page.getByRole("button", { name: "Nova conversa" }).click();
  await page
    .getByRole("dialog", { name: "Nova conversa" })
    .getByRole("button", { name: new RegExp(name) })
    .click();
  await expect(page.getByRole("region", { name: `Conversa com ${name}` })).toBeVisible();
}

async function startGroup(page: Page, groupName: string, members: string[]) {
  await page.goto("/chat");
  await page.getByRole("button", { name: "Nova conversa" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova conversa" });
  await dialog.getByRole("button", { name: "Grupo", exact: true }).click();
  await dialog.getByLabel("Nome do grupo").fill(groupName);
  for (const member of members) {
    await dialog.getByRole("button", { name: new RegExp(member) }).click();
  }
  await dialog.getByRole("button", { name: "Criar grupo" }).click();
  await expect(page.getByRole("region", { name: `Conversa com ${groupName}` })).toBeVisible();
}

async function send(page: Page, text: string) {
  const box = page.getByRole("textbox", { name: "Mensagem" });
  await box.fill(text);
  await box.press("Enter");
  await expect(page.getByRole("log", { name: "Mensagens" }).getByText(text).last()).toBeVisible();
}

const conversationItem = (page: Page, name: string) =>
  page
    .getByRole("list", { name: "Conversas" })
    .getByRole("button", { name: new RegExp(`^${name}`) });

let person: { context: BrowserContext; page: Page } | null = null;
test.afterEach(async () => {
  await person?.context.close();
  person = null;
});

test("não lidas: contador, faixa ao abrir e leitura só depois do primeiro clique", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Ana Leitura");
  const { page } = person;

  await startChat(admin, "Ana Leitura");
  for (const text of ["um", "dois", "três"]) await send(admin, text);

  await expect(page.getByRole("link", { name: "Conversas (1)" })).toBeVisible();
  await page.getByRole("link", { name: "Conversas (1)" }).click();
  await expect(conversationItem(page, "Administrador")).toHaveAccessibleName(/3 não lidas/);
  await conversationItem(page, "Administrador").click();

  await expect(page.getByText("3 mensagens não lidas")).toBeVisible();
  // Aberta sem foco: continua não lida até o primeiro clique.
  await expect(page.getByRole("link", { name: "Conversas (1)" })).toBeVisible();
  await page.getByRole("log", { name: "Mensagens" }).click();
  await expect(page.getByRole("link", { name: "Conversas", exact: true })).toBeVisible();
  // A faixa fica até sair da conversa ou mandar mensagem.
  await expect(page.getByText("3 mensagens não lidas")).toBeVisible();
  await send(page, "respondi");
  await expect(page.getByText("3 mensagens não lidas")).toBeHidden();
});

test("notificação com a janela sem foco; o clique abre a conversa com o cursor no campo", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Bruno Clique");
  const { page } = person;
  await page.goto("/notifications");

  await startChat(admin, "Bruno Clique");
  await send(admin, "pode ver o relatório?");

  await expect
    .poll(() => shownNotifications(page))
    .toEqual([expect.objectContaining({ title: "Administrador", body: "pode ver o relatório?" })]);
  await page.evaluate(() =>
    (window as unknown as { __shown: { onclick: () => void }[] }).__shown[0].onclick(),
  );
  await expect(page).toHaveURL(/\/chat\?c=/);
  await expect(page.getByRole("textbox", { name: "Mensagem" })).toBeFocused();
});

test("grupo: Fulano e o texto, e um aviso a cada intervalo", async ({ page: admin, browser }) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Carla Grupo");
  const { page } = person;
  await page.goto("/notifications");

  await startGroup(admin, "Equipe Carla", ["Carla Grupo"]);
  await send(admin, "bom dia");
  await send(admin, "segunda logo depois");

  await expect
    .poll(() => shownNotifications(page))
    .toEqual([expect.objectContaining({ title: "Equipe Carla", body: "Administrador: bom dia" })]);
  await page.waitForTimeout(500);
  expect(await shownNotifications(page)).toHaveLength(1);
});

test("silenciada só avisa a menção, com Mencionou você", async ({ page: admin, browser }) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Davi Silencio");
  const { page } = person;

  await startGroup(admin, "Equipe Davi", ["Davi Silencio"]);
  await send(admin, "criei o grupo");

  await page.goto("/chat");
  await conversationItem(page, "Equipe Davi").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Silenciar" }).click();
  await page.getByRole("menuitem", { name: "Sempre" }).click();
  await expect(conversationItem(page, "Equipe Davi")).toHaveAccessibleName(/silenciada/);
  await page.goto("/notifications");
  await page.evaluate(() => ((window as unknown as { __shown: unknown[] }).__shown.length = 0));

  await send(admin, "sem menção");
  const box = admin.getByRole("textbox", { name: "Mensagem" });
  await box.fill("veja isso @Dav");
  await admin.getByRole("option", { name: "Davi Silencio" }).click();
  await box.press("Enter");

  await expect
    .poll(() => shownNotifications(page))
    .toEqual([
      expect.objectContaining({
        title: "Equipe Davi",
        body: "Mencionou você: Administrador: veja isso @Davi Silencio",
      }),
    ]);
});

test("marcar como não lida com ela aberta: só a bolinha, e só lê ao abrir de novo", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Eva Marca");
  const { page } = person;
  await startChat(admin, "Eva Marca");
  await send(admin, "oi");

  await page.goto("/chat");
  await conversationItem(page, "Administrador").click();
  await page.getByRole("log", { name: "Mensagens" }).click();
  await expect(conversationItem(page, "Administrador")).not.toHaveAccessibleName(/não lida/);

  await page.getByRole("button", { name: "Ações da conversa" }).click();
  await page.getByRole("menuitem", { name: "Marcar como não lida" }).click();
  await expect(conversationItem(page, "Administrador")).toHaveAccessibleName(
    /marcada como não lida/,
  );
  // Continua aberta e não é lida, mesmo com clique nela.
  await page.getByRole("log", { name: "Mensagens" }).click();
  await page.waitForTimeout(300);
  await expect(conversationItem(page, "Administrador")).toHaveAccessibleName(
    /marcada como não lida/,
  );
  // Abrir de novo lê.
  await conversationItem(page, "Administrador").click();
  await page.getByRole("log", { name: "Mensagens" }).click();
  await expect(conversationItem(page, "Administrador")).not.toHaveAccessibleName(/não lida/);
});

test("arquivada sai da lista e só volta ao desarquivar, mesmo com mensagem nova", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Fabio Arquivo");
  const { page } = person;
  await startChat(admin, "Fabio Arquivo");
  await send(admin, "primeira");

  await page.goto("/chat");
  await conversationItem(page, "Administrador").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await expect(conversationItem(page, "Administrador")).toBeHidden();

  await send(admin, "segunda");
  await page.waitForTimeout(500);
  await expect(conversationItem(page, "Administrador")).toBeHidden();

  await page.getByRole("button", { name: "Arquivadas" }).click();
  await conversationItem(page, "Administrador").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Desarquivar" }).click();
  await page.getByRole("button", { name: "Voltar às conversas" }).click();
  await expect(conversationItem(page, "Administrador")).toBeVisible();
});

test("Esc cancela a citação e depois fecha a conversa", async ({ page: admin, browser }) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Gil Esc");
  await startChat(admin, "Gil Esc");
  await send(admin, "citável");

  const bubble = admin.locator("[data-message-id]").filter({ hasText: "citável" });
  await bubble.hover();
  await bubble.getByRole("button", { name: "Responder" }).click();
  await expect(admin.getByText("Respondendo a você")).toBeVisible();

  await admin.keyboard.press("Escape");
  await expect(admin.getByText("Respondendo a você")).toBeHidden();
  await expect(admin.getByRole("region", { name: "Conversa com Gil Esc" })).toBeVisible();
  await admin.keyboard.press("Escape");
  await expect(admin.getByRole("region", { name: "Conversa com Gil Esc" })).toBeHidden();
});

test("reação a uma mensagem sua avisa e vira a prévia", async ({ page: admin, browser }) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Hugo Reacao");
  const { page } = person;
  await startChat(page, "Administrador");
  await send(page, "relatório pronto");
  await page.goto("/notifications");

  await admin.goto("/chat");
  await conversationItem(admin, "Hugo Reacao").click();
  const bubble = admin.locator("[data-message-id]").filter({ hasText: "relatório pronto" });
  await bubble.hover();
  await bubble.getByRole("button", { name: "Reagir" }).click();
  await admin.getByRole("button", { name: "Reagir com ❤️" }).click();

  await expect
    .poll(() => shownNotifications(page))
    .toEqual([
      expect.objectContaining({ title: "Administrador", body: "Reagiu ❤️ a: relatório pronto" }),
    ]);
  await page.goto("/chat");
  await expect(conversationItem(page, "Administrador")).toContainText(
    "Reagiu ❤️ a: relatório pronto",
  );
});

test("abre na 1ª não lida carregando as páginas antigas", async ({ page: admin, browser }) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Iris Paginas");
  const { page } = person;
  await startChat(admin, "Iris Paginas");
  const conversationId = new URL(admin.url()).searchParams.get("c");
  for (let i = 1; i <= 70; i++) {
    const res = await admin.request.post(`/api/v1/conversations/${conversationId}/messages`, {
      data: { text: `m${i}` },
    });
    expect(res.status()).toBe(201);
  }

  await page.goto(`/chat?c=${conversationId}`);
  await expect(page.getByText("70 mensagens não lidas")).toBeVisible();
  await expect(page.getByText("m1", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Descer até o fim \(70 não lidas\)/ }),
  ).toBeVisible();
});

test("configurações separadas: grupos desligados não avisam, mensagens sim", async ({
  page: admin,
  browser,
}) => {
  await loginAsAdmin(admin);
  person = await newPerson(browser, admin, "Julia Config");
  const { page } = person;
  await openProfileMenu(page);
  await page.getByRole("menuitem", { name: "Notificações" }).click();
  await page.getByRole("switch", { name: "Mostrar notificações de grupos" }).click();
  await page.keyboard.press("Escape");
  await page.goto("/notifications");

  await startGroup(admin, "Equipe Julia", ["Julia Config"]);
  await send(admin, "no grupo");
  await startChat(admin, "Julia Config");
  await send(admin, "direta");

  await expect
    .poll(() => shownNotifications(page))
    .toEqual([expect.objectContaining({ title: "Administrador", body: "direta" })]);
});
