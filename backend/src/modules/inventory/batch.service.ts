import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StationInventoryBatch } from './entities/station-inventory-batch.entity';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationLocation } from '../locations/entities/station-location.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { AddItemsToBatchDto } from './dto/add-items-to-batch.dto';
import {
  BatchDto,
  BatchLocationConflictDto,
  PaginatedBatchesDto,
} from './dto/batch.dto';

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(StationInventoryBatch)
    private readonly batchRepo: Repository<StationInventoryBatch>,
    @InjectRepository(StationInventoryItem)
    private readonly itemRepo: Repository<StationInventoryItem>,
    @InjectRepository(StationLocation)
    private readonly locationRepo: Repository<StationLocation>,
  ) {}

  async createBatch(userId: string, dto: CreateBatchDto): Promise<BatchDto> {
    const location = await this.locationRepo.findOne({
      where: { id: dto.locationId },
    });
    if (!location) throw new NotFoundException('Location not found');

    const batch = this.batchRepo.create({
      ownerType: 'user',
      ownerId: userId,
      name: dto.name,
      locationId: dto.locationId,
    });

    try {
      const saved = await this.batchRepo.save(batch);
      return this.toBatchDto(saved, location.name, 0);
    } catch (err: unknown) {
      if (this.isPgUniqueViolation(err))
        throw new ConflictException('Batch already exists');
      throw err;
    }
  }

  async listBatches(
    userId: string,
    page = 1,
    limit = 25,
  ): Promise<PaginatedBatchesDto> {
    const [batches, total] = await this.batchRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.location', 'loc')
      .where('b.ownerType = :ownerType AND b.ownerId = :ownerId', {
        ownerType: 'user',
        ownerId: userId,
      })
      .orderBy('b.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const counts = await this.getItemCounts(batches.map((b) => b.id));

    return {
      data: batches.map((b) =>
        this.toBatchDto(b, b.location?.name, counts[b.id] ?? 0),
      ),
      total,
      page,
      limit,
    };
  }

  async getBatch(userId: string, batchId: string): Promise<BatchDto> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, ownerType: 'user', ownerId: userId },
      relations: ['location'],
    });
    if (!batch) throw new NotFoundException('Batch not found');

    const counts = await this.getItemCounts([batchId]);
    return this.toBatchDto(batch, batch.location?.name, counts[batchId] ?? 0);
  }

  async updateBatch(
    userId: string,
    batchId: string,
    dto: UpdateBatchDto,
    force = false,
  ): Promise<BatchDto> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, ownerType: 'user', ownerId: userId },
      relations: ['location'],
    });
    if (!batch) throw new NotFoundException('Batch not found');

    if (dto.locationId && dto.locationId !== batch.locationId) {
      const newLocation = await this.locationRepo.findOne({
        where: { id: dto.locationId },
      });
      if (!newLocation) throw new NotFoundException('Location not found');

      const mismatchedItems = await this.itemRepo.find({
        where: { batchId, ownerType: 'user', ownerId: userId },
        relations: ['location'],
      });

      const conflicting = mismatchedItems.filter(
        (item) => item.locationId !== dto.locationId,
      );

      if (conflicting.length > 0 && !force) {
        const conflict: BatchLocationConflictDto = {
          conflictingItems: conflicting.map((item) => ({
            id: item.id,
            name: item.alias ?? item.catalogEntry?.name ?? item.catalogEntryId,
            currentLocationId: item.locationId,
            currentLocationName: item.location?.name ?? null,
            targetLocationId: dto.locationId!,
            targetLocationName: newLocation.name,
          })),
        };
        throw new ConflictException(conflict);
      }

      if (force && conflicting.length > 0) {
        await this.itemRepo.update(
          { batchId, ownerType: 'user', ownerId: userId },
          { locationId: dto.locationId },
        );
      }
    }

    if (dto.name) batch.name = dto.name;
    if (dto.locationId) batch.locationId = dto.locationId;

    const saved = await this.batchRepo.save(batch);
    const location = await this.locationRepo.findOne({
      where: { id: saved.locationId },
    });
    const counts = await this.getItemCounts([batchId]);
    return this.toBatchDto(saved, location?.name, counts[batchId] ?? 0);
  }

  async deleteBatch(userId: string, batchId: string): Promise<void> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, ownerType: 'user', ownerId: userId },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    await this.itemRepo.update({ batchId }, { batchId: null });
    await this.batchRepo.delete({ id: batchId });
  }

  async addItemsToBatch(
    userId: string,
    batchId: string,
    dto: AddItemsToBatchDto,
    force = false,
  ): Promise<BatchDto | BatchLocationConflictDto> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, ownerType: 'user', ownerId: userId },
      relations: ['location'],
    });
    if (!batch) throw new NotFoundException('Batch not found');

    const items = await this.itemRepo.find({
      where: { id: In(dto.itemIds), ownerType: 'user', ownerId: userId },
      relations: ['location'],
    });

    const notOwned = dto.itemIds.filter(
      (id) => !items.some((i) => i.id === id),
    );
    if (notOwned.length > 0)
      throw new ForbiddenException('One or more items not found or not owned');

    const conflicting = items.filter(
      (item) => item.locationId !== batch.locationId,
    );

    if (conflicting.length > 0 && !force) {
      const conflict: BatchLocationConflictDto = {
        conflictingItems: conflicting.map((item) => ({
          id: item.id,
          name: item.alias ?? item.catalogEntryId,
          currentLocationId: item.locationId,
          currentLocationName: item.location?.name ?? null,
          targetLocationId: batch.locationId,
          targetLocationName: batch.location?.name ?? '',
        })),
      };
      throw new ConflictException(conflict);
    }

    await this.itemRepo.manager.transaction(async (em) => {
      if (force && conflicting.length > 0) {
        await em.update(
          StationInventoryItem,
          { id: In(conflicting.map((i) => i.id)) },
          { locationId: batch.locationId },
        );
      }
      await em.update(
        StationInventoryItem,
        { id: In(dto.itemIds) },
        { batchId },
      );
    });

    const counts = await this.getItemCounts([batchId]);
    return this.toBatchDto(batch, batch.location?.name, counts[batchId] ?? 0);
  }

  async removeItemFromBatch(
    userId: string,
    batchId: string,
    itemId: string,
  ): Promise<void> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, ownerType: 'user', ownerId: userId },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    const item = await this.itemRepo.findOne({
      where: { id: itemId, batchId, ownerType: 'user', ownerId: userId },
    });
    if (!item) throw new NotFoundException('Item not found in batch');

    await this.itemRepo.update({ id: itemId }, { batchId: null });
  }

  private async getItemCounts(
    batchIds: string[],
  ): Promise<Record<string, number>> {
    if (batchIds.length === 0) return {};
    const rows: Array<{ batch_id: string; count: string }> = await this.itemRepo
      .createQueryBuilder('item')
      .select('item.batch_id', 'batch_id')
      .addSelect('COUNT(item.id)', 'count')
      .where('item.batch_id IN (:...batchIds)', { batchIds })
      .groupBy('item.batch_id')
      .getRawMany();
    return Object.fromEntries(
      rows.map((r) => [r.batch_id, parseInt(r.count, 10)]),
    );
  }

  private toBatchDto(
    batch: StationInventoryBatch,
    locationName: string | undefined,
    itemCount: number,
  ): BatchDto {
    return {
      id: batch.id,
      ownerType: batch.ownerType,
      ownerId: batch.ownerId,
      name: batch.name,
      locationId: batch.locationId,
      locationName,
      itemCount,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }

  private isPgUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    );
  }
}
