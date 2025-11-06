import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationsRolesAndJunctionTable1730841000000
  implements MigrationInterface
{
  name = 'CreateOrganizationsRolesAndJunctionTable1730841000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create role table
    await queryRunner.query(`
            CREATE TABLE "role" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "permissions" jsonb,
                "description" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_role_name" UNIQUE ("name"),
                CONSTRAINT "PK_role" PRIMARY KEY ("id")
            )
        `);

    // Create index on role name
    await queryRunner.query(`
            CREATE INDEX "IDX_role_name" ON "role" ("name")
        `);

    // Create organization table
    await queryRunner.query(`
            CREATE TABLE "organization" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_organization" PRIMARY KEY ("id")
            )
        `);

    // Create user_organization_role junction table
    await queryRunner.query(`
            CREATE TABLE "user_organization_role" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "organizationId" integer NOT NULL,
                "roleId" integer NOT NULL,
                "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_organization_role" PRIMARY KEY ("id")
            )
        `);

    // Create composite indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_user_organization_role_userId_organizationId"
            ON "user_organization_role" ("userId", "organizationId")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_user_organization_role_organizationId_roleId"
            ON "user_organization_role" ("organizationId", "roleId")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_user_organization_role_userId_roleId"
            ON "user_organization_role" ("userId", "roleId")
        `);

    // Create unique constraint to prevent duplicate role assignments
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_user_organization_role_unique"
            ON "user_organization_role" ("userId", "organizationId", "roleId")
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "user_organization_role"
            ADD CONSTRAINT "FK_user_organization_role_user"
            FOREIGN KEY ("userId") REFERENCES "user"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "user_organization_role"
            ADD CONSTRAINT "FK_user_organization_role_organization"
            FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "user_organization_role"
            ADD CONSTRAINT "FK_user_organization_role_role"
            FOREIGN KEY ("roleId") REFERENCES "role"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "user_organization_role"
            DROP CONSTRAINT "FK_user_organization_role_role"
        `);

    await queryRunner.query(`
            ALTER TABLE "user_organization_role"
            DROP CONSTRAINT "FK_user_organization_role_organization"
        `);

    await queryRunner.query(`
            ALTER TABLE "user_organization_role"
            DROP CONSTRAINT "FK_user_organization_role_user"
        `);

    // Drop indexes
    await queryRunner.query(`
            DROP INDEX "IDX_user_organization_role_unique"
        `);

    await queryRunner.query(`
            DROP INDEX "IDX_user_organization_role_userId_roleId"
        `);

    await queryRunner.query(`
            DROP INDEX "IDX_user_organization_role_organizationId_roleId"
        `);

    await queryRunner.query(`
            DROP INDEX "IDX_user_organization_role_userId_organizationId"
        `);

    // Drop tables
    await queryRunner.query(`DROP TABLE "user_organization_role"`);
    await queryRunner.query(`DROP INDEX "IDX_role_name"`);
    await queryRunner.query(`DROP TABLE "organization"`);
    await queryRunner.query(`DROP TABLE "role"`);
  }
}
