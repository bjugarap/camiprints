import {
  AGE_RANGE_LABELS,
  AGE_RANGES,
  DETAIL_LEVEL_LABELS,
  DETAIL_LEVELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  ORIENTATION_LABELS,
  ORIENTATIONS,
  type PageFilters,
} from "@/types/catalog";

/**
 * The four listing filters (difficulty, age range, detail level,
 * orientation), shared by the desktop pills, the tablet/mobile drawer and
 * the removable-chip row.
 */
export interface FilterDefinition {
  key: "difficulty" | "ageRange" | "detailLevel" | "orientation";
  /** Pill label when nothing is selected. */
  label: string;
  /** "Any …" clear-option label. */
  anyLabel: string;
  options: { value: string; label: string }[];
}

export const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    key: "difficulty",
    label: "Difficulty",
    anyLabel: "Any difficulty",
    options: DIFFICULTIES.map((value) => ({
      value,
      label: DIFFICULTY_LABELS[value],
    })),
  },
  {
    key: "ageRange",
    label: "Age range",
    anyLabel: "Any age",
    options: AGE_RANGES.map((value) => ({
      value,
      label: AGE_RANGE_LABELS[value],
    })),
  },
  {
    key: "detailLevel",
    label: "Detail level",
    anyLabel: "Any detail level",
    options: DETAIL_LEVELS.map((value) => ({
      value,
      label: DETAIL_LEVEL_LABELS[value],
    })),
  },
  {
    key: "orientation",
    label: "Orientation",
    anyLabel: "Any orientation",
    options: ORIENTATIONS.map((value) => ({
      value,
      label: ORIENTATION_LABELS[value],
    })),
  },
];

export function selectedLabel(
  definition: FilterDefinition,
  filters: PageFilters,
): string | undefined {
  const value = filters[definition.key];
  return definition.options.find((option) => option.value === value)?.label;
}
