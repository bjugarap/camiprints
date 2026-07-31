import { describe, expect, it } from "vitest";

import { StaticCatalogRepository } from "@/server/repositories/static-catalog-repository";

/**
 * The catalog is now fed by the generated library (published.json), so
 * these tests assert structure and invariants, not hand-counted fixtures.
 */
const repo = new StaticCatalogRepository();

describe("StaticCatalogRepository", () => {
  it("lists only populated top-level categories, launch categories first", async () => {
    const categories = await repo.listCategories();
    expect(categories.length).toBeGreaterThanOrEqual(12);
    expect(categories.every((c) => c.pageCount > 0)).toBe(true);
    expect(categories.every((c) => c.parentSlug === null)).toBe(true);
    // Launch order leads: video-games first, superheroes 11th, then the
    // populated originals (animals).
    expect(categories[0].slug).toBe("video-games");
    expect(categories.map((c) => c.slug)).toContain("animals");
    const animals = categories.find((c) => c.slug === "animals");
    const superheroes = categories.find((c) => c.slug === "superheroes");
    expect(superheroes!.order).toBeLessThan(animals!.order);
    // Empty legacy categories are hidden until they get pages.
    expect(categories.map((c) => c.slug)).not.toContain("ocean");
  });

  it("animals rolls up its subcategory page counts", async () => {
    const subcategories = await repo.listSubcategories("animals");
    expect(subcategories.map((c) => c.slug).sort()).toEqual([
      "elephant",
      "lion",
      "sea-turtle",
      "tiger",
    ]);
    const animals = (await repo.listCategories()).find(
      (c) => c.slug === "animals",
    );
    const childTotal = subcategories.reduce((sum, c) => sum + c.pageCount, 0);
    expect(animals!.pageCount).toBe(childTotal);
    expect(childTotal).toBeGreaterThanOrEqual(32);
  });

  it("filters pages by category", async () => {
    const { pages, total } = await repo.listPages({ category: "dinosaurs" });
    expect(total).toBeGreaterThanOrEqual(20);
    expect(pages.every((p) => p.categorySlug === "dinosaurs")).toBe(true);
  });

  it("combines filters the way the listing filter bar does", async () => {
    const { pages } = await repo.listPages({
      category: "dinosaurs",
      difficulty: "easy",
      ageRange: "3-5",
    });
    expect(pages.length).toBeGreaterThan(0);
    expect(
      pages.every((p) => p.difficulty === "easy" && p.ageRange === "3-5"),
    ).toBe(true);
  });

  it("searches within a category", async () => {
    const { pages, total } = await repo.listPages({
      category: "dinosaurs",
      q: "t-rex",
    });
    expect(total).toBeGreaterThanOrEqual(1);
    expect(pages.some((p) => p.slug === "happy-t-rex")).toBe(true);
  });

  it("paginates with a stable total", async () => {
    const first = await repo.listPages({ perPage: 10, page: 1 });
    const second = await repo.listPages({ perPage: 10, page: 2 });
    expect(first.pages).toHaveLength(10);
    expect(first.total).toBe(second.total);
    expect(first.pages[0].slug).not.toBe(second.pages[0].slug);
    expect(first.totalPages).toBe(Math.ceil(first.total / 10));
  });

  it("sorts alphabetically when asked", async () => {
    const { pages } = await repo.listPages({ sort: "az", perPage: 5 });
    const titles = pages.map((p) => p.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it("finds a page by category and slug, and misses cleanly", async () => {
    const page = await repo.getPage("dinosaurs", "happy-t-rex");
    expect(page?.title).toBe("Happy T-Rex");
    // Published pages carry real assets.
    expect(page?.pngUrl).toMatch(/^\/coloring-pages\/dinosaurs\//);
    expect(page?.thumbnailUrl).toContain("-thumb.webp");
    expect(await repo.getPage("summer", "happy-t-rex")).toBeNull();
  });

  it("relates pages within the same category, excluding the page itself", async () => {
    const page = await repo.getPage("dinosaurs", "happy-t-rex");
    const related = await repo.getRelatedPages(page!, 5);
    expect(related).toHaveLength(5);
    expect(related.every((p) => p.categorySlug === "dinosaurs")).toBe(true);
    expect(related.some((p) => p.slug === "happy-t-rex")).toBe(false);
  });

  it("serves the home rows from the published library", async () => {
    const easy = await repo.getEasyPicks(5);
    expect(easy.length).toBe(5);
    // Easy picks are the toddler-complexity pages.
    expect(easy.every((p) => p.isEasyPick && p.difficulty === "easy")).toBe(
      true,
    );

    const fresh = await repo.getNewThisWeek(5);
    expect(fresh[0].publishedAt >= fresh[4].publishedAt).toBe(true);
  });
});
