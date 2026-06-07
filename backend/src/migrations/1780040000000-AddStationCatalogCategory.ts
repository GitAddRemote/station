import { MigrationInterface, QueryRunner } from 'typeorm';

type SeedCategory = {
  name: string;
  slug: string;
  parentSlug: string | null;
  sortOrder: number;
  description?: string | null;
};

type SeededCategory = {
  id: string;
  slug: string;
  path: string;
  pathIds: string[];
  depth: number;
};

const ROOT_CATEGORIES: SeedCategory[] = [
  { name: 'Vehicle', slug: 'vehicle', parentSlug: null, sortOrder: 1 },
  { name: 'Item', slug: 'item', parentSlug: null, sortOrder: 2 },
  { name: 'Commodity', slug: 'commodity', parentSlug: null, sortOrder: 3 },
];

const VEHICLE_CATEGORIES: SeedCategory[] = [
  { name: 'Ship', slug: 'ship', parentSlug: 'vehicle', sortOrder: 1 },
  {
    name: 'Ground Vehicle',
    slug: 'ground-vehicle',
    parentSlug: 'vehicle',
    sortOrder: 2,
  },
  {
    name: 'Add-on / Module',
    slug: 'addon-module',
    parentSlug: 'vehicle',
    sortOrder: 3,
  },
  {
    name: 'Starter',
    slug: 'starter',
    parentSlug: 'ship',
    sortOrder: 1,
  },
  {
    name: 'Civilian',
    slug: 'civilian',
    parentSlug: 'ship',
    sortOrder: 2,
  },
  {
    name: 'Exploration',
    slug: 'exploration',
    parentSlug: 'ship',
    sortOrder: 3,
  },
  { name: 'Cargo', slug: 'cargo', parentSlug: 'ship', sortOrder: 4 },
  { name: 'Mining', slug: 'mining', parentSlug: 'ship', sortOrder: 5 },
  {
    name: 'Industrial',
    slug: 'industrial',
    parentSlug: 'ship',
    sortOrder: 6,
  },
  { name: 'Military', slug: 'military', parentSlug: 'ship', sortOrder: 7 },
  { name: 'Medical', slug: 'medical', parentSlug: 'ship', sortOrder: 8 },
  { name: 'Salvage', slug: 'salvage', parentSlug: 'ship', sortOrder: 9 },
  { name: 'Racing', slug: 'racing', parentSlug: 'ship', sortOrder: 10 },
  {
    name: 'Passenger',
    slug: 'passenger',
    parentSlug: 'ship',
    sortOrder: 11,
  },
  {
    name: 'Science & Research',
    slug: 'science-research',
    parentSlug: 'ship',
    sortOrder: 12,
  },
  { name: 'Support', slug: 'support', parentSlug: 'ship', sortOrder: 13 },
  { name: 'Stealth', slug: 'stealth', parentSlug: 'ship', sortOrder: 14 },
  {
    name: 'Data Running',
    slug: 'data-running',
    parentSlug: 'ship',
    sortOrder: 15,
  },
];

