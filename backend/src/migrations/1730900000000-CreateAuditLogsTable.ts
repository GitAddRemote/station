import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuditLogsTable1730900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_log',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'username',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'enum',
            enum: [
              'CREATE',
              'UPDATE',
              'DELETE',
              'LOGIN',
              'LOGOUT',
              'ROLE_ASSIGNED',
              'ROLE_REMOVED',
              'PERMISSION_CHANGED',
            ],
          },
          {
            name: 'entityType',
            type: 'enum',
            enum: [
              'USER',
              'ORGANIZATION',
              'ROLE',
              'USER_ORGANIZATION_ROLE',
              'AUTH',
            ],
          },
          {
            name: 'entityId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'oldValues',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'newValues',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'audit_log',
      new TableIndex({
        name: 'IDX_AUDIT_LOG_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'audit_log',
      new TableIndex({
        name: 'IDX_AUDIT_LOG_ENTITY',
        columnNames: ['entityType', 'entityId'],
      }),
    );

    await queryRunner.createIndex(
      'audit_log',
      new TableIndex({
        name: 'IDX_AUDIT_LOG_ACTION',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'audit_log',
      new TableIndex({
        name: 'IDX_AUDIT_LOG_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_log');
  }
}
