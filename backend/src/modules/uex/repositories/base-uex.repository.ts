import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { BaseUexEntity } from '../entities/base-uex.entity';

type BaseUexUpdate = QueryDeepPartialEntity<BaseUexEntity>;

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
      } as FindOptionsWhere<T>,
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
      } as FindOptionsWhere<T>,
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
      } as FindOptionsWhere<T>,
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
      } as FindOptionsWhere<T>,
    });
  }

  /**
   * Find by UEX ID (non-deleted)
   */
  async findByUexId(uexId: number): Promise<T | null> {
    return this.findOneActive({
      where: { uexId } as FindOptionsWhere<T>,
    });
  }

  /**
   * Mark record as soft deleted
   */
  async markAsDeleted(id: number, modifiedBy: number): Promise<void> {
    const update: BaseUexUpdate = { deleted: true, modifiedById: modifiedBy };
    await this.update(id, update as QueryDeepPartialEntity<T>);
  }

  /**
   * Mark record as soft deleted by UEX ID
   */
  async markAsDeletedByUexId(uexId: number, modifiedBy: number): Promise<void> {
    const update: BaseUexUpdate = { deleted: true, modifiedById: modifiedBy };
    await this.update(
      { uexId } as FindOptionsWhere<T>,
      update as QueryDeepPartialEntity<T>,
    );
  }

  /**
   * Mark record as inactive
   */
  async deactivate(id: number, modifiedBy: number): Promise<void> {
    const update: BaseUexUpdate = { active: false, modifiedById: modifiedBy };
    await this.update(id, update as QueryDeepPartialEntity<T>);
  }

  /**
   * Mark record as active
   */
  async activate(id: number, modifiedBy: number): Promise<void> {
    const update: BaseUexUpdate = { active: true, modifiedById: modifiedBy };
    await this.update(id, update as QueryDeepPartialEntity<T>);
  }
}
