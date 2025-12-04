import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUexSyncStateTables1764812815840 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sync_status enum type
    await queryRunner.query(`
      CREATE TYPE sync_status_enum AS ENUM ('idle', 'in_progress', 'success', 'failed');
    `);

    // Create uex_sync_state table
    await queryRunner.query(`
      CREATE TABLE uex_sync_state (
        endpoint_name VARCHAR(100) PRIMARY KEY,
        last_successful_sync_at TIMESTAMPTZ,
        last_full_sync_at TIMESTAMPTZ,
        sync_status sync_status_enum NOT NULL DEFAULT 'idle',
        sync_started_at TIMESTAMPTZ,
        records_created_count INTEGER DEFAULT 0,
        records_updated_count INTEGER DEFAULT 0,
        records_deleted_count INTEGER DEFAULT 0,
        error_message TEXT,
        error_stack TEXT,
        sync_duration_ms INTEGER,
        date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        date_modified TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create index for monitoring queries
    await queryRunner.query(`
      CREATE INDEX idx_uex_sync_state_status
      ON uex_sync_state(sync_status, last_successful_sync_at);
    `);

    // Create uex_sync_config table
    await queryRunner.query(`
      CREATE TABLE uex_sync_config (
        endpoint_name VARCHAR(100) PRIMARY KEY REFERENCES uex_sync_state(endpoint_name),
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        delta_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        full_sync_interval_days INTEGER NOT NULL DEFAULT 7,
        sync_schedule_cron VARCHAR(100),
        rate_limit_calls_per_hour INTEGER DEFAULT 100,
        timeout_seconds INTEGER DEFAULT 300,
        retry_attempts INTEGER DEFAULT 3,
        retry_backoff_multiplier DECIMAL(3,2) DEFAULT 2.0,
        date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        date_modified TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default sync state entries
    await queryRunner.query(`
      INSERT INTO uex_sync_state (endpoint_name, sync_status) VALUES
        ('categories', 'idle'),
        ('items', 'idle'),
        ('companies', 'idle'),
        ('star_systems', 'idle'),
        ('planets', 'idle'),
        ('space_stations', 'idle');
    `);

    // Seed default sync config entries
    await queryRunner.query(`
      INSERT INTO uex_sync_config (endpoint_name, sync_schedule_cron, rate_limit_calls_per_hour) VALUES
        ('categories', '0 2 * * *', 50),
        ('items', '0 3 * * *', 200),
        ('companies', '0 2 * * *', 50),
        ('star_systems', '0 4 * * *', 100),
        ('planets', '0 4 * * *', 100),
        ('space_stations', '0 5 * * *', 100);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS uex_sync_config;`);
    await queryRunner.query(`DROP TABLE IF EXISTS uex_sync_state;`);
    await queryRunner.query(`DROP TYPE IF EXISTS sync_status_enum;`);
  }
}
