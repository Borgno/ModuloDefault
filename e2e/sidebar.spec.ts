import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

async function chooseMode(page: Page, label: string) {
  await page.getByRole("button", { name: "Controle do menu lateral" }).click();
  await page.getByRole("menuitemradio", { name: label }).click();
}

// O título de seção ("PRINCIPAL") só aparece com a sidebar aberta.
const sectionTitle = (page: Page) => page.getByText("Principal", { exact: true });

test("sidebar: recolhida persiste no reload, e o perfil fica no topo", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(sectionTitle(page)).toBeVisible();

  await chooseMode(page, "Recolhido");
  await expect(sectionTitle(page)).toBeHidden();
  // Recolhida, os links seguem acessíveis pelo nome.
  await expect(page.getByRole("link", { name: "Usuários" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(sectionTitle(page)).toBeHidden();

  await chooseMode(page, "Expandido");
  await expect(sectionTitle(page)).toBeVisible();
});

test("sidebar: no modo hover, abre com o mouse e fecha ao sair", async ({ page }) => {
  await loginAsAdmin(page);
  await chooseMode(page, "Expandir ao passar o mouse");
  await page.mouse.move(900, 400);
  await expect(sectionTitle(page)).toBeHidden();

  await page.getByRole("link", { name: "Dashboard" }).hover();
  await expect(sectionTitle(page)).toBeVisible();

  await page.mouse.move(900, 400);
  await expect(sectionTitle(page)).toBeHidden();

  await chooseMode(page, "Expandido");
});

test("sidebar: a categoria recolhe pelo título e o estado persiste no reload", async ({ page }) => {
  await loginAsAdmin(page);
  const header = page.getByRole("button", { name: "Administração" });
  await expect(header).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Usuários" })).toBeVisible();

  await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("button", { name: "Administração" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  // Com a sidebar recolhida, a categoria ocultada continua oculta.
  await chooseMode(page, "Recolhido");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0);
  await chooseMode(page, "Expandido");

  await page.getByRole("button", { name: "Administração" }).click();
  await expect(page.getByRole("link", { name: "Usuários" })).toBeVisible();
});
