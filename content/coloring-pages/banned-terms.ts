/**
 * Copyright guard: protected character, franchise and studio names that
 * must never appear in a generation prompt or title. Matching is
 * case-insensitive on word boundaries. The list errs toward banning —
 * category themes may say "gaming" or "superhero", never a property name.
 */
const BANNED_TERMS = [
  // Studios and networks
  "disney", "pixar", "dreamworks", "nickelodeon", "marvel", "dc comics",
  "warner bros", "nintendo", "sega", "sanrio", "cartoon network",
  // Characters and franchises
  "mickey", "minnie", "donald duck", "goofy", "elsa", "olaf", "moana",
  "mulan", "pocahontas", "cinderella", "rapunzel", "snow white", "ariel",
  "tinker bell", "tinkerbell", "peter pan", "aladdin", "simba",
  "lion king", "toy story", "buzz lightyear", "nemo", "frozen",
  "encanto", "bluey", "peppa", "paw patrol", "spongebob", "dora",
  "batman", "superman", "spider-man", "spiderman", "hulk", "thor",
  "iron man", "captain america", "wonder woman", "aquaman", "avengers",
  "power rangers", "transformers", "ninja turtles", "tmnt",
  "mario", "luigi", "zelda", "pikachu", "pokemon", "pokémon", "kirby",
  "donkey kong", "sonic the hedgehog", "minecraft", "roblox", "fortnite",
  "pac-man", "pacman", "tetris", "hello kitty", "barbie", "lego",
  "harry potter", "hogwarts", "star wars", "jedi", "minions", "shrek",
  "grinch", "scooby",
] as const;

const matchers = BANNED_TERMS.map(
  (term) =>
    new RegExp(
      `(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`,
      "i",
    ),
);

/** Returns every banned term found in the text (empty = clean). */
export function findBannedTerms(text: string): string[] {
  const found: string[] = [];
  for (let i = 0; i < BANNED_TERMS.length; i++) {
    if (matchers[i].test(text)) found.push(BANNED_TERMS[i]);
  }
  return found;
}
