import { LocationsSyncStep } from './locations-sync.step';
import { EtlWarning } from '../entities/etl-warning.entity';

const RUN_ID = 'test-run-id';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function buildStep(
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  return new LocationsSyncStep(
    { query: dsQuery } as never,
    { create: repoCreate, save: repoSave } as never,
    makeLogger() as never,
  );
}

describe('LocationsSyncStep', () => {
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    repoCreate = jest
      .fn()
      .mockImplementation((dto) => ({ ...dto }) as EtlWarning);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('projects live rows into station_location and uses the uex-api data source by default', async () => {
    const dsQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM "station_data_source"')) {
        return Promise.resolve([
          { id: 'system-id', code: 'system' },
          { id: 'uex-api-id', code: 'uex-api' },
        ]);
      }

      if (sql.includes('FROM "station_city"')) {
        return Promise.resolve([
          {
            id: 'city-uuid',
            name: 'Lorville',
            star_system_uex_id: 1,
            planet_uex_id: 2,
            moon_uex_id: null,
            is_available_live: true,
            is_locally_managed: false,
          },
        ]);
      }

      if (
        sql.includes('FROM "station_space_station"') ||
        sql.includes('FROM "station_outpost"') ||
        sql.includes('FROM "station_poi"')
      ) {
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    });

    const step = buildStep(dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
      sql.includes('INSERT INTO "station_location"'),
    );
    expect(upsertCall).toBeDefined();
    expect(upsertCall[1]).toEqual([
      'uex-api-id',
      'city',
      'city-uuid',
      'city-city-uuid',
      'Lorville',
      1,
      2,
      null,
      true,
      false,
    ]);
  });

  it('projects locally managed rows under the system data source', async () => {
    const dsQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM "station_data_source"')) {
        return Promise.resolve([
          { id: 'system-id', code: 'system' },
          { id: 'uex-api-id', code: 'uex-api' },
        ]);
      }

      if (sql.includes('FROM "station_outpost"')) {
        return Promise.resolve([
          {
            id: 'outpost-uuid',
            name: 'My Forward Base',
            star_system_uex_id: 1,
            planet_uex_id: 2,
            moon_uex_id: 3,
            is_available_live: false,
            is_locally_managed: true,
          },
        ]);
      }

      if (
        sql.includes('FROM "station_city"') ||
        sql.includes('FROM "station_space_station"') ||
        sql.includes('FROM "station_poi"')
      ) {
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    });

    const step = buildStep(dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const upsertCall = dsQuery.mock.calls.find(([sql]: [string]) =>
      sql.includes('INSERT INTO "station_location"'),
    );
    expect(upsertCall[1][0]).toBe('system-id');
    expect(upsertCall[1][1]).toBe('outpost');
    expect(upsertCall[1][3]).toBe('outpost-outpost-uuid');
    expect(upsertCall[1][8]).toBe(false);
    expect(upsertCall[1][9]).toBe(true);
  });

  it('deletes stale projected rows not present in the current source snapshot', async () => {
    const dsQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM "station_data_source"')) {
        return Promise.resolve([
          { id: 'system-id', code: 'system' },
          { id: 'uex-api-id', code: 'uex-api' },
        ]);
      }

      if (sql.includes('FROM "station_poi"')) {
        return Promise.resolve([
          {
            id: 'poi-uuid',
            name: 'Ghost Hollow',
            star_system_uex_id: 1,
            planet_uex_id: 2,
            moon_uex_id: null,
            is_available_live: true,
            is_locally_managed: false,
          },
        ]);
      }

      if (
        sql.includes('FROM "station_city"') ||
        sql.includes('FROM "station_space_station"') ||
        sql.includes('FROM "station_outpost"')
      ) {
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    });

    const step = buildStep(dsQuery, repoCreate, repoSave);
    await step.execute({ runId: RUN_ID });

    const deleteCall = dsQuery.mock.calls.find(
      ([sql, params]: [string, unknown[]]) =>
        sql.includes('DELETE FROM "station_location"') && params[0] === 'poi',
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall[1]).toEqual(['poi', ['poi-poi-uuid']]);
  });

  it('fails fast when required station_data_source seed rows are missing', async () => {
    const dsQuery = jest
      .fn()
      .mockResolvedValue([{ id: 'system-id', code: 'system' }]);
    const step = buildStep(dsQuery, repoCreate, repoSave);

    await expect(step.execute({ runId: RUN_ID })).rejects.toThrow(
      'station_data_source must contain seeded system and uex-api rows before locations-sync can run',
    );
  });
});
