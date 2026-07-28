import type { Metadata } from "next";
import Link from "next/link";

import { getCatalogRepository } from "@/server/repositories";
import { Artwork, categoryTintClass } from "@/shared/artwork";

export const metadata: Metadata = {
  title: "Categories",
  description:
    "Every CamiPrints coloring page lives in one of these categories. Tap a picture to see them all.",
  alternates: { canonical: "/categories" },
};

/**
 * Categories directory (wireframe 4a, dressed with the token system): one
 * row per category — image left, description, count — scannable at a
 * glance and readable as a list by a screen reader.
 */
export default async function CategoriesPage() {
  const categories = await getCatalogRepository().listCategories();

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-[34px] pt-6 md:px-10">
      <h1 className="text-page-title text-[30px]/[1.1] text-ink md:text-[38px]/[1.1]">
        Categories
      </h1>
      <p className="text-body mt-1.5 text-ink-60">
        Every coloring page lives in one of these. Tap a picture to see them
        all.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/coloring-pages/${category.slug}`}
              className="flex gap-3 rounded-card border border-line bg-card p-2.5 shadow-card hover:border-line-strong"
            >
              <Artwork
                src={category.thumbnailUrl}
                alt=""
                label={category.slug}
                placeholder={
                  category.tint
                    ? (categoryTintClass[category.tint] ?? "bg-line/40")
                    : "bg-line/40"
                }
                className="size-[88px] flex-none rounded-thumb"
              />
              <span className="flex flex-col justify-center">
                <span className="text-[17px] font-semibold text-ink">
                  {category.name}
                </span>
                <span className="mt-0.5 text-[14.5px]/[1.5] text-ink-60">
                  {category.description}
                </span>
                <span className="text-meta mt-1 text-ink-40">
                  {category.pageCount} pages
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
