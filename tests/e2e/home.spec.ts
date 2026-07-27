import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("renders the hero and site chrome", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Free coloring pages, made simple." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse coloring pages" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Turn a photo into a page" }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("CamiPrints");
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("calm mode", () => {
  test("toggle persists per device and removes the search field", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop-only chrome");
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: "Search pages" });
    await expect(search).toBeVisible();

    await page.getByRole("switch", { name: "Calm Mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-calm", "");
    await expect(search).toBeHidden();
    await expect(page.getByText("Calm Mode on")).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-calm", "");
    await expect(
      page.getByRole("searchbox", { name: "Search pages" }),
    ).toBeHidden();
  });
});

test.describe("focus", () => {
  test("interactive elements carry the amber focus ring", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Browse coloring pages" });
    await cta.focus();
    const outline = await cta.evaluate((el) => {
      const style = getComputedStyle(el);
      return `${style.outlineWidth} ${style.outlineColor} ${style.outlineOffset}`;
    });
    expect(outline).toBe("3px rgb(232, 163, 43) 2px");
  });
});
