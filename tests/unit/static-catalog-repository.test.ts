import { describe, expect, it } from "vitest";

import { StaticCatalogRepository } from "@/server/repositories/static-catalog-repository";

const repo = new StaticCatalogRepository();

describe("StaticCatalogRepository", () => {
  it("lists 24 categories in order with honest page counts", async () => {
    const categories = await repo.listCategories();
    expect(categories).toHaveLength(24);
    expect(categories[0].slug).toBe("animals");
    const dinosaurs = categories.find((c) => c.slug === "dinosaurs");
    expect(dinosaurs?.pageCount).toBe(8);
    expect(categories.filter((c) => c.featured)).toHaveLength(8);
  });

  it("filters pages by category", async () => {
    const { pages, total } = await repo.listPages({ category: "dinosaurs" });
    expect(total).toBe(8);
    expect(pages.every((p) => p.categorySlug === "dinosaurs")).toBe(true);
  });

  it("combines filters the way the listing filter bar does", async () => {
    const { pages } = await repo.listPages({
      category: "dinosaurs",
      difficulty: "easy",
      ageRange: "6-8",
    });
    expect(pages.length).toBeGreaterThan(0);
    expect(
      pages.every((p) => p.difficulty === "easy" && p.ageRange === "6-8"),
    ).toBe(true);
  });

  it("searches within a category", async () => {
    const { pages, total } = await repo.listPages({
      category: "dinosaurs",
      q: "egg",
    });
    expect(total).toBe(1);
    expect(pages[0].slug).toBe("hatching-egg");
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
    const page = await repo.getPage("dinosaurs", "friendly-t-rex");
    expect(page?.title).toBe("Friendly T-Rex");
    expect(await repo.getPage("ocean", "friendly-t-rex")).toBeNull();
  });

  it("relates pages within the same category, excluding the page itself", async () => {
    const page = await repo.getPage("dinosaurs", "friendly-t-rex");
    const related = await repo.getRelatedPages(page!, 5);
    expect(related).toHaveLength(5);
    expect(related.every((p) => p.categorySlug === "dinosaurs")).toBe(true);
    expect(related.some((p) => p.slug === "friendly-t-rex")).toBe(false);
  });

  it("serves the home rows", async () => {
    const easy = await repo.getEasyPicks(5);
    expect(easy.map((p) => p.slug)).toContain("sitting-fox");
    expect(easy.every((p) => p.isEasyPick)).toBe(true);

    const fresh = await repo.getNewThisWeek(5);
    expect(fresh[0].publishedAt >= fresh[4].publishedAt).toBe(true);
  });
});
