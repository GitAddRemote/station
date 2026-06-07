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
import { StationCatalogCategory } from './modules/catalog/entities/station-catalog-category.entity';
import { StationUexCategoryMap } from './modules/catalog/entities/station-uex-category-map.entity';
import { UexCommodityCategoryMap } from './modules/uex/entities/uex-commodity-category-map.entity';

import { BigBangBaselineMigration1748000000000 } from './migrations/1748000000000-BigBangBaselineMigration';
import { CatalogEtlSchemaMigration1748000000001 } from './migrations/1748000000001-CatalogEtlSchemaMigration';
import { AddNoStepsEtlStatus1748000000002 } from './migrations/1748000000002-AddNoStepsEtlStatus';
import { AddDiscordAuthToUsers1779608598950 } from './migrations/1779608598950-1748100000000-AddDiscordAuthToUsers';
import { AddPasswordExpiryToUsers1779642418093 } from './migrations/1779642418093-AddPasswordExpiryToUsers';
import { AlterJumpPointsForSyntheticRows1779664556916 } from './migrations/1779664556916-AlterJumpPointsForSyntheticRows';
import { FixCategoriesSectionTypeExpressionIndex1779700000000 } from './migrations/1779700000000-FixCategoriesSectionTypeExpressionIndex';
import { AddStepNameToEtlRun1779710000000 } from './migrations/1779710000000-AddStepNameToEtlRun';
import { AddUniqueUuidToStationItem1780010901444 } from './migrations/1780010901444-AddUniqueUuidToStationItem';
import { MakeItemFksDeferrable1780020000000 } from './migrations/1780020000000-MakeItemFksDeferrable';
import { MigrateTablePksToUuidV71780030000000 } from './migrations/1780030000000-MigrateTablePksToUuidV7';
import { AddStationCatalogCategory1780040000000 } from './migrations/1780040000000-AddStationCatalogCategory';
import { AddCatalogCategoryMaps1780060000000 } from './migrations/1780060000000-AddCatalogCategoryMaps';

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
    StationCatalogCategory,
    StationUexCategoryMap,
    UexCommodityCategoryMap,
  ],
  migrations: [
    BigBangBaselineMigration1748000000000,
    CatalogEtlSchemaMigration1748000000001,
    AddNoStepsEtlStatus1748000000002,
    AddDiscordAuthToUsers1779608598950,
    AddPasswordExpiryToUsers1779642418093,
    AlterJumpPointsForSyntheticRows1779664556916,
    FixCategoriesSectionTypeExpressionIndex1779700000000,
    AddStepNameToEtlRun1779710000000,
    AddUniqueUuidToStationItem1780010901444,
    MakeItemFksDeferrable1780020000000,
    MigrateTablePksToUuidV71780030000000,
    AddStationCatalogCategory1780040000000,
    AddCatalogCategoryMaps1780060000000,
  ],
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
