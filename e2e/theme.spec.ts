import { expect, test } from "@playwright/test";
import { loginAsAdmin, openProfileMenu } from "./helpers";

test("tema escuro pelo menu do perfil, sobrevive ao reload e é aplicado antes do React hidratar", async ({
  page,
}) => {
  await loginAsAdmin(page);

  await openProfileMenu(page);
  const darkItem = page.getByRole("menuitemcheckbox", { name: "Tema escuro" });
  await expect(darkItem).toHaveAttribute("aria-checked", "false");
  await darkItem.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  // Trocar o tema não fecha o menu.
  await expect(darkItem).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");

  // No domcontentloaded o bundle ainda não rodou: se a classe já está lá, veio do script inline.
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

  await openProfileMenu(page);
  await page.getByRole("menuitemcheckbox", { name: "Tema escuro" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
