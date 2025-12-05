import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationType } from './entities/location.entity';
import {
  LocationDto,
  LocationSearchDto,
  CreateLocationDto,
  UpdateLocationDto,
} from './dto/location.dto';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async findAll(searchDto: LocationSearchDto): Promise<LocationDto[]> {
    const where: any = {
      gameId: searchDto.gameId,
      deleted: false,
      active: true,
    };

    if (searchDto.type) {
      where.locationType = searchDto.type;
    }

    const queryBuilder = this.locationRepository.createQueryBuilder('location');

    queryBuilder.where(where);

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
      locationType: location.locationType,
      displayName: location.displayName,
      shortName: location.shortName,
      hierarchyPath: location.hierarchyPath
        ? JSON.parse(location.hierarchyPath)
        : undefined,
      isAvailable: location.isAvailable,
      isLandable: location.isLandable,
      hasArmistice: location.hasArmistice,
      active: location.active,
    };
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
