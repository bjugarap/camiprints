import type {
  Category,
  ColoringPage,
  PageFilters,
  PageResults,
} from "@/types/catalog";

/**
 * All catalog reads go through this interface. Two implementations exist:
 * the static seed catalog (default — runs with no infrastructure) and the
 * Prisma/Supabase one. Swapping them is a config change, not a code change.
 */
export interface CategoryWithCount extends Category {
  pageCount: number;
}

export interface CatalogRepository {
  /** Populated top-level categories only (no subcategories, no empties). */
  listCategories(): Promise<CategoryWithCount[]>;
  /** Subcategories of one parent, e.g. the animals under "animals". */
  listSubcategories(parentSlug: string): Promise<CategoryWithCount[]>;
  getCategory(slug: string): Promise<CategoryWithCount | null>;
  listPages(filters?: PageFilters): Promise<PageResults>;
  getPage(categorySlug: string, slug: string): Promise<ColoringPage | null>;
  /** Other pages in the same category, for the "More … pages" row. */
  getRelatedPages(page: ColoringPage, limit: number): Promise<ColoringPage[]>;
  /** Home rows. */
  getEasyPicks(limit: number): Promise<ColoringPage[]>;
  getNewThisWeek(limit: number): Promise<ColoringPage[]>;
}

export const DEFAULT_PER_PAGE = 24;
