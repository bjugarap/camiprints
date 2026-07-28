import type { Metadata } from "next";

import { ListingView } from "@/features/library/listing-view";
import { parseFilters, type SearchParamsRecord } from "@/lib/url-state";

export const metadata: Metadata = {
  title: "Coloring pages",
  description:
    "Browse free printable coloring pages by difficulty, age range, detail level and orientation. Every page prints in one tap.",
  alternates: { canonical: "/coloring-pages" },
};

export default async function ColoringPagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const filters = parseFilters(await searchParams);
  return <ListingView filters={filters} />;
}