const ITEM_CATEGORIES: SeedCategory[] = [
  { name: 'Armor', slug: 'armor', parentSlug: 'item', sortOrder: 1 },
  { name: 'Clothing', slug: 'clothing', parentSlug: 'item', sortOrder: 2 },
  {
    name: 'Personal Weapons',
    slug: 'personal-weapons',
    parentSlug: 'item',
    sortOrder: 3,
  },
  {
    name: 'Ship Components',
    slug: 'ship-components',
    parentSlug: 'item',
    sortOrder: 4,
  },
  { name: 'Avionics', slug: 'avionics', parentSlug: 'item', sortOrder: 5 },
  {
    name: 'Propulsion',
    slug: 'propulsion',
    parentSlug: 'item',
    sortOrder: 6,
  },
  {
    name: 'Vehicle Weapons',
    slug: 'vehicle-weapons',
    parentSlug: 'item',
    sortOrder: 7,
  },
  { name: 'Utility', slug: 'utility', parentSlug: 'item', sortOrder: 8 },
  { name: 'Liveries', slug: 'liveries', parentSlug: 'item', sortOrder: 9 },
  {
    name: 'Miscellaneous',
    slug: 'miscellaneous',
    parentSlug: 'item',
    sortOrder: 10,
  },
  {
    name: 'Technology',
    slug: 'technology',
    parentSlug: 'item',
    sortOrder: 11,
  },
  {
    name: 'Decorations',
    slug: 'decorations',
    parentSlug: 'item',
    sortOrder: 12,
  },
  { name: 'Flair', slug: 'flair', parentSlug: 'item', sortOrder: 13 },
  {
    name: 'Undersuits',
    slug: 'undersuits',
    parentSlug: 'item',
    sortOrder: 14,
  },
  { name: 'Other', slug: 'other', parentSlug: 'item', sortOrder: 15 },
  { name: 'Arms', slug: 'arms', parentSlug: 'armor', sortOrder: 1 },
  {
    name: 'Backpacks',
    slug: 'backpacks',
    parentSlug: 'armor',
    sortOrder: 2,
  },
  {
    name: 'Helmets',
    slug: 'helmets',
    parentSlug: 'armor',
    sortOrder: 3,
  },
  { name: 'Legs', slug: 'legs', parentSlug: 'armor', sortOrder: 4 },
  { name: 'Torso', slug: 'torso', parentSlug: 'armor', sortOrder: 5 },
  {
    name: 'Full Set',
    slug: 'armor-full-set',
    parentSlug: 'armor',
    sortOrder: 6,
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    parentSlug: 'clothing',
    sortOrder: 1,
  },
  { name: 'Gloves', slug: 'gloves', parentSlug: 'clothing', sortOrder: 2 },
  { name: 'Hats', slug: 'hats', parentSlug: 'clothing', sortOrder: 3 },
  {
    name: 'Jackets',
    slug: 'jackets',
    parentSlug: 'clothing',
    sortOrder: 4,
  },
  {
    name: 'Legwear',
    slug: 'legwear',
    parentSlug: 'clothing',
    sortOrder: 5,
  },
  {
    name: 'Shirts',
    slug: 'shirts',
    parentSlug: 'clothing',
    sortOrder: 6,
  },
  {
    name: 'Eyewear',
    slug: 'eyewear',
    parentSlug: 'clothing',
    sortOrder: 7,
  },
  {
    name: 'Handguns',
    slug: 'handguns',
    parentSlug: 'personal-weapons',
    sortOrder: 1,
  },
  {
    name: 'Long Guns',
    slug: 'long-guns',
    parentSlug: 'personal-weapons',
    sortOrder: 2,
  },
  {
    name: 'Heavy Weapons',
    slug: 'heavy-weapons',
    parentSlug: 'personal-weapons',
    sortOrder: 3,
  },
  {
    name: 'Medical Devices',
    slug: 'medical-devices',
    parentSlug: 'utility',
    sortOrder: 1,
  },
  {
    name: 'Multi-Tools',
    slug: 'multi-tools',
    parentSlug: 'utility',
    sortOrder: 2,
  },
  {
    name: 'Tractor Beams',
    slug: 'tractor-beams',
    parentSlug: 'utility',
    sortOrder: 3,
  },
  {
    name: 'Ammunition',
    slug: 'ammunition',
    parentSlug: 'miscellaneous',
    sortOrder: 1,
  },
  {
    name: 'Food & Drink',
    slug: 'food-drink',
    parentSlug: 'miscellaneous',
    sortOrder: 2,
  },
  {
    name: 'Attachments',
    slug: 'attachments',
    parentSlug: 'miscellaneous',
    sortOrder: 3,
  },
];

const COMMODITY_CATEGORIES: SeedCategory[] = [
  {
    name: 'Minerals',
    slug: 'minerals',
    parentSlug: 'commodity',
    sortOrder: 1,
  },
  { name: 'Gases', slug: 'gases', parentSlug: 'commodity', sortOrder: 2 },
  { name: 'Metals', slug: 'metals', parentSlug: 'commodity', sortOrder: 3 },
  {
    name: 'Agricultural',
    slug: 'agricultural',
    parentSlug: 'commodity',
    sortOrder: 4,
  },
  {
    name: 'Processed Food',
    slug: 'processed-food',
    parentSlug: 'commodity',
    sortOrder: 5,
  },
  {
    name: 'Medical',
    slug: 'commodity-medical',
    parentSlug: 'commodity',
    sortOrder: 6,
  },
  {
    name: 'Chemicals',
    slug: 'chemicals',
    parentSlug: 'commodity',
    sortOrder: 7,
  },
  {
    name: 'Textiles',
    slug: 'textiles',
    parentSlug: 'commodity',
    sortOrder: 8,
  },
  { name: 'Waste', slug: 'waste', parentSlug: 'commodity', sortOrder: 9 },
  {
    name: 'Consumer Goods',
    slug: 'consumer-goods',
    parentSlug: 'commodity',
    sortOrder: 10,
  },
  {
    name: 'Industrial Materials',
    slug: 'industrial-materials',
    parentSlug: 'commodity',
    sortOrder: 11,
  },
  { name: 'Fuel', slug: 'fuel', parentSlug: 'commodity', sortOrder: 12 },
  {
    name: 'Contraband',
    slug: 'contraband',
    parentSlug: 'commodity',
    sortOrder: 13,
  },
];

