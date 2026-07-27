/**
 * Catalog domain types. Filter values (difficulty, age range, detail level,
 * orientation) are stable slugs — they appear in URLs, so renaming them is a
 * breaking change. Display labels live beside them.
 */
export const DIFFICULTIES = ["easy", "medium", "detailed"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  detailed: "Detailed",
};

export const AGE_RANGES = ["3-5", "6-8", "9-plus"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];
export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "3-5": "Ages 3–5",
  "6-8": "Ages 6–8",
  "9-plus": "Ages 9+",
};

export const DETAIL_LEVELS = ["large-spaces", "balanced", "fine-detail"] as const;
export type DetailLevel = (typeof DETAIL_LEVELS)[number];
export const DETAIL_LEVEL_LABELS: Record<DetailLevel, string> = {
  "large-spaces": "Large spaces",
  balanced: "Balanced",
  "fine-detail": "Fine detail",
};

export const ORIENTATIONS = ["portrait", "landscape"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];
export const ORIENTATION_LABELS: Record<Orientation, string> = {
  portrait: "Portrait",
  landscape: "Landscape",
};

export const PAPER_LABEL = "US Letter — A4 also fits";

export interface Category {
  slug: string;
  name: string;
  /** Tint key for the tile thumbnail background; null = neutral. */
  tint: string | null;
  /** Real asset field — null renders the marked placeholder. */
  thumbnailUrl: string | null;
  /** Featured categories appear on home and in the listing picture strip. */
  featured: boolean;
  order: number;
}

export interface ColoringPage {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  difficulty: Difficulty;
  ageRange: AgeRange;
  detailLevel: DetailLevel;
  orientation: Orientation;
  /** Real asset fields — null renders the marked placeholder. */
  thumbnailUrl: string | null;
  previewUrl: string | null;
  pngUrl: string | null;
  pdfUrl: string | null;
  /** Home "Easy pages for younger children" row. */
  isEasyPick: boolean;
  publishedAt: string; // ISO date
}

export type SortOrder = "popular" | "newest" | "az";

export interface PageFilters {
  category?: string;
  difficulty?: Difficulty;
  ageRange?: AgeRange;
  detailLevel?: DetailLevel;
  orientation?: Orientation;
  q?: string;
  sort?: SortOrder;
  page?: number;
  perPage?: number;
}

export interface PageResults {
  pages: ColoringPage[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
