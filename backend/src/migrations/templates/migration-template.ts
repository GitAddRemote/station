import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration Template
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: npm run db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: [TODO: Describe what this migration does]
 *
 * Estimated duration: [TODO: Provide estimate]
 * Rollback safe: [TODO: Yes/No - explain any data loss]
 *
 * @example
 * // To generate a new migration from this template:
 * npm run typeorm migration:create src/migrations/[YourMigrationName]
 *
 * // Then copy this template structure and implement up/down methods
 */
export class MigrationTemplate implements MigrationInterface {
  name = 'MigrationTemplate' + Date.now();

  /**
   * Applies the migration
   *
   * @param queryRunner - TypeORM query runner
   * @throws {Error} If migration fails - will trigger automatic rollback
   */
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // TODO: Implement forward migration
    // Example: Creating a table
    // await queryRunner.query(`
    //   CREATE TABLE "example_table" (
    //     "id" SERIAL PRIMARY KEY,
    //     "name" VARCHAR(255) NOT NULL,
    //     "created_at" TIMESTAMP DEFAULT NOW()
    //   )
    // `);
    // Example: Adding an index
    // await queryRunner.query(`
    //   CREATE INDEX "IDX_example_name" ON "example_table" ("name")
    // `);
    // Example: Adding a foreign key
    // await queryRunner.query(`
    //   ALTER TABLE "child_table"
    //   ADD CONSTRAINT "FK_child_parent"
    //   FOREIGN KEY ("parent_id")
    //   REFERENCES "parent_table"("id")
    //   ON DELETE CASCADE
    // `);
  }

  /**
   * Reverts the migration
   *
   * CRITICAL: This method must successfully reverse all changes made in up()
   * Test this thoroughly in development before deploying to production
   *
   * @param queryRunner - TypeORM query runner
   * @throws {Error} If rollback fails - may require manual intervention
   */
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // TODO: Implement rollback migration
    // IMPORTANT: Reverse operations in opposite order of up()
    // Example: Dropping foreign key
    // await queryRunner.query(`
    //   ALTER TABLE "child_table"
    //   DROP CONSTRAINT "FK_child_parent"
    // `);
    // Example: Dropping index
    // await queryRunner.query(`
    //   DROP INDEX "IDX_example_name"
    // `);
    // Example: Dropping table
    // await queryRunner.query(`
    //   DROP TABLE "example_table"
    // `);
    // WARNING: If this migration involves data transformation,
    // document any potential data loss in the migration header
  }
}
