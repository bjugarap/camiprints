import type { Category, ColoringPage } from "@/types/catalog";

import categoryArt from "../../../art-generator/category-art.json";
import publishedColoringPages from "../../../content/coloring-pages/published.json";
import { LAUNCH_CATEGORIES } from "../../../content/coloring-pages/categories";
import {
  COMPLEXITY_CATALOG_MAPPING,
  type PublishedPage,
} from "../../../content/coloring-pages/publish-transform";

/**
 * The catalog. Category thumbnails come from the artwork manifest
 * (art-generator/category-art.json) by slug; EVERY page comes from the
 * generation pipeline's published.json (ADR 014) — the hand-written
 * placeholder pages that seeded the layouts before real artwork existed
 * were removed once the generated library shipped.
 *
 * Ordering: the launch categories (the ones with full generated
 * collections) rank first, in launch order; the remaining categories
 * follow in their original order and stay hidden from listings until
 * they have pages.
 */
const artBySlug = new Map<string, string>(
  (categoryArt as { slug: string; image: string }[]).map((art) => [
    art.slug,
    art.image,
  ]),
);

const featured = (
  slug: string,
  name: string,
  description: string,
  order: number,
): Category => ({
  slug,
  name,
  description,
  tint: slug,
  thumbnailUrl: artBySlug.get(slug) ?? null,
  featured: true,
  order,
  parentSlug: null,
});

const extra = (
  slug: string,
  name: string,
  description: string,
  order: number,
): Category => ({
  slug,
  name,
  description,
  tint: null,
  thumbnailUrl: artBySlug.get(slug) ?? null,
  featured: false,
  order,
  parentSlug: null,
});

export const seedCategories: Category[] = [
  featured("animals", "Animals", "Pets, farm animals, wild animals and birds.", 1),
  featured("dinosaurs", "Dinosaurs", "Friendly and realistic dinosaurs, fossils and eggs.", 2),
  featured("ocean", "Ocean", "Fish, whales, reefs and things under the sea.", 3),
  featured("space", "Space", "Rockets, planets, astronauts and the night sky.", 4),
  featured("fantasy", "Fantasy", "Dragons, castles, unicorns and magical scenes.", 5),
  featured("vehicles", "Vehicles", "Trucks, diggers, trains, boats and planes.", 6),
  featured("nature", "Nature", "Flowers, trees, weather and the seasons.", 7),
  featured("holidays", "Holidays", "Birthdays, Halloween, Christmas and more.", 8),
  extra("birds", "Birds", "Garden birds, big birds and bright feathers.", 9),
  extra("insects", "Insects", "Bees, butterflies, beetles and little crawlers.", 10),
  extra("farm", "Farm", "Tractors, barns and the animals that live there.", 11),
  extra("food", "Food", "Treats, picnics, fruit and vegetables.", 12),
  extra("sports", "Sports", "Football, cycling, swimming and more.", 13),
  extra("music", "Music", "Instruments, notes and things that make noise.", 14),
  extra("weather", "Weather", "Sunshine, rain, snow and rainbows.", 15),
  extra("seasons", "Seasons", "Spring, summer, autumn and winter scenes.", 16),
  extra("flowers", "Flowers", "Single blooms, bouquets and gardens.", 17),
  extra("trucks", "Trucks", "Big wheels, big loads and busy machines.", 18),
  extra("trains", "Trains", "Steam engines, railways and things on tracks.", 19),
  extra("planes", "Planes", "Aeroplanes, helicopters and hot air balloons.", 20),
  extra("castles", "Castles", "Towers, drawbridges, knights and flags.", 21),
  extra("pirates", "Pirates", "Ships, maps, parrots and buried treasure.", 22),
  extra("robots", "Robots", "Friendly machines with dials and lights.", 23),
  extra("shapes", "Shapes & Patterns", "Simple shapes and patterns to fill.", 24),
];

export const seedPages: ColoringPage[] = [];

const published = publishedColoringPages as PublishedPage[];
{
  // Launch categories that aren't hand-listed above join the catalog once
  // they have published pages (subcategories carry their parentSlug).
  const knownCategories = new Set(seedCategories.map((c) => c.slug));
  let nextOrder = seedCategories.length + 1;
  for (const launch of LAUNCH_CATEGORIES) {
    if (knownCategories.has(launch.slug)) continue;
    if (!published.some((p) => p.categorySlug === launch.slug)) continue;
    seedCategories.push({
      slug: launch.slug,
      name: launch.title,
      description: launch.description,
      tint: null,
      thumbnailUrl: artBySlug.get(launch.slug) ?? null,
      featured: false,
      order: nextOrder++,
      parentSlug: launch.parentSlug ?? null,
    });
  }

  // Launch categories rank first (in launch order); everything else keeps
  // its relative order after them.
  const launchRank = new Map(
    LAUNCH_CATEGORIES.filter((c) => !c.parentSlug).map((c, index) => [
      c.slug,
      index + 1,
    ]),
  );
  for (const category of seedCategories) {
    if (category.parentSlug) continue;
    category.order = launchRank.get(category.slug) ?? 100 + category.order;
  }

  for (const p of published) {
    const mapping = COMPLEXITY_CATALOG_MAPPING[p.complexity];
    seedPages.push({
      slug: p.slug,
      title: p.title,
      description: p.seoDescription,
      categorySlug: p.categorySlug,
      difficulty: mapping.difficulty,
      ageRange: mapping.ageRange,
      detailLevel: mapping.detailLevel,
      orientation: "portrait",
      thumbnailUrl: p.thumbnailPath,
      previewUrl: p.previewPath,
      pngUrl: p.printPath,
      pdfUrl: null,
      // Toddler pages are exactly the home row's "big shapes, thick
      // lines" promise.
      isEasyPick: p.complexity === "toddler",
      publishedAt: p.publishedAt.slice(0, 10),
    });
  }
}
