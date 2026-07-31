/**
 * The launch categories for the generated coloring-page library.
 * Slugs match art-generator/categories.json (each has cover art in
 * public/categories/<slug>.webp). Titles are the content-plan names — the
 * former "Disney" idea ships as "Fairy Tales & Magic". Educational was
 * removed from the plan (2026-07-30): the current model cannot reliably
 * draw numeral/letter sequences.
 *
 * `parentSlug` makes a category a SUBCATEGORY: its pages publish into
 * their own catalog (e.g. /coloring-pages/lion) and its tile appears on
 * the parent's listing page, not the homepage.
 *
 * At publish time, categories that aren't in the site catalog yet are
 * appended from these definitions; existing catalog categories (dinosaurs,
 * animals) are reused untouched.
 */
export interface LaunchCategory {
  slug: string;
  title: string;
  description: string;
  parentSlug?: string;
}

export const LAUNCH_CATEGORIES: LaunchCategory[] = [
  { slug: "video-games", title: "Video Games", description: "Original gaming worlds, controllers, arcades and pixel adventures." },
  { slug: "kids-tv", title: "Kids TV Shows", description: "Original cartoon-style shows, studios and animal presenters." },
  { slug: "girls", title: "For Girls", description: "Friendship, sports, science, art, riding and adventures." },
  { slug: "summer", title: "Summer", description: "Beaches, camping, picnics, ice cream and sunshine." },
  { slug: "adults", title: "For Adults", description: "Mandalas, botanicals, cozy scenes and intricate patterns." },
  { slug: "toddlers", title: "For Toddlers", description: "Very simple pages with big, easy shapes for little hands." },
  { slug: "fairy-tales", title: "Fairy Tales & Magic", description: "Original castles, dragons, unicorns, fairies and wizards." },
  { slug: "kawaii", title: "Kawaii", description: "Cute smiling treats, animals and everyday things." },
  { slug: "kids-movies", title: "Kids Movies", description: "Movie nights, film crews, theaters and pretend premieres." },
  { slug: "dinosaurs", title: "Dinosaurs", description: "Friendly and realistic dinosaurs, fossils and eggs." },
  { slug: "superheroes", title: "Superheroes", description: "Completely original young heroes doing helpful deeds." },
  // Animal subcategories — collections under the existing Animals category.
  { slug: "lion", title: "Lions", description: "Proud lions, playful cubs and savanna scenes.", parentSlug: "animals" },
  { slug: "tiger", title: "Tigers", description: "Striped tigers prowling, swimming and stretching.", parentSlug: "animals" },
  { slug: "elephant", title: "Elephants", description: "Gentle elephants splashing, marching and dancing.", parentSlug: "animals" },
  { slug: "sea-turtle", title: "Sea Turtles", description: "Sea turtles gliding through reefs and waves.", parentSlug: "animals" },
];

export const LAUNCH_CATEGORY_SLUGS = LAUNCH_CATEGORIES.map((c) => c.slug);
