import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { StationCatalogEntry } from '../catalog/entities/station-catalog-entry.entity';
import { StationLocation } from '../locations/entities/station-location.entity';
import { Organization } from '../organizations/organization.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { UserOrganizationRolesService } from '../user-organization-roles/user-organization-roles.service';
import { User } from '../users/user.entity';
import { AddInventoryListItemDto } from './dto/add-inventory-list-item.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryListDto } from './dto/create-inventory-list.dto';
import { InventoryListDto } from './dto/inventory-list.dto';
import { InventoryListItemDto } from './dto/inventory-list-item.dto';
import {
  InventoryItemDto,
  InventorySummaryCategoryDto,
  InventorySummaryDto,
  PaginatedInventoryItemsDto,
} from './dto/inventory-item.dto';
import { ListInventoryItemsDto } from './dto/list-inventory-items.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationInventoryListItem } from './entities/station-inventory-list-item.entity';
import { StationInventoryList } from './entities/station-inventory-list.entity';
import { StationUnitOfMeasure } from './entities/station-unit-of-measure.entity';

@Injectable()
export class InventoryService {
  private static readonly MAX_USER_LISTS = 5;
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MANAGE_ORG_INVENTORY_PERMISSION =
    'canManageInventory';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(StationCatalogEntry)
    private readonly catalogEntryRepository: Repository<StationCatalogEntry>,
    @InjectRepository(StationLocation)
    private readonly locationRepository: Repository<StationLocation>,
    @InjectRepository(StationUnitOfMeasure)
    private readonly unitOfMeasureRepository: Repository<StationUnitOfMeasure>,
    @InjectRepository(StationInventoryItem)
    private readonly inventoryItemRepository: Repository<StationInventoryItem>,
    @InjectRepository(StationInventoryList)
    private readonly inventoryListRepository: Repository<StationInventoryList>,
    @InjectRepository(StationInventoryListItem)
    private readonly inventoryListItemRepository: Repository<StationInventoryListItem>,
    private readonly dataSource: DataSource,
    private readonly permissionsService: PermissionsService,
    private readonly userOrganizationRolesService: UserOrganizationRolesService,
  ) {}

  async createItem(
    userId: number,
    dto: CreateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    const currentUser = await this.getUserOrThrow(userId);
    const ownership = await this.resolveCreateOwnership(currentUser, dto);
    const catalogEntry = await this.getCatalogEntryOrThrow(dto.catalogEntryId);
    const unitOfMeasure = await this.getUnitOfMeasureOrThrow(
      dto.unitOfMeasureId,
    );
    const location =
      dto.locationId === null
        ? await this.getDefaultLocationOrThrow()
        : dto.locationId
          ? await this.getLocationOrThrow(dto.locationId)
          : await this.getDefaultLocationOrThrow();

    this.validateQuality(dto.quality);
    this.validateQuantityAndUomPolicy({
      catalogKind: catalogEntry.catalogKind,
      quantity: dto.quantity,
      unitCode: unitOfMeasure.abbreviation,
    });

    const item = this.inventoryItemRepository.create({
      ownerType: ownership.ownerType,
      ownerId: ownership.ownerId,
      catalogEntryId: catalogEntry.id,
      catalogKind: catalogEntry.catalogKind,
      locationId: location.id,
      unitOfMeasureId: unitOfMeasure.id,
      quantity: dto.quantity.toFixed(6),
      quality: dto.quality ?? null,
      isOrgAvailable: dto.isOrgAvailable ?? false,
      alias: dto.customName?.trim() || null,
      notes: dto.notes?.trim() || null,
      effectiveProperties: null,
    });

    const saved = await this.inventoryItemRepository.save(item);
    return this.getInventoryItemOrThrow(saved.id);
  }

  async listItems(
    userId: number,
    query: ListInventoryItemsDto,
  ): Promise<PaginatedInventoryItemsDto> {
    const normalizedPage = query.page ?? InventoryService.DEFAULT_PAGE;
    const normalizedLimit = query.limit ?? InventoryService.DEFAULT_LIMIT;
    const currentUser = await this.getUserOrThrow(userId);
    const context = await this.resolveListContext(currentUser, query);

    const queryBuilder = this.createInventoryBaseQueryBuilder();
    this.applyListFilters(queryBuilder, context, query);

    queryBuilder
      .orderBy('item.updatedAt', 'DESC')
      .skip((normalizedPage - 1) * normalizedLimit)
      .take(normalizedLimit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const response: PaginatedInventoryItemsDto = {
      data: items.map((item) => this.toInventoryItemDto(item)),
      total,
      page: normalizedPage,
      limit: normalizedLimit,
    };

    if (query.includeSummary && context.scope === 'org') {
      const summaryQueryBuilder = this.createInventoryBaseQueryBuilder();
      this.applyListFilters(summaryQueryBuilder, context, query);
      const summaryItems = await summaryQueryBuilder.getMany();

      response.summary = this.buildSummary(summaryItems);
    }

    return response;
  }

  async updateItem(
    userId: number,
    itemId: string,
    dto: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    const item = await this.inventoryItemRepository.findOne({
      where: { id: itemId },
      relations: [
        'catalogEntry',
        'catalogEntry.category',
        'location',
        'unitOfMeasure',
      ],
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.assertCanManageItem(userId, item);

    const nextQuantity = dto.quantity ?? Number(item.quantity);
    const nextUnitOfMeasure = dto.unitOfMeasureId
      ? await this.getUnitOfMeasureOrThrow(dto.unitOfMeasureId)
      : item.unitOfMeasure;

    if (dto.locationId !== undefined) {
      const location =
        dto.locationId === null
          ? await this.getDefaultLocationOrThrow()
          : await this.getLocationOrThrow(dto.locationId);
      item.locationId = location.id;
      item.location = location;
    }

    if (dto.quality !== undefined) {
      this.validateQuality(dto.quality);
      item.quality = dto.quality;
    }

    if (dto.notes !== undefined) {
      item.notes = dto.notes?.trim() || null;
    }

    if (dto.customName !== undefined) {
      item.alias = dto.customName?.trim() || null;
    }

    if (dto.isOrgAvailable !== undefined) {
      item.isOrgAvailable = dto.isOrgAvailable;
    }

    this.validateQuantityAndUomPolicy({
      catalogKind: item.catalogKind,
      quantity: nextQuantity,
      unitCode: nextUnitOfMeasure.abbreviation,
    });

    item.quantity = nextQuantity.toFixed(6);
    item.unitOfMeasureId = nextUnitOfMeasure.id;
    item.unitOfMeasure = nextUnitOfMeasure;

    await this.inventoryItemRepository.save(item);
    return this.getInventoryItemOrThrow(item.id);
  }

  async deleteItem(userId: number, itemId: string): Promise<void> {
    const item = await this.inventoryItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.assertCanManageItem(userId, item);
    await this.inventoryItemRepository.delete({ id: itemId });
  }

  async createList(
    userId: number,
    dto: CreateInventoryListDto,
  ): Promise<InventoryListDto> {
    const ownerId = await this.getUserOwnerUuid(userId);
    const name = dto.name.trim();

    const saved = await this.dataSource.transaction(
      'REPEATABLE READ',
      async (manager) => {
        const existingCount = await manager.count(StationInventoryList, {
          where: { ownerType: 'user', ownerId },
        });

        if (existingCount >= InventoryService.MAX_USER_LISTS) {
          throw new UnprocessableEntityException(
            'Users may only have up to 5 inventory lists',
          );
        }

        const list = manager.create(StationInventoryList, {
          ownerType: 'user',
          ownerId,
          name,
          isShared: false,
        });

        return manager.save(StationInventoryList, list);
      },
    );

    return this.toInventoryListDto(saved);
  }

  async listLists(userId: number): Promise<InventoryListDto[]> {
    const ownerId = await this.getUserOwnerUuid(userId);
    const lists = await this.inventoryListRepository.find({
      where: { ownerType: 'user', ownerId },
      order: { createdAt: 'ASC' },
    });

    return lists.map((list) => this.toInventoryListDto(list));
  }

  async deleteList(userId: number, listId: string): Promise<void> {
    const list = await this.getOwnedUserListOrThrow(userId, listId);
    await this.inventoryListRepository.delete({ id: list.id });
  }

  async addItemToList(
    userId: number,
    listId: string,
    dto: AddInventoryListItemDto,
  ): Promise<InventoryListItemDto> {
    const ownerId = await this.getUserOwnerUuid(userId);
    await this.getOwnedUserListByOwnerIdOrThrow(ownerId, listId);

    const inventoryItem = await this.inventoryItemRepository.findOne({
      where: {
        id: dto.inventoryItemId,
        ownerType: 'user',
        ownerId,
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Inventory item not found');
    }

    const listItem = this.inventoryListItemRepository.create({
      listId,
      inventoryItemId: dto.inventoryItemId,
    });

    try {
      const saved = await this.inventoryListItemRepository.save(listItem);
      return this.toInventoryListItemDto(saved);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const existing = await this.inventoryListItemRepository.findOne({
          where: { listId, inventoryItemId: dto.inventoryItemId },
        });
        return this.toInventoryListItemDto(existing!);
      }
      throw error;
    }
  }

  async removeItemFromList(
    userId: number,
    listId: string,
    inventoryItemId: string,
  ): Promise<void> {
    await this.getOwnedUserListOrThrow(userId, listId);

    const result = await this.inventoryListItemRepository.delete({
      listId,
      inventoryItemId,
    });

    if (!result.affected) {
      throw new NotFoundException('Inventory list item not found');
    }
  }

  private async getUserOwnerUuid(userId: number): Promise<string> {
    const user = await this.getUserOrThrow(userId);
    return user.idUuid;
  }

  private async getUserOrThrow(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isSystemUser: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async resolveCreateOwnership(
    currentUser: User,
    dto: CreateInventoryItemDto,
  ): Promise<{ ownerType: 'user' | 'org'; ownerId: string }> {
    const ownerType = dto.ownerType ?? 'user';

    if (ownerType === 'user') {
      const ownerId = dto.ownerId ?? currentUser.idUuid;
      if (ownerId !== currentUser.idUuid) {
        throw new ForbiddenException(
          'Users may only create inventory items for themselves',
        );
      }

      return { ownerType, ownerId };
    }

    if (!dto.ownerId) {
      throw new BadRequestException('ownerId is required for org inventory');
    }

    const organization = await this.getOrganizationByUuidOrThrow(dto.ownerId);
    await this.assertCanManageOrganizationInventory(
      currentUser.id,
      organization.id,
    );

    return { ownerType, ownerId: organization.idUuid };
  }

  private async resolveListContext(
    currentUser: User,
    query: ListInventoryItemsDto,
  ): Promise<
    | { scope: 'user'; ownerId: string }
    | { scope: 'org'; ownerId: string; memberOwnerIds: string[] }
  > {
    const ownerType = query.ownerType ?? 'user';

    if (ownerType === 'user') {
      const requestedOwnerId = query.ownerId ?? currentUser.idUuid;
      if (requestedOwnerId !== currentUser.idUuid) {
        throw new ForbiddenException('Users may only view their own inventory');
      }

      return { scope: 'user', ownerId: requestedOwnerId };
    }

    const requestedOrgId = query.ownerId ?? query.orgId;
    if (!requestedOrgId) {
      throw new BadRequestException('ownerId is required for org inventory');
    }

    const organization =
      await this.getOrganizationByUuidOrThrow(requestedOrgId);
    const memberships =
      await this.userOrganizationRolesService.getUserOrganizations(
        currentUser.id,
      );

    if (
      !memberships.some(
        (membership) => membership.organizationId === organization.id,
      )
    ) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const members =
      await this.userOrganizationRolesService.getOrganizationMembers(
        organization.id,
      );
    const memberUserIds = Array.from(
      new Set(members.map((member) => member.userId)),
    );
    const memberUsers =
      memberUserIds.length === 0
        ? []
        : await this.userRepository.find({
            where: { id: In(memberUserIds), isSystemUser: false },
          });

    return {
      scope: 'org',
      ownerId: organization.idUuid,
      memberOwnerIds: memberUsers.map((user) => user.idUuid),
    };
  }

  private createInventoryBaseQueryBuilder() {
    return this.inventoryItemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.catalogEntry', 'catalogEntry')
      .innerJoinAndSelect('catalogEntry.category', 'category')
      .innerJoinAndSelect('item.unitOfMeasure', 'unitOfMeasure')
      .leftJoinAndSelect('item.location', 'location');
  }

  private applyListFilters(
    queryBuilder: ReturnType<
      InventoryService['createInventoryBaseQueryBuilder']
    >,
    context:
      | { scope: 'user'; ownerId: string }
      | { scope: 'org'; ownerId: string; memberOwnerIds: string[] },
    query: ListInventoryItemsDto,
  ): void {
    if (context.scope === 'user') {
      queryBuilder.where('item.owner_type = :ownerType', { ownerType: 'user' });
      queryBuilder.andWhere('item.owner_id = :ownerId', {
        ownerId: context.ownerId,
      });

      if (query.orgAvailable !== undefined) {
        queryBuilder.andWhere('item.is_org_available = :orgAvailable', {
          orgAvailable: query.orgAvailable,
        });
      }
    } else {
      queryBuilder.where(
        new Brackets((qb) => {
          qb.where(
            'item.owner_type = :orgOwnerType AND item.owner_id = :orgOwnerId',
            {
              orgOwnerType: 'org',
              orgOwnerId: context.ownerId,
            },
          );

          if (context.memberOwnerIds.length > 0) {
            qb.orWhere(
              'item.owner_type = :userOwnerType AND item.is_org_available = TRUE AND item.owner_id IN (:...memberOwnerIds)',
              {
                userOwnerType: 'user',
                memberOwnerIds: context.memberOwnerIds,
              },
            );
          }
        }),
      );
    }

    if (query.catalogKind) {
      queryBuilder.andWhere('item.catalog_kind = :catalogKind', {
        catalogKind: query.catalogKind,
      });
    }

    if (query.categoryId) {
      queryBuilder.andWhere('catalogEntry.category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }
  }

  private async getInventoryItemOrThrow(
    itemId: string,
  ): Promise<InventoryItemDto> {
    const item = await this.inventoryItemRepository.findOne({
      where: { id: itemId },
      relations: [
        'catalogEntry',
        'catalogEntry.category',
        'location',
        'unitOfMeasure',
      ],
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return this.toInventoryItemDto(item);
  }

  private async getOrganizationByUuidOrThrow(
    organizationUuid: string,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { idUuid: organizationUuid, isActive: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  private async getCatalogEntryOrThrow(
    catalogEntryId: string,
  ): Promise<StationCatalogEntry> {
    const entry = await this.catalogEntryRepository.findOne({
      where: { id: catalogEntryId, isAvailableLive: true },
      relations: ['category'],
    });

    if (!entry) {
      throw new NotFoundException('Catalog entry not found');
    }

    return entry;
  }

  private async getLocationOrThrow(
    locationId: string,
  ): Promise<StationLocation> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  private async getDefaultLocationOrThrow(): Promise<StationLocation> {
    const location = await this.locationRepository.findOne({
      where: { slug: 'unknown' },
    });

    if (!location) {
      throw new NotFoundException('Default inventory location not found');
    }

    return location;
  }

  private async getUnitOfMeasureOrThrow(
    unitOfMeasureId: string,
  ): Promise<StationUnitOfMeasure> {
    const unit = await this.unitOfMeasureRepository.findOne({
      where: { id: unitOfMeasureId },
    });

    if (!unit) {
      throw new NotFoundException('Unit of measure not found');
    }

    return unit;
  }

  private validateQuality(quality: number | null | undefined): void {
    if (quality === null || quality === undefined) {
      return;
    }

    if (!Number.isInteger(quality) || quality < 0) {
      throw new BadRequestException('Quality must be a non-negative integer');
    }
  }

  private validateQuantityAndUomPolicy(params: {
    catalogKind: 'item' | 'commodity' | 'vehicle';
    quantity: number;
    unitCode: string;
  }): void {
    const { catalogKind, quantity, unitCode } = params;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (
      (catalogKind === 'item' || catalogKind === 'vehicle') &&
      !Number.isInteger(quantity)
    ) {
      throw new BadRequestException(
        'Discrete item and vehicle quantities must be whole numbers',
      );
    }

    const normalizedUnitCode = unitCode.toLowerCase();
    const allowedCodes =
      catalogKind === 'commodity'
        ? new Set(['scu', 'cscu', 'uscu'])
        : new Set(['unit']);

    if (!allowedCodes.has(normalizedUnitCode)) {
      throw new BadRequestException(
        `Unit of measure ${unitCode} is not allowed for ${catalogKind} inventory`,
      );
    }
  }

  private async assertCanManageOrganizationInventory(
    userId: number,
    organizationId: number,
  ): Promise<void> {
    const memberships =
      await this.userOrganizationRolesService.getUserOrganizations(userId);

    if (
      !memberships.some(
        (membership) => membership.organizationId === organizationId,
      )
    ) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const hasPermission = await this.permissionsService.hasPermission(
      userId,
      organizationId,
      InventoryService.MANAGE_ORG_INVENTORY_PERMISSION,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to manage this organization inventory',
      );
    }
  }

  private async assertCanManageItem(
    userId: number,
    item: StationInventoryItem,
  ): Promise<void> {
    const currentUserOwnerUuid = await this.getUserOwnerUuid(userId);

    if (item.ownerType === 'user') {
      if (item.ownerId !== currentUserOwnerUuid) {
        throw new ForbiddenException('You do not own this inventory item');
      }

      return;
    }

    const organization = await this.getOrganizationByUuidOrThrow(item.ownerId);
    await this.assertCanManageOrganizationInventory(userId, organization.id);
  }

  private async getOwnedUserListOrThrow(
    userId: number,
    listId: string,
  ): Promise<StationInventoryList> {
    const ownerId = await this.getUserOwnerUuid(userId);
    return this.getOwnedUserListByOwnerIdOrThrow(ownerId, listId);
  }

  // Intentionally user-only; org lists are not yet supported
  private async getOwnedUserListByOwnerIdOrThrow(
    ownerId: string,
    listId: string,
  ): Promise<StationInventoryList> {
    const list = await this.inventoryListRepository.findOne({
      where: {
        id: listId,
        ownerType: 'user',
        ownerId,
      },
    });

    if (!list) {
      throw new NotFoundException('Inventory list not found');
    }

    return list;
  }

  private toInventoryListDto(list: StationInventoryList): InventoryListDto {
    return {
      id: list.id,
      name: list.name,
      isShared: list.isShared,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  }

  private toInventoryListItemDto(
    listItem: StationInventoryListItem,
  ): InventoryListItemDto {
    return {
      listId: listItem.listId,
      inventoryItemId: listItem.inventoryItemId,
      createdAt: listItem.createdAt,
    };
  }

  private toInventoryItemDto(item: StationInventoryItem): InventoryItemDto {
    return {
      id: item.id,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      catalogEntryId: item.catalogEntryId,
      catalogKind: item.catalogKind,
      itemName: item.catalogEntry.name,
      categoryId: item.catalogEntry.categoryId,
      categoryName: item.catalogEntry.category.name,
      categoryPath: item.catalogEntry.category.path,
      locationId: item.locationId ?? null,
      locationName: item.location?.name ?? null,
      unitOfMeasureId: item.unitOfMeasureId,
      unitOfMeasureCode: item.unitOfMeasure.abbreviation,
      unitOfMeasureLabel: item.unitOfMeasure.name,
      unitOfMeasureDescription: null,
      quantity: Number(item.quantity),
      quality: item.quality,
      isOrgAvailable: item.isOrgAvailable,
      alias: item.alias,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private buildSummary(items: StationInventoryItem[]): InventorySummaryDto {
    const byCategory = new Map<string, InventorySummaryCategoryDto>();
    let totalQuantity = 0;

    for (const item of items) {
      const quantity = Number(item.quantity);
      totalQuantity += quantity;
      const existing = byCategory.get(item.catalogEntry.categoryId);

      if (existing) {
        existing.totalQuantity += quantity;
        continue;
      }

      byCategory.set(item.catalogEntry.categoryId, {
        categoryId: item.catalogEntry.categoryId,
        categoryName: item.catalogEntry.category.name,
        categoryPath: item.catalogEntry.category.path,
        totalQuantity: quantity,
      });
    }

    return {
      totalItems: items.length,
      totalQuantity,
      byCategory: Array.from(byCategory.values()).sort((a, b) =>
        a.categoryPath.localeCompare(b.categoryPath),
      ),
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    (('code' in error && error.code === '23505') ||
      ('driverError' in error &&
        error.driverError !== null &&
        typeof error.driverError === 'object' &&
        'code' in error.driverError &&
        error.driverError.code === '23505'))
  );
}
