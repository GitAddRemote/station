import { ConflictException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CatalogEtlService } from '../catalog-etl.service';
import { CatalogEtlScheduler } from './catalog-etl.scheduler';

const mockRunStep = jest.fn();
const mockGetLastSuccessfulStepRun = jest.fn();
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
} as unknown as PinoLogger;

const catalogEtlService = {
  runStep: mockRunStep,
  getLastSuccessfulStepRun: mockGetLastSuccessfulStepRun,
} as unknown as CatalogEtlService;

function makeScheduler(): CatalogEtlScheduler {
  return new CatalogEtlScheduler(mockLogger, catalogEtlService);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLastSuccessfulStepRun.mockResolvedValue(null);
});

describe('CatalogEtlScheduler.scheduledTerminalEtl', () => {
  it('runs terminals-sync then terminal-distances-sync on success', async () => {
    mockRunStep.mockResolvedValue(undefined);
    await makeScheduler().scheduledTerminalEtl();
    expect(mockRunStep).toHaveBeenCalledTimes(2);
    expect(mockRunStep).toHaveBeenNthCalledWith(1, 'terminals-sync');
    expect(mockRunStep).toHaveBeenNthCalledWith(2, 'terminal-distances-sync');
  });

  it('skips terminal-distances-sync when terminals-sync throws a non-conflict error', async () => {
    mockRunStep.mockRejectedValueOnce(new Error('db connection lost'));
    await makeScheduler().scheduledTerminalEtl();
    expect(mockRunStep).toHaveBeenCalledTimes(1);
    expect(mockRunStep).toHaveBeenCalledWith('terminals-sync');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'terminals-sync failed; skipping terminal-distances-sync',
    );
  });

  it('skips both steps when terminals-sync throws ConflictException', async () => {
    mockRunStep.mockRejectedValueOnce(new ConflictException());
    await makeScheduler().scheduledTerminalEtl();
    expect(mockRunStep).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('logs error but does not throw when terminal-distances-sync fails', async () => {
    mockRunStep
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('distances failed'));
    await expect(makeScheduler().scheduledTerminalEtl()).resolves.not.toThrow();
    expect(mockRunStep).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'terminal-distances-sync failed',
    );
  });

  it('skips when terminals-sync was completed within SKIP_HOURS', async () => {
    mockGetLastSuccessfulStepRun.mockResolvedValue(new Date().toISOString());
    await makeScheduler().scheduledTerminalEtl();
    expect(mockRunStep).not.toHaveBeenCalled();
  });

  it('skips terminal-distances-sync when it was completed within SKIP_HOURS', async () => {
    mockGetLastSuccessfulStepRun
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(new Date().toISOString());
    mockRunStep.mockResolvedValue(undefined);
    await makeScheduler().scheduledTerminalEtl();
    expect(mockRunStep).toHaveBeenCalledTimes(1);
    expect(mockRunStep).toHaveBeenCalledWith('terminals-sync');
  });
});
