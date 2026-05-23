import { JurisdictionsSyncStep } from './jurisdictions-sync.step';
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

function makeJurisdiction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_faction: 5,
    name: 'UEE Space',
    nickname: 'UEE',
    is_available: 1,
    is_available_live: 1,
    is_visible: 1,
    is_default: 0,
    wiki: 'https://wiki.example.com/uee',
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
  return new JurisdictionsSyncStep(
    uexApiClient,
    dataSource,
    warningsRepo,
    logger,
  );
}

describe('JurisdictionsSyncStep', () => {
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
    it('fetches jurisdictions and calls DataSource.query for each upsert', async () => {
      const jurisdictions = [
        makeJurisdiction({ id: 1 }),
        makeJurisdiction({ id: 2, name: 'Outlaw Space' }),
      ];
      uexGet.mockResolvedValue(jurisdictions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(uexGet).toHaveBeenCalledWith('/jurisdictions');
      expect(dsQuery).toHaveBeenCalledTimes(2);
      expect(dsQuery.mock.calls[0][0]).toContain(
        'INSERT INTO station_jurisdiction',
      );
      expect(dsQuery.mock.calls[0][1][0]).toBe(1);
    });
  });

  describe('missing name', () => {
    it('saves a warn warning and skips upsert for nameless jurisdiction', async () => {
      const jurisdictions = [
        makeJurisdiction({ id: 10, name: '' }),
        makeJurisdiction({ id: 11, name: 'Valid Space' }),
      ];
      uexGet.mockResolvedValue(jurisdictions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(repoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: RUN_ID,
          stepName: 'jurisdictions-sync',
          severity: 'warn',
          message: 'Jurisdiction missing name',
          rawPayload: { id: 10 },
        }),
      );
      expect(repoSave).toHaveBeenCalledTimes(1);
      // Only one upsert — nameless jurisdiction is skipped
      expect(dsQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsert idempotency', () => {
    it('calls DataSource.query once per record (upsert on conflict)', async () => {
      const jurisdictions = [
        makeJurisdiction({ id: 1 }),
        makeJurisdiction({ id: 1 }),
      ];
      uexGet.mockResolvedValue(jurisdictions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await step.execute({ runId: RUN_ID });

      expect(dsQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('CSV id_faction throws', () => {
    it('throws an error when id_faction contains a comma', async () => {
      const jurisdictions = [makeJurisdiction({ id: 1, id_faction: '1,2' })];
      uexGet.mockResolvedValue(jurisdictions);

      const step = buildStep(uexGet, dsQuery, repoCreate, repoSave);
      await expect(step.execute({ runId: RUN_ID })).rejects.toThrow(
        'id_faction contains CSV — schema review required',
      );
    });
  });
});
