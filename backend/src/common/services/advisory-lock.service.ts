import { Injectable, ConflictException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdvisoryLockService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async withLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const [{ acquired }] = await qr.query(
        `SELECT pg_try_advisory_lock(hashtext($1)) AS acquired`,
        [lockKey],
      );
      if (!acquired)
        throw new ConflictException(`Lock '${lockKey}' already held`);
      try {
        return await fn();
      } finally {
        await qr.query(`SELECT pg_advisory_unlock(hashtext($1))`, [lockKey]);
      }
    } finally {
      await qr.release();
    }
  }
}
