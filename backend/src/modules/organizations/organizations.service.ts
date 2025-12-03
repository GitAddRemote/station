import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Organization } from './organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { GamesService } from '../games/games.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private gamesService: GamesService,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    // Set default game if not provided
    if (!createOrganizationDto.gameId) {
      const defaultGame = await this.gamesService.getDefaultGame();
      createOrganizationDto.gameId = defaultGame.id;
    }

    const organization = this.organizationsRepository.create(
      createOrganizationDto,
    );
    return this.organizationsRepository.save(organization);
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async findWithMembers(id: number): Promise<Organization> {
    const cacheKey = `org:${id}:members`;

    // Try to get from cache
    const cached = await this.cacheManager.get<Organization>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: [
        'userOrganizationRoles',
        'userOrganizationRoles.user',
        'userOrganizationRoles.role',
      ],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Store in cache with 5 minute TTL
    await this.cacheManager.set(cacheKey, organization, 300000);

    return organization;
  }

  async update(
    id: number,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.findOne(id);
    Object.assign(organization, updateOrganizationDto);
    const updated = await this.organizationsRepository.save(organization);

    // Invalidate cache
    await this.cacheManager.del(`org:${id}:members`);

    return updated;
  }

  async remove(id: number): Promise<void> {
    const organization = await this.findOne(id);
    await this.organizationsRepository.remove(organization);

    // Invalidate cache
    await this.cacheManager.del(`org:${id}:members`);
  }
}
