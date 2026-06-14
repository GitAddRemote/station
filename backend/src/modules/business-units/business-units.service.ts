import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessUnit } from './business-unit.entity';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';

export interface BusinessUnitNode {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  kind: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: BusinessUnitNode[];
}

@Injectable()
export class BusinessUnitsService {
  constructor(
    @InjectRepository(BusinessUnit)
    private readonly repo: Repository<BusinessUnit>,
  ) {}

  async findAll(organizationId: string): Promise<BusinessUnitNode[]> {
    const units = await this.repo.find({
      where: { organizationId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return this.buildTree(units, null);
  }

  async findOne(organizationId: string, id: string): Promise<BusinessUnit> {
    const unit = await this.repo.findOne({ where: { id, organizationId } });
    if (!unit) throw new NotFoundException('Business unit not found');
    return unit;
  }

  async create(
    organizationId: string,
    dto: CreateBusinessUnitDto,
  ): Promise<BusinessUnit> {
    if (dto.parentId) {
      const parent = await this.repo.findOne({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent)
        throw new BadRequestException(
          'Parent business unit not found in this organization',
        );
    }
    const unit = this.repo.create({
      organizationId,
      name: dto.name,
      kind: dto.kind,
      parentId: dto.parentId ?? null,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(unit);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateBusinessUnitDto,
  ): Promise<BusinessUnit> {
    const unit = await this.findOne(organizationId, id);

    if (dto.parentId !== undefined) {
      if (dto.parentId === id)
        throw new BadRequestException('A unit cannot be its own parent');
      if (dto.parentId !== null) {
        const parent = await this.repo.findOne({
          where: { id: dto.parentId, organizationId },
        });
        if (!parent)
          throw new BadRequestException(
            'Parent business unit not found in this organization',
          );
        // Prevent cycles: the new parent must not be a descendant of this unit
        if (await this.isDescendant(id, dto.parentId, organizationId))
          throw new BadRequestException(
            'Cannot set a descendant as parent (circular hierarchy)',
          );
      }
      unit.parentId = dto.parentId;
    }

    if (dto.name !== undefined) unit.name = dto.name;
    if (dto.kind !== undefined) unit.kind = dto.kind;
    if (dto.description !== undefined)
      unit.description = dto.description ?? null;
    if (dto.sortOrder !== undefined) unit.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) unit.isActive = dto.isActive;

    return this.repo.save(unit);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const unit = await this.findOne(organizationId, id);
    // Promote children: re-parent to grandparent (or null if no grandparent)
    await this.repo.update(
      { organizationId, parentId: id },
      { parentId: unit.parentId },
    );
    await this.repo.remove(unit);
  }

  // ---- helpers ----

  private buildTree(
    units: BusinessUnit[],
    parentId: string | null,
  ): BusinessUnitNode[] {
    return units
      .filter((u) => u.parentId === parentId)
      .map((u) => ({
        id: u.id,
        organizationId: u.organizationId,
        parentId: u.parentId,
        name: u.name,
        kind: u.kind,
        description: u.description,
        sortOrder: u.sortOrder,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        children: this.buildTree(units, u.id),
      }));
  }

  private async isDescendant(
    ancestorId: string,
    candidateId: string,
    organizationId: string,
  ): Promise<boolean> {
    // Walk up from candidate to root; if we hit ancestorId it's a cycle
    let currentId: string | null = candidateId;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) break; // malformed existing data guard
      visited.add(currentId);
      if (currentId === ancestorId) return true;
      const node = await this.repo.findOne({
        where: { id: currentId, organizationId },
        select: ['parentId'],
      });
      currentId = node?.parentId ?? null;
    }
    return false;
  }
}
