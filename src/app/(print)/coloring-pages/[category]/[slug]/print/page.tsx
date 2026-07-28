import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { pageHref } from "@/features/library/page-card";
import { PrintPreview } from "@/features/library/print-preview";
import { getCatalogRepository } from "@/server/repositories";

/**
 * The print-preview route. It lives outside the (site) group so the page
 * carries no header or footer — on screen it is only the sheet and the two
 * controls, and in printed output only the sheet.
 */
export async function generateStaticParams() {
  const { pages } = await getCatalogRepository().listPages({ perPage: 1000 });
  return pages.map((page) => ({
    category: page.categorySlug,
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const page = await getCatalogRepository().getPage(category, slug);
  if (!page) return {};
  return {
    title: `Print ${page.title}`,
    robots: { index: false },
  };
}

export default async function PrintPreviewPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const page = await getCatalogRepository().getPage(category, slug);
  if (!page) notFound();

  return <PrintPreview page={page} backHref={pageHref(page)} />;
}
