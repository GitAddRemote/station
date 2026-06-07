import * as dotenv from 'dotenv';
import { join } from 'path';
import { Client } from 'pg';

dotenv.config({ path: join(__dirname, '..', '.env.test') });

module.exports = async function globalSetup() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433', 10),
    user: process.env.DATABASE_USER || 'stationDbUser',
    password: process.env.DATABASE_PASSWORD || 'stationDbPassword1',
    database: process.env.DATABASE_NAME || 'stationDb',
  });

  await client.connect();

  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await client.query(`
      CREATE OR REPLACE FUNCTION "uuid_generate_v7"()
      RETURNS UUID
      LANGUAGE plpgsql
      AS $$
      DECLARE
        ts_hex TEXT;
        rand_hex TEXT;
        variant_nibble TEXT;
      BEGIN
        ts_hex := lpad(
          to_hex(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint),
          12, '0'
        );
        rand_hex := encode(gen_random_bytes(10), 'hex');
        variant_nibble := substr('89ab', (get_byte(gen_random_bytes(1), 0) % 4) + 1, 1);
        RETURN (
          substr(ts_hex, 1, 8) || '-' || substr(ts_hex, 9, 4) || '-' ||
          '7' || substr(rand_hex, 1, 3) || '-' ||
          variant_nibble || substr(rand_hex, 4, 3) || '-' ||
          substr(rand_hex, 7, 12)
        )::uuid;
      END;
      $$
    `);
  } finally {
    await client.end();
  }
};
