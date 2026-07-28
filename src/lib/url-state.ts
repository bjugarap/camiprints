import {
  AGE_RANGES,
  DETAIL_LEVELS,
  DIFFICULTIES,
  ORIENTATIONS,
  type AgeRange,
  type DetailLevel,
  type Difficulty,
  type Orientation,
  type PageFilters,
  type SortOrder,
} from "@/types/catalog";

/**
 * Filter, sort, search and page state all live in the URL so results are
 * shareable and Back behaves (handoff §State Management). This module is the
 * single translation layer between search params and PageFilters.
 */
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export const SORT_ORDERS: readonly SortOrder[] = ["popular", "newest", "az"];

export const SORT_LABELS: Record<SortOrder, string> = {
  popular: "Most popular",
  newest: "Newest first",
  az: "A to Z",
};

export function parseFilters(params: SearchParamsRecord): PageFilters {
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    difficulty: oneOf<Difficulty>(first(params.difficulty), DIFFICULTIES),
    ageRange: oneOf<AgeRange>(first(params.age), AGE_RANGES),
    detailLevel: oneOf<DetailLevel>(first(params.detail), DETAIL_LEVELS),
    orientation: oneOf<Orientation>(first(params.orientation), ORIENTATIONS),
    q: first(params.q)?.trim() || undefined,
    sort: oneOf<SortOrder>(first(params.sort), SORT_ORDERS),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * Serialise filters back to a query string. Defaults are omitted so the
 * canonical unfiltered URL stays clean.
 */
export function filtersToSearchParams(filters: PageFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.ageRange) params.set("age", filters.ageRange);
  if (filters.detailLevel) params.set("detail", filters.detailLevel);
  if (filters.orientation) params.set("orientation", filters.orientation);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort && filters.sort !== "popular") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export function filtersHref(pathname: string, filters: PageFilters): string {
  const query = filtersToSearchParams(filters).toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Change one filter; changing anything except the page resets the page. */
export function withFilter(
  pathname: string,
  filters: PageFilters,
  patch: Partial<PageFilters>,
): string {
  const next: PageFilters = { ...filters, ...patch };
  if (!("page" in patch)) next.page = 1;
  return filtersHref(pathname, next);
}

export function activeFilterCount(filters: PageFilters): number {
  return [
    filters.difficulty,
    filters.ageRange,
    filters.detailLevel,
    filters.orientation,
  ].filter(Boolean).length;
}
