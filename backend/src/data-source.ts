// data-source.ts
import 'dotenv/config'; // Ensure this line is present to load environment variables
import { DataSource } from 'typeorm';
import { User } from './modules/users/user.entity';
import { Organization } from './modules/organizations/organization.entity';
import { Role } from './modules/roles/role.entity';
import { UserOrganizationRole } from './modules/user-organization-roles/user-organization-role.entity';
import { RefreshToken } from './modules/auth/refresh-token.entity';
import { CreateUsersTable1716956654528 } from './migrations/1716956654528-CreateUsersTable';
import { CreateOrganizationsRolesAndJunctionTable1730841000000 } from './migrations/1730841000000-CreateOrganizationsRolesAndJunctionTable';
import { CreateRefreshTokenTable1731715200000 } from './migrations/1731715200000-CreateRefreshTokenTable';
import { AddUserProfileFields1732000000000 } from './migrations/1732000000000-AddUserProfileFields';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '0'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, Organization, Role, UserOrganizationRole, RefreshToken],
  migrations: [
    CreateUsersTable1716956654528,
    CreateOrganizationsRolesAndJunctionTable1730841000000,
    CreateRefreshTokenTable1731715200000,
    AddUserProfileFields1732000000000,
  ],
  synchronize: false,
});

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });
