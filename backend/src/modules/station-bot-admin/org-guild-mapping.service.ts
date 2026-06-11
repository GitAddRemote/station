import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgGuildMapping } from './entities/org-guild-mapping.entity';
import { UpsertGuildMappingDto } from './dto/upsert-guild-mapping.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { OrgPermission } from '../permissions/permissions.constants';

@Injectable()
export class OrgGuildMappingService {
  constructor(
    @InjectRepository(OrgGuildMapping)
    private readonly repo: Repository<OrgGuildMapping>,
    private readonly permissions: PermissionsService,
  ) {}

  /** Returns all active guild mappings the given user can view. */
  async findForUser(userId: string): Promise<OrgGuildMapping[]> {
    const all = await this.repo.find({
      where: { isActive: true },
      relations: ['organization'],
      order: { createdAt: 'ASC' },
    });

    const visible: OrgGuildMapping[] = [];
    for (const mapping of all) {
      const can = await this.permissions.hasPermission(
        userId,
        mapping.organizationId,
        OrgPermission.CAN_VIEW_STATION_BOT_ADMIN,
      );
      if (can) visible.push(mapping);
    }
    return visible;
  }

  /** Returns all active guild mappings (super-admin use). */
  async findAll(): Promise<OrgGuildMapping[]> {
    return this.repo.find({
      where: { isActive: true },
      relations: ['organization'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Creates or updates the mapping for a given discordGuildId.
   * Throws ConflictException if discordGuildId is already mapped to a different org.
   */
  async upsert(dto: UpsertGuildMappingDto): Promise<OrgGuildMapping> {
    const existing = await this.repo.findOne({
      where: { discordGuildId: dto.discordGuildId },
    });

    if (existing && existing.organizationId !== dto.organizationId) {
      throw new ConflictException(
        `Discord guild ${dto.discordGuildId} is already mapped to a different organization`,
      );
    }

    const mapping = existing ?? this.repo.create();
    mapping.organizationId = dto.organizationId;
    mapping.discordGuildId = dto.discordGuildId;
    if (dto.discordGuildNameSnapshot !== undefined) {
      mapping.discordGuildNameSnapshot = dto.discordGuildNameSnapshot;
    }
    mapping.isActive = true;
    mapping.lastValidatedAt = new Date();

    try {
      return await this.repo.save(mapping);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : undefined;
      if (code === '23505') {
        throw new ConflictException(
          `Discord guild ${dto.discordGuildId} is already mapped`,
        );
      }
      throw err;
    }
  }

  /** Soft-deactivates a guild mapping by ID. */
  async deactivate(id: string): Promise<void> {
    const mapping = await this.repo.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException(`Guild mapping ${id} not found`);
    mapping.isActive = false;
    await this.repo.save(mapping);
  }
}
