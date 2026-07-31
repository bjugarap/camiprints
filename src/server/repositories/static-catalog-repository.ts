import { seedCategories, seedPages } from "@/server/data/seed-data";
import type { ColoringPage, PageFilters, PageResults } from "@/types/catalog";

import {
  DEFAULT_PER_PAGE,
  type CatalogRepository,
  type CategoryWithCount,
} from "./catalog-repository";

/**
 * In-memory catalog over the seed data. This is the default data source so
 * the whole site runs (and is reviewable) before any database exists; the
 * Prisma implementation answers the same interface from Supabase.
 */
export class StaticCatalogRepository implements CatalogRepository {
  private readonly categories = seedCategories;
  private readonly pages = seedPages;

  private withCount = (category: (typeof seedCategories)[number]): CategoryWithCount => {
    // A parent's count includes its subcategories' pages.
    const familySlugs = new Set([
      category.slug,
      ...this.categories
        .filter((c) => c.parentSlug === category.slug)
        .map((c) => c.slug),
    ]);
    return {
      ...category,
      pageCount: this.pages.filter((p) => familySlugs.has(p.categorySlug)).length,
    };
  };

  async listCategories(): Promise<CategoryWithCount[]> {
    return [...this.categories]
      .filter((category) => category.parentSlug === null)
      .sort((a, b) => a.order - b.order)
      .map(this.withCount);
  }

  async listSubcategories(parentSlug: string): Promise<CategoryWithCount[]> {
    return [...this.categories]
      .filter((category) => category.parentSlug === parentSlug)
      .sort((a, b) => a.order - b.order)
      .map(this.withCount);
  }

  async getCategory(slug: string): Promise<CategoryWithCount | null> {
    const category = this.categories.find((c) => c.slug === slug);
    return category ? this.withCount(category) : null;
  }

  async listPages(filters: PageFilters = {}): Promise<PageResults> {
    const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
    const currentPage = Math.max(1, filters.page ?? 1);

    let results = this.pages.filter((page) => {
      if (filters.category && page.categorySlug !== filters.category) return false;
      if (filters.difficulty && page.difficulty !== filters.difficulty) return false;
      if (filters.ageRange && page.ageRange !== filters.ageRange) return false;
      if (filters.detailLevel && page.detailLevel !== filters.detailLevel) return false;
      if (filters.orientation && page.orientation !== filters.orientation) return false;
      if (filters.q) {
        const q = filters.q.trim().toLowerCase();
        if (
          q &&
          !page.title.toLowerCase().includes(q) &&
          !page.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    results = this.sort(results, filters.sort);

    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const start = (currentPage - 1) * perPage;

    return {
      pages: results.slice(start, start + perPage),
      total,
      page: currentPage,
      perPage,
      totalPages,
    };
  }

  async getPage(categorySlug: string, slug: string): Promise<ColoringPage | null> {
    return (
      this.pages.find(
        (p) => p.categorySlug === categorySlug && p.slug === slug,
      ) ?? null
    );
  }

  async getRelatedPages(page: ColoringPage, limit: number): Promise<ColoringPage[]> {
    return this.pages
      .filter((p) => p.categorySlug === page.categorySlug && p.slug !== page.slug)
      .slice(0, limit);
  }

  async getEasyPicks(limit: number): Promise<ColoringPage[]> {
    return this.pages.filter((p) => p.isEasyPick).slice(0, limit);
  }

  async getNewThisWeek(limit: number): Promise<ColoringPage[]> {
    return [...this.pages]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, limit);
  }

  private sort(pages: ColoringPage[], sort: PageFilters["sort"]): ColoringPage[] {
    switch (sort) {
      case "newest":
        return [...pages].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      case "az":
        return [...pages].sort((a, b) => a.title.localeCompare(b.title));
      case "popular":
      default:
        // Popularity signals arrive with analytics; catalog order stands in.
        return pages;
    }
  }
}
