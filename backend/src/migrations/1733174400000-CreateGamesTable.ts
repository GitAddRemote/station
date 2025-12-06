import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create Games Table
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: npm run db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates the games table to support multi-game architecture.
 * Adds Star Citizen and Squadron 42 as the initial games.
 *
 * Estimated duration: < 5 seconds
 * Rollback safe: Yes - table can be dropped cleanly if no foreign keys exist
 */
export class CreateGamesTable1733174400000 implements MigrationInterface {
  name = 'CreateGamesTable1733174400000';

  /**
   * Applies the migration
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create games table
    await queryRunner.createTable(
      new Table({
        name: 'games',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '20',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create index on active column for efficient queries
    await queryRunner.createIndex(
      'games',
      new TableIndex({
        name: 'IDX_games_active',
        columnNames: ['active'],
      }),
    );

    // Create index on code column for lookups
    await queryRunner.createIndex(
      'games',
      new TableIndex({
        name: 'IDX_games_code',
        columnNames: ['code'],
      }),
    );

    // Seed initial games
    await queryRunner.query(`
      INSERT INTO "games" ("name", "code", "description", "active")
      VALUES
        ('Star Citizen', 'sc', 'Star Citizen is a multiplayer space trading and combat simulation game.', true),
        ('Squadron 42', 'sq42', 'Squadron 42 is a single-player space combat game set in the Star Citizen universe.', true)
    `);
  }

  /**
   * Reverts the migration
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('games', 'IDX_games_code');
    await queryRunner.dropIndex('games', 'IDX_games_active');

    // Drop table
    await queryRunner.dropTable('games');
  }
}
