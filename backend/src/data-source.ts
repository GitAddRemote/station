// data-source.ts
import 'dotenv/config'; // Ensure this line is present to load environment variables
import { DataSource } from 'typeorm';
import { User } from './modules/users/user.entity';
import { Organization } from './modules/organizations/organization.entity';
import { Role } from './modules/roles/role.entity';
import { UserOrganizationRole } from './modules/user-organization-roles/user-organization-role.entity';
import { PasswordReset } from './modules/auth/password-reset.entity';
import { AuthInvite } from './modules/auth/auth-invite.entity';
import { AuditLog } from './modules/audit-logs/audit-log.entity';
import { Game } from './modules/games/game.entity';
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
import { StationDataSource } from './modules/locations/entities/station-data-source.entity';
import { StationLocation } from './modules/locations/entities/station-location.entity';
import { StationCatalogEntry } from './modules/catalog/entities/station-catalog-entry.entity';
import { StationUnitOfMeasure } from './modules/inventory/entities/station-unit-of-measure.entity';
import { StationInventoryItem } from './modules/inventory/entities/station-inventory-item.entity';
import { StationInventoryList } from './modules/inventory/entities/station-inventory-list.entity';
import { StationInventoryListItem } from './modules/inventory/entities/station-inventory-list-item.entity';

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
import { DropCategoryAttributeFkAndAddPoiSubtype1780040000000 } from './migrations/1780040000000-DropCategoryAttributeFkAndAddPoiSubtype';
import { AddStationLocationProjection1780050000000 } from './migrations/1780050000000-AddStationLocationProjection';
import { AddCatalogCategoryMaps1780060000000 } from './migrations/1780060000000-AddCatalogCategoryMaps';
import { AddStationCatalogEntry1780070000000 } from './migrations/1780070000000-AddStationCatalogEntry';
import { AddInventoryTables1780080000000 } from './migrations/1780080000000-AddInventoryTables';
import { AddInventoryListTables1780090000000 } from './migrations/1780090000000-AddInventoryListTables';
import { UpgradeStationUnitOfMeasureReferenceData1780100000000 } from './migrations/1780100000000-UpgradeStationUnitOfMeasureReferenceData';
import { AddUuidV7IdentityToUsersAndOrganizations1780110000000 } from './migrations/1780110000000-AddUuidV7IdentityToUsersAndOrganizations';
import { FixCatalogEtlCommodityWeightScuType1780120000000 } from './migrations/1780120000000-FixCatalogEtlCommodityWeightScuType';
import { MigrateRemainingEntitiesToUuidV7_1780130000000 } from './migrations/1780130000000-MigrateRemainingEntitiesToUuidV7';
import { AddManageInventoryPermissionToManagementRoles_1780140000000 } from './migrations/1780140000000-AddManageInventoryPermissionToManagementRoles';
import { AddIsSuperAdminToUser1780150000000 } from './migrations/1780150000000-AddIsSuperAdminToUser';
import { AddOrgGuildMappingAndStationBotPermissions1780160000000 } from './migrations/1780160000000-AddOrgGuildMappingAndStationBotPermissions';
import { RemoveOrgInventorySharing1780170000000 } from './migrations/1780170000000-RemoveOrgInventorySharing';
import { AddContractsTables1780170000000 } from './migrations/1780170000000-AddContractsTables';
import { AddInventoryBatches1780180000000 } from './migrations/1780180000000-AddInventoryBatches';
import { AddUuidDefaultsToMissingPkColumns1780190000000 } from './migrations/1780190000000-AddUuidDefaultsToMissingPkColumns';
import { AddContractStatusHistory1780200000000 } from './migrations/1780200000000-AddContractStatusHistory';
import { OrgGuildMapping } from './modules/station-bot-admin/entities/org-guild-mapping.entity';
import { StationInventoryBatch } from './modules/inventory/entities/station-inventory-batch.entity';
import { BusinessUnit } from './modules/business-units/business-unit.entity';
import { AddBusinessUnits1780210000000 } from './migrations/1780210000000-AddBusinessUnits';
import { AddSoftDeleteToUsersAndMemberships1780220000000 } from './migrations/1780220000000-AddSoftDeleteToUsersAndMemberships';
import { AddOrgPriorityToUserOrganizationRole1780230000000 } from './migrations/1780230000000-AddOrgPriorityToUserOrganizationRole';
import { AddBusinessUnitToContractParty1780240000000 } from './migrations/1780240000000-AddBusinessUnitToContractParty';
import { AddAuthInvite1780250000000 } from './migrations/1780250000000-AddAuthInvite';

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
    AuthInvite,
    AuditLog,
    Game,
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
    StationDataSource,
    StationLocation,
    StationCatalogEntry,
    StationUnitOfMeasure,
    StationInventoryItem,
    StationInventoryBatch,
    StationInventoryList,
    StationInventoryListItem,
    OrgGuildMapping,
    BusinessUnit,
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
    DropCategoryAttributeFkAndAddPoiSubtype1780040000000,
    AddStationLocationProjection1780050000000,
    AddCatalogCategoryMaps1780060000000,
    AddStationCatalogEntry1780070000000,
    AddInventoryTables1780080000000,
    AddInventoryListTables1780090000000,
    UpgradeStationUnitOfMeasureReferenceData1780100000000,
    AddUuidV7IdentityToUsersAndOrganizations1780110000000,
    FixCatalogEtlCommodityWeightScuType1780120000000,
    MigrateRemainingEntitiesToUuidV7_1780130000000,
    AddManageInventoryPermissionToManagementRoles_1780140000000,
    AddIsSuperAdminToUser1780150000000,
    AddOrgGuildMappingAndStationBotPermissions1780160000000,
    RemoveOrgInventorySharing1780170000000,
    AddContractsTables1780170000000,
    AddInventoryBatches1780180000000,
    AddUuidDefaultsToMissingPkColumns1780190000000,
    AddContractStatusHistory1780200000000,
    AddBusinessUnits1780210000000,
    AddSoftDeleteToUsersAndMemberships1780220000000,
    AddOrgPriorityToUserOrganizationRole1780230000000,
    AddBusinessUnitToContractParty1780240000000,
    AddAuthInvite1780250000000,
  ],
  synchronize: false,
  extra: { parseInt8: true },
});
