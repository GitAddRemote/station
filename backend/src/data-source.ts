// data-source.ts
import 'dotenv/config'; // Ensure this line is present to load environment variables
import { DataSource } from 'typeorm';
import { User } from './modules/users/user.entity';
import { Organization } from './modules/organizations/organization.entity';
import { Role } from './modules/roles/role.entity';
import { UserOrganizationRole } from './modules/user-organization-roles/user-organization-role.entity';
import { RefreshToken } from './modules/auth/refresh-token.entity';
import { PasswordReset } from './modules/auth/password-reset.entity';
import { AuditLog } from './modules/audit-logs/audit-log.entity';
import { Game } from './modules/games/game.entity';
import { Location } from './modules/locations/entities/location.entity';
import { UserInventoryItem } from './modules/user-inventory/entities/user-inventory-item.entity';
import { InventoryAuditLog } from './modules/user-inventory/entities/inventory-audit-log.entity';
import { OrgInventoryItem } from './modules/org-inventory/entities/org-inventory-item.entity';
import { UexItem } from './modules/uex/entities/uex-item.entity';
import { UexCategory } from './modules/uex/entities/uex-category.entity';
import { UexCompany } from './modules/uex/entities/uex-company.entity';
import { UexStarSystem } from './modules/uex/entities/uex-star-system.entity';
import { UexOrbit } from './modules/uex/entities/uex-orbit.entity';
import { UexPlanet } from './modules/uex/entities/uex-planet.entity';
import { UexMoon } from './modules/uex/entities/uex-moon.entity';
import { UexSpaceStation } from './modules/uex/entities/uex-space-station.entity';
import { UexCity } from './modules/uex/entities/uex-city.entity';
import { UexOutpost } from './modules/uex/entities/uex-outpost.entity';
import { UexPoi } from './modules/uex/entities/uex-poi.entity';
import { UexSyncState } from './modules/uex-sync/uex-sync-state.entity';
import { UexSyncConfig } from './modules/uex-sync/uex-sync-config.entity';

import { CreateUsersTable1716956654528 } from './migrations/1716956654528-CreateUsersTable';
import { CreateOrganizationsRolesAndJunctionTable1730841000000 } from './migrations/1730841000000-CreateOrganizationsRolesAndJunctionTable';
import { CreateAuditLogsTable1730900000000 } from './migrations/1730900000000-CreateAuditLogsTable';
import { CreateRefreshTokenTable1731715200000 } from './migrations/1731715200000-CreateRefreshTokenTable';
import { AddUserProfileFields1732000000000 } from './migrations/1732000000000-AddUserProfileFields';
import { CreatePasswordResetsTable1732050000000 } from './migrations/1732050000000-CreatePasswordResetsTable';
import { CreateGamesTable1733174400000 } from './migrations/1733174400000-CreateGamesTable';
import { AddGameIdToOrganizations1733174500000 } from './migrations/1733174500000-AddGameIdToOrganizations';
import { AddIsSystemUserColumn1764791773398 } from './migrations/1764791773398-AddIsSystemUserColumn';
import { SeedSystemUser1764791795973 } from './migrations/1764791795973-SeedSystemUser';
import { CreateUexBaseTables1764802822073 } from './migrations/1764802822073-CreateUexBaseTables';
import { CreateUexItemsTable1764802975691 } from './migrations/1764802975691-CreateUexItemsTable';
import { CreateUexLocationTables1764803020274 } from './migrations/1764803020274-CreateUexLocationTables';
import { CreateUexOrbitsTable1767050000000 } from './migrations/1767050000000-CreateUexOrbitsTable';
import { AddOrbitRelationsToUexLocations1767051000000 } from './migrations/1767051000000-AddOrbitRelationsToUexLocations';
import { AddUexSyncStateTables1764812815840 } from './migrations/1764812815840-AddUexSyncStateTables';
import { CreateLocationsTable1764949892544 } from './migrations/1764949892544-CreateLocationsTable';
import { CreateUserInventoryItemsTable1764950546163 } from './migrations/1764950546163-CreateUserInventoryItemsTable';
import { CreateInventoryAuditLogTable1764950688227 } from './migrations/1764950688227-CreateInventoryAuditLogTable';
import { AddAutoUnshareInventoryTrigger1764950720430 } from './migrations/1764950720430-AddAutoUnshareInventoryTrigger';
import { AddOrgInventorySummaryView1764950757207 } from './migrations/1764950757207-AddOrgInventorySummaryView';
import { SeedInventoryManagerRole1764961461064 } from './migrations/1764961461064-SeedInventoryManagerRole';
import { CreateOrgInventoryItemsTable1764964935270 } from './migrations/1764964935270-CreateOrgInventoryItemsTable';
import { AddUserInventoryUniqueIndex1765035000000 } from './migrations/1765035000000-AddUserInventoryUniqueIndex';

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
    RefreshToken,
    PasswordReset,
    AuditLog,
    Game,
    Location,
    UserInventoryItem,
    InventoryAuditLog,
    OrgInventoryItem,
    UexItem,
    UexCategory,
    UexCompany,
    UexStarSystem,
    UexOrbit,
    UexPlanet,
    UexMoon,
    UexSpaceStation,
    UexCity,
    UexOutpost,
    UexPoi,
    UexSyncState,
    UexSyncConfig,
  ],
  migrations: [
    // Core user/org/auth setup
    CreateUsersTable1716956654528,
    AddIsSystemUserColumn1764791773398,
    SeedSystemUser1764791795973,
    CreateOrganizationsRolesAndJunctionTable1730841000000,
    CreateAuditLogsTable1730900000000,
    CreateRefreshTokenTable1731715200000,
    AddUserProfileFields1732000000000,
    CreatePasswordResetsTable1732050000000,

    // Games must come before locations
    CreateGamesTable1733174400000,
    AddGameIdToOrganizations1733174500000,

    // UEX tables (base entities for items/locations)
    CreateUexBaseTables1764802822073,
    CreateUexItemsTable1764802975691,
    CreateUexLocationTables1764803020274,
    CreateUexOrbitsTable1767050000000,
    AddOrbitRelationsToUexLocations1767051000000,
    AddUexSyncStateTables1764812815840,

    // Locations (depends on games + UEX tables)
    CreateLocationsTable1764949892544,

    // Inventory (depends on locations, games, UEX items)
    CreateUserInventoryItemsTable1764950546163,
    CreateInventoryAuditLogTable1764950688227,
    AddAutoUnshareInventoryTrigger1764950720430,
    AddOrgInventorySummaryView1764950757207,
    SeedInventoryManagerRole1764961461064,
    CreateOrgInventoryItemsTable1764964935270,
    AddUserInventoryUniqueIndex1765035000000,
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
