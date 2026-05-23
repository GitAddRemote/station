import { CompaniesSyncStep } from './companies-sync.step';
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

function makeCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_faction: 5,
    name: 'Roberts Space Industries',
    nickname: 'RSI',
    wiki: 'https://wiki.example.com/rsi',
    industry: 'Spacecraft Manufacturing',
    is_item_manufacturer: 0,
    is_vehicle_manufacturer: 1,
    date_added: 1700000000,
    date_modified: 1700000100,
    ...overrides,
  };
}

function buildStep(
  uexGet: jest.Mock,
  dsQuery: jest.Mock,
  repoCreate: jest.Mock,
  repoSave: jest.Mock,
) {
  const uexApiClient = { get: uexGet } as never;
  const dataSource = { query: dsQuery } as never;
  const warningsRepo = { create: repoCreate, save: repoSave } as never;
  const logger = makeLogger() as never;
  return new CompaniesSyncStep(uexApiClient, dataSource, warningsRepo, logger);
}

describe('CompaniesSyncStep', () => {
  let uexGet: jest.Mock;
  let dsQuery: jest.Mock;
  let repoCreate: jest.Mock;
  let repoSave: jest.Mock;

  beforeEach(() => {
    uexGet = jest.fn();
    dsQuery = jest.fn().mockResolvedValue([]);
    repoCreate = jest
      .fn()
      .mockImplementation((dto) => ({ ...dto }) as EtlWarning);
    repoSave = jest.fn().mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('success path', () => {
    it('fetches companies and calls DataSource.query for each upsert', async () => {
      const companies = [
        makeCompany({ id: 1 }),
        makeCompany({ id: 2, name: 'Drake Interplanetary' }),
      ];
      uexGet.mockResolvedValue(companies);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(uexGet).toHaveBeenCalledWith('/companies');
      expect(dsQuery).toHaveBeenCalledTimes(2);
      expect(dsQuery.mock.calls[0][0]).toContain('INSERT INTO station_company');
      expect(dsQuery.mock.calls[0][1][0]).toBe(1);
    });

    it('handles null faction correctly (no faction affiliation)', async () => {
      const companies = [makeCompany({ id: 1, id_faction: null })];
      uexGet.mockResolvedValue(companies);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(dsQuery).toHaveBeenCalledTimes(1);
      // faction_uex_id param (index 1) should be null
      expect(dsQuery.mock.calls[0][1][1]).toBeNull();
    });
  });

  describe('missing name', () => {
    it('saves a warn warning and skips upsert for nameless company', async () => {
      const companies = [
        makeCompany({ id: 10, name: '' }),
        makeCompany({ id: 11, name: 'Valid Corp' }),
      ];
      uexGet.mockResolvedValue(companies);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: RUN_ID,
          stepName: 'companies-sync',
          severity: 'warn',
          message: 'Company missing name',
          rawPayload: { id: 10 },
        }),
      );
      expect(repoSave).toHaveBeenCalledTimes(1);
      // Only one upsert — nameless company is skipped
      expect(dsQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsert idempotency', () => {
    it('calls DataSource.query once per record (upsert on conflict)', async () => {
      const companies = [makeCompany({ id: 1 }), makeCompany({ id: 1 })];
      uexGet.mockResolvedValue(companies);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      // 2 calls — one per record; the DB handles conflict resolution
      expect(dsQuery).toHaveBeenCalledTimes(2);
    });
  });
});
