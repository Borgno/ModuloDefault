import { expect, test } from "@playwright/test";
import {
  USER,
  createUser,
  goToProfile,
  login,
  loginAsAdmin,
  logout,
  profileButton,
  uniqueEmail,
} from "./helpers";

test("admin cria usuário e o e-mail repetido aparece no campo", async ({ page }) => {
  await loginAsAdmin(page);
  const email = uniqueEmail("ana");
  await createUser(page, { fullName: "Ana Teste", email, password: "inicial-123" });
  await expect(page.getByText("Usuário criado")).toBeVisible();
  await expect(page.getByRole("row", { name: /Ana Teste/ })).toBeVisible();

  await page.getByRole("button", { name: "Novo usuário" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo usuário" });
  await dialog.getByLabel("Nome").fill("Outra Ana");
  await dialog.getByLabel("E-mail").fill(email.toUpperCase());
  await dialog.getByLabel("Senha inicial").fill("inicial-123");
  await dialog.getByRole("button", { name: "Criar usuário" }).click();
  await expect(dialog.getByText("Já existe um usuário com este e-mail.")).toBeVisible();
});

test("drawer: trocar role aparece no histórico, e Esc fecha", async ({ page }) => {
  await loginAsAdmin(page);
  await createUser(page, {
    fullName: "Bruno Role",
    email: uniqueEmail("bruno"),
    password: "inicial-123",
  });

  await page.getByRole("row", { name: /Bruno Role/ }).click();
  const drawer = page.getByRole("dialog", { name: "Bruno Role" });
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/userId=/);

  await drawer.getByRole("combobox", { name: "Cargo" }).click();
  await page.getByRole("option", { name: "Administrador" }).click();
  await drawer.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas")).toBeVisible();
  await expect(drawer.getByRole("list", { name: "Histórico" })).toContainText("Cargo alterado");
  await expect(drawer.getByRole("list", { name: "Histórico" })).toContainText(
    "Usuário para Administrador",
  );

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page).not.toHaveURL(/userId=/);
});

test("reset de senha: a pessoa entra com a temporária e é obrigada a trocar", async ({ page }) => {
  await loginAsAdmin(page);
  const email = uniqueEmail("carla");
  await createUser(page, { fullName: "Carla Reset", email, password: "inicial-123" });

  await page.getByRole("row", { name: /Carla Reset/ }).click();
  const drawer = page.getByRole("dialog", { name: "Carla Reset" });
  await drawer.getByRole("button", { name: "Resetar senha" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Resetar senha" }).click();
  const temporary = (await page.getByTestId("temporary-password").textContent())!.trim();
  expect(temporary).toHaveLength(12);
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(drawer.getByRole("list", { name: "Histórico" })).toContainText("Senha resetada");

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await logout(page);
  await login(page, email, temporary);
  await expect(page).toHaveURL("/change-password");

  // Com a troca pendente, o app não abre.
  await page.goto("/");
  await expect(page).toHaveURL("/change-password");

  await page.getByLabel("Senha atual").fill(temporary);
  await page.getByLabel("Nova senha", { exact: true }).fill("nova-senha-123");
  await page.getByLabel("Confirme a nova senha").fill("nova-senha-123");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(profileButton(page)).toContainText("Carla Reset");
});

test("desativar derruba a sessão aberta da pessoa em outro navegador", async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page);
  const email = uniqueEmail("davi");
  await createUser(page, { fullName: "Davi Ativo", email, password: "inicial-123" });

  // A pessoa entra em outro navegador e troca a senha inicial.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, email, "inicial-123");
  await otherPage.getByLabel("Senha atual").fill("inicial-123");
  await otherPage.getByLabel("Nova senha", { exact: true }).fill("nova-senha-123");
  await otherPage.getByLabel("Confirme a nova senha").fill("nova-senha-123");
  await otherPage.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(otherPage).toHaveURL("/");

  await page.getByRole("row", { name: /Davi Ativo/ }).click();
  await page
    .getByRole("dialog", { name: "Davi Ativo" })
    .getByRole("button", { name: "Desativar" })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Desativar" }).click();
  // O mesmo texto também entra no histórico do drawer: confere o toast.
  await expect(
    page.getByRole("region", { name: /Notifications/ }).getByText("Usuário desativado"),
  ).toBeVisible();

  // A próxima ação da pessoa (abrir o perfil) recebe 401 e volta para o login.
  await goToProfile(otherPage);
  await expect(otherPage).toHaveURL(/\/login/);
  await other.close();
});

test("usuário comum não vê nem acessa a gestão de usuários", async ({ page }) => {
  await login(page, USER.email, USER.password);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0);

  await page.goto("/users");
  await expect(page).toHaveURL("/");

  const res = await page.request.get("/api/v1/users");
  expect(res.status()).toBe(403);
  expect(res.headers()["content-type"]).toContain("application/problem+json");
});

test("perfil: trocar o próprio nome atualiza a sidebar", async ({ page }) => {
  await login(page, USER.email, USER.password);
  await goToProfile(page);
  await page.getByLabel("Nome").fill("Usuário Renomeado");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Nome atualizado")).toBeVisible();
  await expect(profileButton(page)).toContainText("Usuário Renomeado");
});

test("a busca filtra a lista pela API e fica na URL", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/users");
  await expect(page.getByRole("row", { name: /Administrador/ })).toBeVisible();

  // Busca pelo e-mail: outro teste da rodada renomeia o usuário comum.
  await page.getByRole("searchbox", { name: "Buscar por nome ou e-mail" }).fill("user@local");
  await expect(page).toHaveURL(/search=user%40local|search=user@local/);
  await expect(page.getByRole("row", { name: /Abrir/ })).toHaveCount(1);
  await expect(page.getByRole("row", { name: "Abrir Administrador" })).toHaveCount(0);

  // O termo sobrevive ao reload.
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Buscar por nome ou e-mail" })).toHaveValue(
    "user@local",
  );
});

test("todo select tem busca: filtra as opções e escolhe", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/users");
  await page.getByRole("button", { name: "Novo usuário" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo usuário" });

  await dialog.getByRole("combobox", { name: "Cargo" }).click();
  await page.getByRole("combobox", { name: "Buscar cargo..." }).fill("adm");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.getByRole("option", { name: "Administrador" }).click();
  await expect(dialog.getByRole("combobox", { name: "Cargo" })).toHaveText("Administrador");

  const email = uniqueEmail("gabi");
  await dialog.getByLabel("Nome").fill("Gabi Admin");
  await dialog.getByLabel("E-mail").fill(email);
  await dialog.getByLabel("Senha inicial").fill("inicial-123");
  await dialog.getByRole("button", { name: "Criar usuário" }).click();
  await expect(dialog).toBeHidden();

  // O filtro da lista também é pesquisável.
  await page.getByRole("combobox", { name: "Filtrar por cargo" }).click();
  await page.getByRole("combobox", { name: "Buscar cargo..." }).fill("admin");
  await page.getByRole("option", { name: "Administrador" }).click();
  await expect(page).toHaveURL(/role=admin/);
  await expect(page.getByRole("row", { name: "Abrir Gabi Admin" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Usuário Comum|Usuário Renomeado/ })).toHaveCount(0);
});
