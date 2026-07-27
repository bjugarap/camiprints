import { PrismaClient, type AgeRange, type DetailLevel } from "@prisma/client";

import { seedCategories, seedPages } from "../src/server/data/seed-data";

/**
 * Seeds Supabase Postgres from the same catalog the static repository
 * serves, so switching DATA_SOURCE never changes what the site shows.
 */
const prisma = new PrismaClient();

const AGE_RANGE_TO_ENUM: Record<string, AgeRange> = {
  "3-5": "ages_3_5",
  "6-8": "ages_6_8",
  "9-plus": "ages_9up",
};

const DETAIL_TO_ENUM: Record<string, DetailLevel> = {
  "large-spaces": "large_spaces",
  balanced: "balanced",
  "fine-detail": "fine_detail",
};

async function main() {
  for (const category of seedCategories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        tint: category.tint,
        thumbnailUrl: category.thumbnailUrl,
        featured: category.featured,
        order: category.order,
      },
      create: {
        slug: category.slug,
        name: category.name,
        tint: category.tint,
        thumbnailUrl: category.thumbnailUrl,
        featured: category.featured,
        order: category.order,
      },
    });
  }

  for (const page of seedPages) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: page.categorySlug },
    });
    const data = {
      title: page.title,
      description: page.description,
      difficulty: page.difficulty,
      ageRange: AGE_RANGE_TO_ENUM[page.ageRange],
      detailLevel: DETAIL_TO_ENUM[page.detailLevel],
      orientation: page.orientation,
      thumbnailUrl: page.thumbnailUrl,
      previewUrl: page.previewUrl,
      pngUrl: page.pngUrl,
      pdfUrl: page.pdfUrl,
      isEasyPick: page.isEasyPick,
      publishedAt: new Date(page.publishedAt),
    } as const;

    await prisma.coloringPage.upsert({
      where: {
        categoryId_slug: { categoryId: category.id, slug: page.slug },
      },
      update: data,
      create: { ...data, slug: page.slug, categoryId: category.id },
    });
  }

  console.log(
    `Seeded ${seedCategories.length} categories and ${seedPages.length} pages.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
