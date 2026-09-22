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
