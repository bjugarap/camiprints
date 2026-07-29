"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  activeFilterCount,
  SORT_LABELS,
  SORT_ORDERS,
  withFilter,
} from "@/lib/url-state";
import { Button } from "@/shared/button";
import type { PageFilters, SortOrder } from "@/types/catalog";

import {
  FILTER_DEFINITIONS,
  selectedLabel,
  type FilterDefinition,
} from "./filter-options";

/**
 * Listing filter bar (hi-fi 6a): a 48px search field that flexes, four
 * filter pills (active = accent fill, doubled by the chip row's ✕
 * affordance below), and the sort pill pushed right. On tablet/mobile the
 * four dropdowns collapse into one "Filters (n)" button opening a drawer;
 * the drawer traps focus and returns it to that button.
 */
function pillClasses(active: boolean): string {
  return cn(
    "flex h-12 cursor-pointer items-center gap-2 rounded-full px-4 text-[15.5px] whitespace-nowrap",
    active
      ? "bg-accent font-semibold text-white hover:bg-accent-hover"
      : "border-[1.5px] border-line bg-card font-medium text-ink hover:border-line-strong",
  );
}

function FilterPill({
  definition,
  filters,
}: {
  definition: FilterDefinition;
  filters: PageFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const selected = selectedLabel(definition, filters);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={pillClasses(!!selected)}>
        {selected ?? definition.label}
        <span aria-hidden className={selected ? "opacity-80" : "text-ink-40"}>
          ▾
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-52 rounded-field border border-line bg-card p-1 shadow-card">
        <DropdownMenuRadioGroup
          value={(filters[definition.key] as string) ?? ""}
          onValueChange={(value) =>
            router.push(
              withFilter(pathname, filters, {
                [definition.key]: value || undefined,
              }),
            )
          }
        >
          <DropdownMenuRadioItem
            value=""
            className="min-h-11 rounded-lg px-3 text-base"
          >
            {definition.anyLabel}
          </DropdownMenuRadioItem>
          {definition.options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="min-h-11 rounded-lg px-3 text-base"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortPill({ filters }: { filters: PageFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const sort: SortOrder = filters.sort ?? "popular";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Sort: ${SORT_LABELS[sort]}`}
        className={cn(pillClasses(false), "ml-auto")}
      >
        {SORT_LABELS[sort]}
        <span aria-hidden className="text-ink-40">
          ▾
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-52 rounded-field border border-line bg-card p-1 shadow-card"
      >
        <DropdownMenuRadioGroup
          value={sort}
          onValueChange={(value) =>
            router.push(
              withFilter(pathname, filters, { sort: value as SortOrder }),
            )
          }
        >
          {SORT_ORDERS.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="min-h-11 rounded-lg px-3 text-base"
            >
              {SORT_LABELS[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterDrawer({ filters }: { filters: PageFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const count = activeFilterCount(filters);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={pillClasses(count > 0)}
      >
        Filters{count > 0 ? ` (${count})` : ""}
        <span aria-hidden className={count > 0 ? "opacity-80" : "text-ink-40"}>
          ▾
        </span>
      </button>
      <SheetContent
        side="right"
        className="w-[320px] gap-0 overflow-y-auto bg-card p-5"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <SheetHeader className="p-0">
          <SheetTitle className="text-subsection text-ink">Filters</SheetTitle>
          <SheetDescription className="text-sm text-ink-40">
            Results update as you choose.
          </SheetDescription>
        </SheetHeader>
        {FILTER_DEFINITIONS.map((definition) => (
          <fieldset key={definition.key} className="mt-5">
            <legend className="text-sm font-semibold text-ink">
              {definition.label}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: "", label: definition.anyLabel },
                ...definition.options,
              ].map((option) => {
                const active =
                  ((filters[definition.key] as string) ?? "") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      router.push(
                        withFilter(pathname, filters, {
                          [definition.key]: option.value || undefined,
                        }),
                      )
                    }
                    className={cn(
                      "flex h-11 cursor-pointer items-center rounded-full px-[18px] text-[15px]",
                      active
                        ? "bg-accent font-semibold text-white"
                        : "border-[1.5px] border-line bg-card font-medium text-ink",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-ink">Sort</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SORT_ORDERS.map((value) => {
              const active = (filters.sort ?? "popular") === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    router.push(withFilter(pathname, filters, { sort: value }))
                  }
                  className={cn(
                    "flex h-11 cursor-pointer items-center rounded-full px-[18px] text-[15px]",
                    active
                      ? "bg-accent font-semibold text-white"
                      : "border-[1.5px] border-line bg-card font-medium text-ink",
                  )}
                >
                  {SORT_LABELS[value]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setOpen(false)}
          className="mt-6 w-full"
        >
          Done
        </Button>
      </SheetContent>
    </Sheet>
  );
}

/** The four pills + sort, with the tablet/mobile drawer fallback. */
export function FilterPills({ filters }: { filters: PageFilters }) {
  return (
    <>
      {/* Desktop: four pills + sort. */}
      <div className="hidden flex-1 items-center gap-2.5 xl:flex">
        {FILTER_DEFINITIONS.map((definition) => (
          <FilterPill
            key={definition.key}
            definition={definition}
            filters={filters}
          />
        ))}
        <SortPill filters={filters} />
      </div>

      {/* Tablet & mobile: one Filters button opening the drawer. */}
      <div className="flex flex-1 items-center justify-between gap-2.5 xl:hidden">
        <FilterDrawer filters={filters} />
        <SortPill filters={filters} />
      </div>
    </>
  );
}

export function FilterBar({
  filters,
  searchPlaceholder,
}: {
  filters: PageFilters;
  searchPlaceholder: string;
}) {
  const pathname = usePathname();

  return (
    <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
      {/* Search within results — removed in Calm Mode. */}
      <form
        action={pathname}
        role="search"
        className="min-w-[260px] flex-1 calm:hidden"
      >
        {filters.difficulty ? (
          <input type="hidden" name="difficulty" value={filters.difficulty} />
        ) : null}
        {filters.ageRange ? (
          <input type="hidden" name="age" value={filters.ageRange} />
        ) : null}
        {filters.detailLevel ? (
          <input type="hidden" name="detail" value={filters.detailLevel} />
        ) : null}
        {filters.orientation ? (
          <input type="hidden" name="orientation" value={filters.orientation} />
        ) : null}
        {filters.sort && filters.sort !== "popular" ? (
          <input type="hidden" name="sort" value={filters.sort} />
        ) : null}
        <div className="flex h-12 items-center gap-[9px] rounded-field border-[1.5px] border-line-strong bg-card px-4 focus-within:border-accent">
          <span aria-hidden className="text-[15px] text-ink-40">
            ⌕
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-40"
          />
        </div>
      </form>

      <FilterPills filters={filters} />
    </div>
  );
}
