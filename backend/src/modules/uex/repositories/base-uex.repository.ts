import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { BaseUexEntity } from '../entities/base-uex.entity';

/**
 * Base repository class for UEX entities
 * Automatically filters out soft-deleted records in all queries
 */
export class BaseUexRepository<T extends BaseUexEntity> extends Repository<T> {
  /**
   * Find all non-deleted records
   */
  async findAllActive(options?: FindManyOptions<T>): Promise<T[]> {
    return this.find({
      ...options,
      where: {
        ...(options?.where || {}),
        deleted: false,
      } as any,
    });
  }

  /**
   * Find all active (non-deleted and active=true) records
   */
  async findActive(options?: FindManyOptions<T>): Promise<T[]> {
    return this.find({
      ...options,
      where: {
        ...(options?.where || {}),
        deleted: false,
        active: true,
      } as any,
    });
  }

  /**
   * Find one non-deleted record
   */
  async findOneActive(options: FindOneOptions<T>): Promise<T | null> {
    return this.findOne({
      ...options,
      where: {
        ...(options.where || {}),
        deleted: false,
      } as any,
    });
  }

  /**
   * Find one active (non-deleted and active=true) record
   */
  async findOneActiveOnly(options: FindOneOptions<T>): Promise<T | null> {
    return this.findOne({
      ...options,
      where: {
        ...(options.where || {}),
        deleted: false,
        active: true,
      } as any,
    });
  }

  /**
   * Find by UEX ID (non-deleted)
   */
  async findByUexId(uexId: number): Promise<T | null> {
    return this.findOneActive({
      where: { uexId } as any,
    });
  }

  /**
   * Mark record as soft deleted
   */
  async markAsDeleted(id: number, modifiedBy: number): Promise<void> {
    await this.update(id, {
      deleted: true,
      modifiedById: modifiedBy,
    } as any);
  }

  /**
   * Mark record as soft deleted by UEX ID
   */
  async markAsDeletedByUexId(uexId: number, modifiedBy: number): Promise<void> {
    await this.update(
      { uexId } as any,
      {
        deleted: true,
        modifiedById: modifiedBy,
      } as any,
    );
  }

  /**
   * Mark record as inactive
   */
  async deactivate(id: number, modifiedBy: number): Promise<void> {
    await this.update(id, {
      active: false,
      modifiedById: modifiedBy,
    } as any);
  }

  /**
   * Mark record as active
   */
  async activate(id: number, modifiedBy: number): Promise<void> {
    await this.update(id, {
      active: true,
      modifiedById: modifiedBy,
    } as any);
  }
}
