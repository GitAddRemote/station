import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationType } from './entities/location.entity';
import {
  LocationDto,
  LocationSearchDto,
  CreateLocationDto,
  UpdateLocationDto,
  StorableLocationDto,
} from './dto/location.dto';
import { LocationPopulationService } from './location-population.service';
import { In } from 'typeorm';
import { createHash } from 'crypto';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);
  private populatingLocations = false;

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    private readonly locationPopulationService: LocationPopulationService,
  ) {}

  async findAll(searchDto: LocationSearchDto): Promise<LocationDto[]> {
    const gameId = searchDto.gameId || 1;
    await this.ensureLocationsPopulated(gameId);

    const where: Record<string, unknown> = {
      gameId,
      deleted: false,
      active: true,
    };

    if (searchDto.type) {
      where.locationType = searchDto.type;
    }

    const queryBuilder = this.locationRepository.createQueryBuilder('location');

    queryBuilder.where(where);

    if (searchDto.starSystemId) {
      queryBuilder.andWhere('location.star_system_id = :starSystemId', {
        starSystemId: searchDto.starSystemId,
      });
    }

    if (searchDto.search) {
      queryBuilder.andWhere(
        '(location.display_name ILIKE :search OR location.short_name ILIKE :search)',
        { search: `%${searchDto.search}%` },
      );
    }

    queryBuilder.orderBy('location.display_name', 'ASC');
    queryBuilder.take(searchDto.limit || 100);

    const locations = await queryBuilder.getMany();

    return locations.map((location) => this.toDto(location));
  }

  async findStorableLocations(
    gameId: number,
  ): Promise<{ etag: string; locations: StorableLocationDto[] }> {
    await this.ensureLocationsPopulated(gameId);

    const storableTypes: LocationType[] = [
      LocationType.CITY,
      LocationType.SPACE_STATION,
      LocationType.OUTPOST,
      LocationType.POI,
      LocationType.MOON,
      LocationType.PLANET,
    ];

    const baseFilters = {
      gameId,
      deleted: false,
      active: true,
      isAvailable: true,
      locationType: In(storableTypes),
    } as const;

    const locations = await this.locationRepository.find({
      where: baseFilters,
      order: { displayName: 'ASC' },
      select: [
        'id',
        'gameId',
        'locationType',
        'displayName',
        'shortName',
        'hierarchyPath',
        'isAvailable',
        'isLandable',
        'hasArmistice',
      ],
      take: 5000,
    });

    const stats = await this.locationRepository
      .createQueryBuilder('location')
      .select('COUNT(location.id)', 'count')
      .addSelect('MAX(location.date_modified)', 'maxDateModified')
      .where('location.deleted = FALSE')
      .andWhere('location.active = TRUE')
      .andWhere('location.is_available = TRUE')
      .andWhere('location.game_id = :gameId', { gameId })
      .andWhere('location.location_type IN (:...types)', {
        types: storableTypes,
      })
      .getRawOne<{ count: string; maxDateModified: string | null }>();

    const etag = this.createEtag(
      gameId,
      stats?.count ?? '0',
      stats?.maxDateModified ?? '',
    );

    return {
      etag,
      locations: locations.map((location) => this.toStorableDto(location)),
    };
  }

  async findById(id: number): Promise<LocationDto> {
    const location = await this.locationRepository.findOne({
      where: { id, deleted: false },
      relations: this.getRelationsForType(),
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return this.toDto(location);
  }

  async findByType(gameId: number, type: LocationType): Promise<LocationDto[]> {
    const locations = await this.locationRepository.find({
      where: {
        gameId,
        locationType: type,
        deleted: false,
        active: true,
      },
      order: { displayName: 'ASC' },
    });

    return locations.map((location) => this.toDto(location));
  }

  async create(
    createDto: CreateLocationDto,
    userId: number,
  ): Promise<LocationDto> {
    const location = this.locationRepository.create({
      ...createDto,
      addedById: userId,
      modifiedById: userId,
    });

    const saved = await this.locationRepository.save(location);

    this.logger.log(`Created location ${saved.id}: ${saved.displayName}`);

    return this.toDto(saved);
  }

  async update(
    id: number,
    updateDto: UpdateLocationDto,
    userId: number,
  ): Promise<LocationDto> {
    const location = await this.findLocationEntity(id);

    Object.assign(location, updateDto);
    location.modifiedById = userId;
    location.dateModified = new Date();

    const saved = await this.locationRepository.save(location);

    this.logger.log(`Updated location ${saved.id}: ${saved.displayName}`);

    return this.toDto(saved);
  }

  async delete(id: number, userId: number): Promise<void> {
    const location = await this.findLocationEntity(id);

    location.deleted = true;
    location.active = false;
    location.modifiedById = userId;
    location.dateModified = new Date();

    await this.locationRepository.save(location);

    this.logger.log(`Deleted location ${id}`);
  }

  private async ensureLocationsPopulated(gameId: number): Promise<void> {
    const existingCount = await this.locationRepository.count({
      where: { gameId, deleted: false },
    });

    if (existingCount > 0 || this.populatingLocations) {
      return;
    }

    try {
      this.populatingLocations = true;
      await this.locationPopulationService.populateAllLocations();
    } catch (error) {
      this.logger.error(
        'Failed to populate locations from UEX data',
        error as Error,
      );
    } finally {
      this.populatingLocations = false;
    }
  }

  private async findLocationEntity(id: number): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id, deleted: false },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  private toDto(location: Location): LocationDto {
    return {
      id: location.id.toString(),
      gameId: location.gameId,
      starSystemId: location.starSystemId,
      locationType: location.locationType,
      displayName: location.displayName,
      shortName: location.shortName,
      hierarchyPath: this.parseHierarchyPath(location.hierarchyPath),
      isAvailable: location.isAvailable,
      isLandable: location.isLandable,
      hasArmistice: location.hasArmistice,
      active: location.active,
    };
  }

  private toStorableDto(location: Location): StorableLocationDto {
    return {
      id: location.id.toString(),
      gameId: location.gameId,
      locationType: location.locationType,
      displayName: location.displayName,
      shortName: location.shortName,
      hierarchyPath: this.parseHierarchyPath(location.hierarchyPath),
      isAvailable: location.isAvailable,
      isLandable: location.isLandable,
      hasArmistice: location.hasArmistice,
    };
  }

  private parseHierarchyPath(
    hierarchyPath?: string,
  ): Record<string, string> | undefined {
    if (!hierarchyPath) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(hierarchyPath) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, string>;
      }
    } catch (error) {
      this.logger.warn(`Failed to parse hierarchyPath: ${error}`);
    }

    return undefined;
  }

  private createEtag(
    gameId: number,
    count: string,
    maxDateModified: string,
  ): string {
    return createHash('sha256')
      .update(`${gameId}|${count}|${maxDateModified}|storable_v1`)
      .digest('hex');
  }

  private getRelationsForType(): string[] {
    return [
      'starSystem',
      'planet',
      'moon',
      'city',
      'spaceStation',
      'outpost',
      'poi',
    ];
  }
}
