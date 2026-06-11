import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UexSyncService } from '../modules/uex-sync/uex-sync.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: DataSource, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('true') },
        },
        {
          provide: UexSyncService,
          useValue: { getAllSyncStates: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('delegates to HealthCheckService and returns the result', async () => {
    const result = await controller.check();
    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'ok' });
  });
});
