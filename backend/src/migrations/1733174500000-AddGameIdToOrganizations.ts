import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Migration: Add game_id to Organizations
 *
 * Description: Adds game_id foreign key to organizations table to support
 * multi-game architecture. Defaults all existing organizations to Star Citizen (game_id = 1).
 *
 * Estimated duration: < 10 seconds
 * Rollback safe: Yes - can remove column if no other dependencies exist
 */
export class AddGameIdToOrganizations1733174500000
  implements MigrationInterface
{
  name = 'AddGameIdToOrganizations1733174500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add game_id column as nullable first
    await queryRunner.addColumn(
      'organization',
      new TableColumn({
        name: 'game_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Set default value for existing records to Star Citizen (id = 1)
    await queryRunner.query(`
      UPDATE "organization"
      SET "game_id" = 1
      WHERE "game_id" IS NULL
    `);

    // Make game_id NOT NULL now that all records have values
    await queryRunner.changeColumn(
      'organization',
      'game_id',
      new TableColumn({
        name: 'game_id',
        type: 'int',
        isNullable: false,
      }),
    );

    // Create index on game_id for efficient queries
    await queryRunner.createIndex(
      'organization',
      new TableIndex({
        name: 'IDX_organization_game_id',
        columnNames: ['game_id'],
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'organization',
      new TableForeignKey({
        name: 'FK_organization_game',
        columnNames: ['game_id'],
        referencedTableName: 'games',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('organization', 'FK_organization_game');

    // Drop index
    await queryRunner.dropIndex('organization', 'IDX_organization_game_id');

    // Drop column
    await queryRunner.dropColumn('organization', 'game_id');
  }
}
