import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingView } from "@/features/library/listing-view";
import { parseFilters, type SearchParamsRecord } from "@/lib/url-state";
import { getCatalogRepository } from "@/server/repositories";

export async function generateStaticParams() {
  const categories = await getCatalogRepository().listCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCatalogRepository().getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} coloring pages`,
    description: `${category.pageCount} free ${category.name.toLowerCase()} coloring pages. ${category.description}`,
    alternates: { canonical: `/coloring-pages/${category.slug}` },
  };
}

export default async function CategoryListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParamsRecord>;
}) {
  const { category: slug } = await params;
  const category = await getCatalogRepository().getCategory(slug);
  if (!category) notFound();

  const filters = parseFilters(await searchParams);
  return <ListingView filters={filters} categorySlug={slug} />;
}
