import type {
  AgeRange,
  Category,
  ColoringPage,
  DetailLevel,
  Difficulty,
  Orientation,
} from "@/types/catalog";

import categoryArt from "../../../art-generator/category-art.json";
import publishedColoringPages from "../../../content/coloring-pages/published.json";
import {
  LAUNCH_CATEGORIES,
} from "../../../content/coloring-pages/categories";
import {
  COMPLEXITY_CATALOG_MAPPING,
  type PublishedPage,
} from "../../../content/coloring-pages/publish-transform";

/**
 * Launch catalog. Every page named in the design mocks is here with the
 * metadata the mocks show. Category thumbnails come from the artwork
 * manifest (art-generator/category-art.json) by slug; page asset URLs are
 * null until real artwork arrives — the UI renders clearly-marked
 * placeholders and no layout will change when the URLs are filled in.
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

function page(
  categorySlug: string,
  slug: string,
  title: string,
  description: string,
  difficulty: Difficulty,
  ageRange: AgeRange,
  detailLevel: DetailLevel,
  publishedAt: string,
  options: Partial<Pick<ColoringPage, "orientation" | "isEasyPick">> = {},
): ColoringPage {
  return {
    slug,
    title,
    description,
    categorySlug,
    difficulty,
    ageRange,
    detailLevel,
    orientation: options.orientation ?? ("portrait" as Orientation),
    thumbnailUrl: null,
    previewUrl: null,
    pngUrl: null,
    pdfUrl: null,
    isEasyPick: options.isEasyPick ?? false,
    publishedAt,
  };
}

export const seedPages: ColoringPage[] = [
  // Dinosaurs — the hi-fi listing set.
  page("dinosaurs", "friendly-t-rex", "Friendly T-Rex", "A smiling dinosaur with big open shapes — good for younger children and thick crayons.", "easy", "3-5", "large-spaces", "2026-06-02"),
  page("dinosaurs", "stegosaurus-walk", "Stegosaurus Walk", "A stegosaurus on a stroll, plates and all, with wide spaces to fill.", "easy", "6-8", "large-spaces", "2026-06-02"),
  page("dinosaurs", "triceratops-field", "Triceratops Field", "A triceratops grazing in a simple meadow scene.", "easy", "6-8", "balanced", "2026-06-05"),
  page("dinosaurs", "pterodactyl-sky", "Pterodactyl Sky", "A pterodactyl gliding between simple clouds.", "medium", "6-8", "balanced", "2026-06-05"),
  page("dinosaurs", "tall-brachiosaurus", "Tall Brachiosaurus", "A long-necked brachiosaurus reaching for the treetops.", "easy", "6-8", "large-spaces", "2026-06-09"),
  page("dinosaurs", "hatching-egg", "Hatching Egg", "A baby dinosaur peeking out of its egg.", "easy", "3-5", "large-spaces", "2026-06-09"),
  page("dinosaurs", "little-raptor", "Little Raptor", "A small raptor mid-hop with feathery details.", "medium", "6-8", "balanced", "2026-06-12"),
  page("dinosaurs", "fossil-dig", "Fossil Dig", "A dig site full of bones, tools and small details to find.", "detailed", "9-plus", "fine-detail", "2026-06-12"),

  // Animals.
  page("animals", "sitting-fox", "Sitting Fox", "A calm fox with a big bushy tail and simple shapes.", "easy", "3-5", "large-spaces", "2026-05-20", { isEasyPick: true }),
  page("animals", "hop-the-bunny", "Hop the Bunny", "A bunny mid-hop with long ears and big paws.", "easy", "3-5", "large-spaces", "2026-05-22", { isEasyPick: true }),
  page("animals", "night-owl", "Night Owl", "An owl on a branch with feather patterns to explore.", "detailed", "9-plus", "fine-detail", "2026-07-21"),
  page("animals", "meadow-deer", "Meadow Deer", "A deer standing among tall grass and flowers.", "medium", "6-8", "balanced", "2026-05-28"),
  page("animals", "garden-cat", "Garden Cat", "A cat curled up beside a flower pot.", "easy", "3-5", "large-spaces", "2026-06-01"),
  page("animals", "puppy-parade", "Puppy Parade", "Three puppies walking in a happy line.", "easy", "6-8", "balanced", "2026-06-03"),

  // Ocean.
  page("ocean", "blue-whale", "Blue Whale", "A gentle whale with one big spout and lots of open sea.", "easy", "3-5", "large-spaces", "2026-05-21", { isEasyPick: true }),
  page("ocean", "sea-turtle-reef", "Sea Turtle Reef", "A sea turtle swimming over a coral reef.", "medium", "6-8", "balanced", "2026-07-22"),
  page("ocean", "dancing-dolphin", "Dancing Dolphin", "A dolphin leaping through simple waves.", "easy", "6-8", "large-spaces", "2026-06-04"),
  page("ocean", "curious-crab", "Curious Crab", "A crab waving one big claw hello.", "easy", "3-5", "large-spaces", "2026-06-06"),

  // Space.
  page("space", "rocket-launch", "Rocket Launch", "A rocket lifting off with big flames and stars.", "easy", "6-8", "large-spaces", "2026-07-23"),
  page("space", "smiling-moon", "Smiling Moon", "A friendly moon with a nightcap and stars.", "easy", "3-5", "large-spaces", "2026-06-07"),
  page("space", "planet-parade", "Planet Parade", "All the planets lined up in a row.", "medium", "6-8", "balanced", "2026-06-10"),
  page("space", "astronaut-wave", "Astronaut Wave", "An astronaut waving from beside their lander.", "medium", "6-8", "balanced", "2026-06-11"),

  // Fantasy.
  page("fantasy", "cloud-castle", "Cloud Castle", "A castle floating on a cloud with simple towers.", "easy", "3-5", "large-spaces", "2026-05-23", { isEasyPick: true }),
  page("fantasy", "sleeping-dragon", "Sleeping Dragon", "A dragon curled around its treasure, scales and all.", "detailed", "9-plus", "fine-detail", "2026-07-24"),
  page("fantasy", "friendly-unicorn", "Friendly Unicorn", "A unicorn with a flowing mane in a flower field.", "easy", "6-8", "balanced", "2026-06-08"),
  page("fantasy", "wizard-tower", "Wizard Tower", "A crooked tower full of windows, stars and potions.", "medium", "6-8", "balanced", "2026-06-13"),

  // Vehicles.
  page("vehicles", "farm-tractor", "Farm Tractor", "A tractor with big wheels on a simple farm track.", "easy", "3-5", "large-spaces", "2026-05-24", { isEasyPick: true }),
  page("vehicles", "camper-van", "Camper Van", "A camper van parked under the trees, ready for a trip.", "medium", "6-8", "balanced", "2026-07-25"),
  page("vehicles", "busy-digger", "Busy Digger", "A digger scooping a big pile of earth.", "easy", "3-5", "large-spaces", "2026-06-14"),
  page("vehicles", "fire-engine", "Fire Engine", "A fire engine with ladder up and lights on.", "easy", "6-8", "balanced", "2026-06-15"),

  // Nature.
  page("nature", "tall-sunflower", "Tall Sunflower", "One big sunflower with wide petals and a friendly bee.", "easy", "3-5", "large-spaces", "2026-05-25"),
  page("nature", "forest-path", "Forest Path", "A winding path between trees and toadstools.", "medium", "6-8", "balanced", "2026-06-16", { orientation: "landscape" }),
  page("nature", "autumn-leaves", "Autumn Leaves", "A pile of leaves in different shapes to colour.", "easy", "6-8", "balanced", "2026-06-17"),
  page("nature", "mountain-lake", "Mountain Lake", "Mountains mirrored in a still lake, full of fine detail.", "detailed", "9-plus", "fine-detail", "2026-06-18", { orientation: "landscape" }),

  // Holidays.
  page("holidays", "birthday-cake", "Birthday Cake", "A three-layer cake with candles and bunting.", "easy", "3-5", "large-spaces", "2026-05-26"),
  page("holidays", "winter-snowman", "Winter Snowman", "A snowman with a scarf, ready for winter.", "easy", "3-5", "large-spaces", "2026-06-19"),
  page("holidays", "pumpkin-patch", "Pumpkin Patch", "A patch of pumpkins in all sizes.", "medium", "6-8", "balanced", "2026-06-20"),
  page("holidays", "festival-lanterns", "Festival Lanterns", "A string of patterned lanterns to decorate.", "detailed", "9-plus", "fine-detail", "2026-06-21"),

  // The remaining categories each launch with a small starter set.
  page("birds", "backyard-robin", "Backyard Robin", "A robin perched on a garden fence.", "easy", "3-5", "large-spaces", "2026-06-22"),
  page("birds", "proud-peacock", "Proud Peacock", "A peacock with a full fan of patterned feathers.", "detailed", "9-plus", "fine-detail", "2026-06-22"),
  page("insects", "busy-bee", "Busy Bee", "A round bee visiting a big flower.", "easy", "3-5", "large-spaces", "2026-06-23"),
  page("insects", "ladybird-leaf", "Ladybird Leaf", "A ladybird crossing a leaf with simple spots.", "easy", "3-5", "large-spaces", "2026-06-23"),
  page("farm", "morning-rooster", "Morning Rooster", "A rooster crowing on a fence post.", "easy", "6-8", "balanced", "2026-06-24"),
  page("farm", "sheep-meadow", "Sheep Meadow", "Fluffy sheep grazing in a simple meadow.", "easy", "3-5", "large-spaces", "2026-06-24"),
  page("food", "ice-cream-tower", "Ice Cream Tower", "A wobbly tower of ice-cream scoops.", "easy", "3-5", "large-spaces", "2026-06-25"),
  page("food", "picnic-basket", "Picnic Basket", "A basket packed for a picnic in the park.", "medium", "6-8", "balanced", "2026-06-25"),
  page("sports", "goal-kick", "Goal Kick", "A footballer lining up the winning kick.", "medium", "6-8", "balanced", "2026-06-26"),
  page("sports", "bike-race", "Bike Race", "Riders racing downhill with the wind behind them.", "medium", "6-8", "balanced", "2026-06-26"),
  page("music", "drum-time", "Drum Time", "A big drum, two sticks and plenty of noise.", "easy", "3-5", "large-spaces", "2026-06-27"),
  page("music", "violin-song", "Violin Song", "A violin with musical notes floating by.", "medium", "6-8", "balanced", "2026-06-27"),
  page("weather", "rainy-day", "Rainy Day", "An umbrella, puddles and friendly rain clouds.", "easy", "3-5", "large-spaces", "2026-06-28"),
  page("weather", "big-rainbow", "Big Rainbow", "A rainbow arching over rolling hills.", "easy", "3-5", "large-spaces", "2026-06-28"),
  page("seasons", "spring-blossom", "Spring Blossom", "A blossom tree shedding petals in the breeze.", "medium", "6-8", "balanced", "2026-06-29"),
  page("seasons", "summer-beach", "Summer Beach", "Buckets, spades and a sandcastle by the sea.", "easy", "6-8", "balanced", "2026-06-29"),
  page("flowers", "tulip-row", "Tulip Row", "A neat row of tulips in a window box.", "easy", "3-5", "large-spaces", "2026-06-30"),
  page("flowers", "wildflower-jar", "Wildflower Jar", "A jam jar stuffed with wildflowers.", "medium", "6-8", "balanced", "2026-06-30"),
  page("trucks", "dump-truck", "Dump Truck", "A dump truck tipping its load of rocks.", "easy", "3-5", "large-spaces", "2026-07-01"),
  page("trucks", "monster-truck", "Monster Truck", "A monster truck bouncing over a mud hill.", "medium", "6-8", "balanced", "2026-07-01"),
  page("trains", "steam-engine", "Steam Engine", "A steam engine puffing big clouds of smoke.", "easy", "6-8", "balanced", "2026-07-02"),
  page("trains", "mountain-railway", "Mountain Railway", "A little train crossing a tall viaduct.", "detailed", "9-plus", "fine-detail", "2026-07-02", { orientation: "landscape" }),
  page("planes", "propeller-plane", "Propeller Plane", "A propeller plane looping through the clouds.", "easy", "6-8", "balanced", "2026-07-03"),
  page("planes", "hot-air-balloon", "Hot Air Balloon", "A patterned balloon drifting over fields.", "easy", "3-5", "large-spaces", "2026-07-03"),
  page("castles", "drawbridge-castle", "Drawbridge Castle", "A castle with its drawbridge down and flags up.", "medium", "6-8", "balanced", "2026-07-04"),
  page("castles", "tiny-fort", "Tiny Fort", "A small fort with big friendly battlements.", "easy", "3-5", "large-spaces", "2026-07-04"),
  page("pirates", "treasure-map", "Treasure Map", "A map with a dotted trail to buried treasure.", "medium", "6-8", "balanced", "2026-07-05"),
  page("pirates", "parrot-lookout", "Parrot Lookout", "A parrot keeping watch from the crow's nest.", "easy", "6-8", "balanced", "2026-07-05"),
  page("robots", "helper-robot", "Helper Robot", "A boxy robot with dials, lights and a big smile.", "easy", "3-5", "large-spaces", "2026-07-06"),
  page("robots", "robot-workshop", "Robot Workshop", "A workshop full of gears, tools and half-built bots.", "detailed", "9-plus", "fine-detail", "2026-07-06"),
  page("shapes", "pattern-snail", "Pattern Snail", "A snail shell built from rings of simple patterns.", "easy", "3-5", "large-spaces", "2026-07-07"),
  page("shapes", "mosaic-star", "Mosaic Star", "A big star filled with a mosaic of small shapes.", "detailed", "9-plus", "fine-detail", "2026-07-07"),
];

/**
 * Published AI-generated pages (content/coloring-pages/published.json —
 * approved via the review pipeline, see ADR 014) merge into the catalog
 * here. Launch categories that aren't in the hand-written list above are
 * appended the first time one of their pages publishes; their card art
 * comes from the same artwork manifest.
 */
const published = publishedColoringPages as PublishedPage[];
{
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
    });
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
      isEasyPick: false,
      publishedAt: p.publishedAt.slice(0, 10),
    });
  }
}
