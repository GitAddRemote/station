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
    // A QueryRunner pins both queries to the same physical connection.
    // DataSource.query() draws from a pool and cannot guarantee the lock
    // and unlock land on the same session — using separate pool calls risks
    // unlocking a different session's lock or leaving the original stranded.
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
