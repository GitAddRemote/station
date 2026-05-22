// data-source.ts
import 'dotenv/config'; // Ensure this line is present to load environment variables
import { DataSource } from 'typeorm';
import { User } from './modules/users/user.entity';
import { Organization } from './modules/organizations/organization.entity';
import { Role } from './modules/roles/role.entity';
import { UserOrganizationRole } from './modules/user-organization-roles/user-organization-role.entity';
import { PasswordReset } from './modules/auth/password-reset.entity';
import { AuditLog } from './modules/audit-logs/audit-log.entity';
import { Game } from './modules/games/game.entity';
import { UserInventoryItem } from './modules/user-inventory/entities/user-inventory-item.entity';
import { InventoryAuditLog } from './modules/user-inventory/entities/inventory-audit-log.entity';
import { OrgInventoryItem } from './modules/org-inventory/entities/org-inventory-item.entity';
import { UexCommodity } from './modules/uex/entities/uex-commodity.entity';
import { UexItem } from './modules/uex/entities/uex-item.entity';
import { UexCategory } from './modules/uex/entities/uex-category.entity';
import { UexCompany } from './modules/uex/entities/uex-company.entity';
import { UexStarSystem } from './modules/uex/entities/uex-star-system.entity';
import { UexPlanet } from './modules/uex/entities/uex-planet.entity';
import { UexMoon } from './modules/uex/entities/uex-moon.entity';
import { UexSpaceStation } from './modules/uex/entities/uex-space-station.entity';
import { UexCity } from './modules/uex/entities/uex-city.entity';
import { UexOutpost } from './modules/uex/entities/uex-outpost.entity';
import { UexPoi } from './modules/uex/entities/uex-poi.entity';
import { UexSyncState } from './modules/uex-sync/uex-sync-state.entity';
import { UexSyncConfig } from './modules/uex-sync/uex-sync-config.entity';
import { OauthClient } from './modules/oauth-clients/oauth-client.entity';

import { BigBangBaselineMigration1748000000000 } from './migrations/1748000000000-BigBangBaselineMigration';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '0'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [
    User,
    Organization,
    Role,
    UserOrganizationRole,
    PasswordReset,
    AuditLog,
    Game,
    UserInventoryItem,
    InventoryAuditLog,
    OrgInventoryItem,
    UexCommodity,
    UexItem,
    UexCategory,
    UexCompany,
    UexStarSystem,
    UexPlanet,
    UexMoon,
    UexSpaceStation,
    UexCity,
    UexOutpost,
    UexPoi,
    UexSyncState,
    UexSyncConfig,
    OauthClient,
  ],
  migrations: [BigBangBaselineMigration1748000000000],
  synchronize: false,
  extra: { parseInt8: true },
});

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });
