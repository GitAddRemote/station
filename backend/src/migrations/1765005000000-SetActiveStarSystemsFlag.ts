import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetActiveStarSystemsFlag1765005000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE uex_star_systems
      SET active = TRUE
      WHERE UPPER(code) IN ('STANTON', 'PYRO', 'NYX') AND deleted = FALSE
    `);

    await queryRunner.query(`
      UPDATE uex_star_systems
      SET active = FALSE
      WHERE UPPER(code) NOT IN ('STANTON', 'PYRO', 'NYX') AND deleted = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE uex_star_systems
      SET active = TRUE
      WHERE deleted = FALSE
    `);
  }
}
