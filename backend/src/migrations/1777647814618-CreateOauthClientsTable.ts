import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOauthClientsTable1777647814618
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "oauth_clients" (
        "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
        "clientId"         VARCHAR NOT NULL,
        "clientSecretHash" VARCHAR NOT NULL,
        "scopes"           TEXT NOT NULL,
        "isActive"         BOOLEAN NOT NULL DEFAULT true,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_clients" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oauth_clients_clientId" UNIQUE ("clientId")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "oauth_clients"`);
  }
}
