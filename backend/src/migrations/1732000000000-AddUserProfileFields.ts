import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserProfileFields1732000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'firstName',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'lastName',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'phoneNumber',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'bio',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'bio');
    await queryRunner.dropColumn('user', 'phoneNumber');
    await queryRunner.dropColumn('user', 'lastName');
    await queryRunner.dropColumn('user', 'firstName');
  }
}
