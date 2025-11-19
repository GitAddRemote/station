import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditAction, AuditEntityType } from './audit-log.entity';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: AuditLogsService;

  const mockAuditLog = {
    id: 1,
    userId: 1,
    username: 'testuser',
    action: AuditAction.CREATE,
    entityType: AuditEntityType.USER,
    entityId: 1,
    metadata: {},
    oldValues: undefined,
    newValues: {},
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    createdAt: new Date(),
  };

  const mockAuditLogsService = {
    findAll: jest.fn().mockResolvedValue({ logs: [mockAuditLog], total: 1 }),
    findByUser: jest.fn().mockResolvedValue({ logs: [mockAuditLog], total: 1 }),
    findByEntity: jest
      .fn()
      .mockResolvedValue({ logs: [mockAuditLog], total: 1 }),
    findRecent: jest.fn().mockResolvedValue([mockAuditLog]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    service = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all audit logs with default filters', async () => {
      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({ logs: [mockAuditLog], total: 1 });
    });

    it('should parse and apply filters', async () => {
      await controller.findAll(
        '1',
        AuditEntityType.USER,
        '1',
        AuditAction.CREATE,
        '2024-01-01',
        '2024-12-31',
        '10',
        '5',
      );

      expect(service.findAll).toHaveBeenCalledWith({
        userId: 1,
        entityType: AuditEntityType.USER,
        entityId: 1,
        action: AuditAction.CREATE,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 5,
      });
    });
  });

  describe('findByUser', () => {
    it('should return audit logs for a specific user', async () => {
      const result = await controller.findByUser(1);

      expect(service.findByUser).toHaveBeenCalledWith(1, 50, 0);
      expect(result).toEqual({ logs: [mockAuditLog], total: 1 });
    });

    it('should parse limit and offset', async () => {
      await controller.findByUser(1, '100', '10');

      expect(service.findByUser).toHaveBeenCalledWith(1, 100, 10);
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs for a specific entity', async () => {
      const result = await controller.findByEntity(AuditEntityType.USER, 1);

      expect(service.findByEntity).toHaveBeenCalledWith(
        AuditEntityType.USER,
        1,
        50,
        0,
      );
      expect(result).toEqual({ logs: [mockAuditLog], total: 1 });
    });

    it('should parse limit and offset', async () => {
      await controller.findByEntity(AuditEntityType.USER, 1, '100', '10');

      expect(service.findByEntity).toHaveBeenCalledWith(
        AuditEntityType.USER,
        1,
        100,
        10,
      );
    });
  });

  describe('findRecent', () => {
    it('should return recent audit logs', async () => {
      const result = await controller.findRecent();

      expect(service.findRecent).toHaveBeenCalledWith(100);
      expect(result).toEqual([mockAuditLog]);
    });

    it('should parse limit', async () => {
      await controller.findRecent('50');

      expect(service.findRecent).toHaveBeenCalledWith(50);
    });
  });
});