const SEED_CATEGORIES: SeedCategory[] = [
  ...ROOT_CATEGORIES,
  ...VEHICLE_CATEGORIES,
  ...ITEM_CATEGORIES,
  ...COMMODITY_CATEGORIES,
];

export class AddStationCatalogCategory1780040000000
  implements MigrationInterface
{
  name = 'AddStationCatalogCategory1780040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureUuidV7Function(queryRunner);
    await queryRunner.query(`
      CREATE TABLE "station_catalog_category" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
        "parent_id" UUID NULL,
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL,
        "path" TEXT NOT NULL,
        "path_ids" UUID[] NOT NULL,
        "depth" INTEGER NOT NULL DEFAULT 0,
        "description" TEXT NULL,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "is_locally_managed" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_station_catalog_category_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_station_catalog_category_slug" UNIQUE ("slug"),
        CONSTRAINT "uq_station_catalog_category_path" UNIQUE ("path"),
        CONSTRAINT "fk_station_catalog_category_parent_id"
          FOREIGN KEY ("parent_id")
          REFERENCES "station_catalog_category"("id")
          ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_category_parent_id"
      ON "station_catalog_category" ("parent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_category_depth"
      ON "station_catalog_category" ("depth")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_category_sort_order"
      ON "station_catalog_category" ("sort_order")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_category_path_ids"
      ON "station_catalog_category" USING GIN ("path_ids")
    `);

    const seededBySlug = new Map<string, SeededCategory>();

    for (const seed of SEED_CATEGORIES) {
      const parent = seed.parentSlug
        ? (seededBySlug.get(seed.parentSlug) ?? null)
        : null;

      if (seed.parentSlug && !parent) {
        throw new Error(
          `Missing seeded parent category for slug "${seed.parentSlug}"`,
        );
      }

      const id = await this.generateUuidV7(queryRunner);
      const path = parent ? `${parent.path}.${seed.slug}` : seed.slug;
      const pathIds = parent ? [...parent.pathIds, id] : [id];
      const depth = parent ? parent.depth + 1 : 0;

      await queryRunner.query(
        `
          INSERT INTO "station_catalog_category" (
            "id",
            "parent_id",
            "name",
            "slug",
            "path",
            "path_ids",
            "depth",
            "description",
            "sort_order",
            "is_active",
            "is_locally_managed",
            "created_at",
            "updated_at"
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::uuid[],
            $7,
            $8,
            $9,
            TRUE,
            FALSE,
            NOW(),
            NOW()
          )
        `,
        [
          id,
          parent?.id ?? null,
          seed.name,
          seed.slug,
          path,
          pathIds,
          depth,
          seed.description ?? null,
          seed.sortOrder,
        ],
      );

      seededBySlug.set(seed.slug, {
        id,
        slug: seed.slug,
        path,
        pathIds,
        depth,
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_catalog_category" CASCADE`,
    );
  }

  private async generateUuidV7(queryRunner: QueryRunner): Promise<string> {
    const rows = (await queryRunner.query(
      `SELECT uuid_generate_v7() AS id`,
    )) as { id: string }[];
    return rows[0].id;
  }

  private async ensureUuidV7Function(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "uuid_generate_v7"()
      RETURNS UUID
      LANGUAGE plpgsql
      AS $$
      DECLARE
        ts_hex TEXT;
        rand_hex TEXT;
        variant_nibble TEXT;
      BEGIN
        ts_hex := lpad(
          to_hex(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint),
          12,
          '0'
        );
        rand_hex := encode(gen_random_bytes(10), 'hex');
        variant_nibble := substr(
          '89ab',
          (get_byte(gen_random_bytes(1), 0) % 4) + 1,
          1
        );
        RETURN (
          substr(ts_hex, 1, 8) || '-' ||
          substr(ts_hex, 9, 4) || '-' ||
          '7' || substr(rand_hex, 1, 3) || '-' ||
          variant_nibble || substr(rand_hex, 4, 3) || '-' ||
          substr(rand_hex, 7, 12)
        )::uuid;
      END;
      $$
    `);
  }
}
