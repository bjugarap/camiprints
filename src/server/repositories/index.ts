import "server-only";

import type { CatalogRepository } from "./catalog-repository";
import { StaticCatalogRepository } from "./static-catalog-repository";

/**
 * Data-source selection. `DATA_SOURCE=database` switches catalog reads to
 * the Prisma/Supabase implementation once credentials exist; the default
 * static source needs no infrastructure.
 */
let catalogRepository: CatalogRepository | null = null;

export function getCatalogRepository(): CatalogRepository {
  if (!catalogRepository) {
    // The Prisma implementation registers here when DATA_SOURCE=database.
    catalogRepository = new StaticCatalogRepository();
  }
  return catalogRepository;
}
