import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

test("no celular, a sidebar vira barra inferior", async ({ page }) => {
  await loginAsAdmin(page);
  const bottomNav = page.getByRole("navigation", { name: "Navegação" });
  await expect(bottomNav).toBeVisible();
  await expect(page.getByRole("button", { name: "Controle do menu lateral" })).toBeHidden();

  await bottomNav.getByRole("link", { name: "Usuários" }).click();
  await expect(page).toHaveURL("/users");
  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();

  await bottomNav.getByRole("button", { name: /Menu do perfil/ }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");
});

test("no celular, nenhuma tela rola na horizontal", async ({ page }) => {
  await loginAsAdmin(page);
  for (const path of ["/", "/users", "/profile"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBe(0);
  }
});

test("no celular, a lista vira cards: ordena pelo select e abre o drawer em tela cheia", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/users");

  // A tabela fica escondida; o card tem os rótulos das colunas.
  await expect(page.getByRole("table")).toBeHidden();
  const card = page.getByRole("button", { name: "Abrir Administrador" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Cargo");

  await page.getByRole("combobox", { name: "Ordenar por" }).click();
  await page.getByRole("option", { name: "Nome (decrescente)" }).click();
  await expect(page).toHaveURL(/sort=-fullName/);

  await card.click();
  const drawer = page.getByRole("dialog", { name: "Administrador" });
  await expect(drawer).toBeVisible();
  const box = await drawer.boundingBox();
  expect(box?.width).toBe(390);
});
