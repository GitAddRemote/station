import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog, AuditAction, AuditEntityType } from './audit-log.entity';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let repository: Repository<AuditLog>;

  const mockAuditLog: AuditLog = {
    id: 1,
    userId: 1,
    username: 'testuser',
    action: AuditAction.CREATE,
    entityType: AuditEntityType.USER,
    entityId: 1,
    metadata: { test: 'data' },
    oldValues: undefined,
    newValues: { name: 'test' },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
  };

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockAuditLog], 1]),
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 5 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    repository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save an audit log', async () => {
      const dto = {
        userId: 1,
        username: 'testuser',
        action: AuditAction.CREATE,
        entityType: AuditEntityType.USER,
        entityId: 1,
        metadata: { test: 'data' },
      };

      jest.spyOn(repository, 'create').mockReturnValue(mockAuditLog as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockAuditLog as any);

      const result = await service.log(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(mockAuditLog);
      expect(result).toEqual(mockAuditLog);
    });
  });

  describe('findAll', () => {
    it('should find all audit logs without filters', async () => {
      const result = await service.findAll();

      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'audit_log.createdAt',
        'DESC',
      );
      expect(result).toEqual({ logs: [mockAuditLog], total: 1 });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        userId: 1,
        entityType: AuditEntityType.USER,
        entityId: 1,
        action: AuditAction.CREATE,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 5,
      };

      await service.findAll(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(6);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
    });
  });

  describe('findByUser', () => {
    it('should find audit logs by user', async () => {
      const result = await service.findByUser(1, 50, 0);

      expect(result).toEqual({ logs: [mockAuditLog], total: 1 });
    });

    it('should use default limit and offset', async () => {
      await service.findByUser(1);

      expect(repository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findByEntity', () => {
    it('should find audit logs by entity', async () => {
      const result = await service.findByEntity(AuditEntityType.USER, 1, 50, 0);

      expect(result).toEqual({ logs: [mockAuditLog], total: 1 });
    });
  });

  describe('findRecent', () => {
    it('should find recent audit logs', async () => {
      const result = await service.findRecent(100);

      expect(result).toEqual([mockAuditLog]);
    });

    it('should use default limit', async () => {
      await service.findRecent();

      expect(repository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete audit logs older than specified date', async () => {
      const date = new Date('2024-01-01');

      const result = await service.deleteOlderThan(date);

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('createdAt < :date', {
        date,
      });
      expect(result).toBe(5);
    });

    it('should return 0 if no logs were deleted', async () => {
      mockQueryBuilder.execute.mockResolvedValueOnce({ affected: undefined });

      const result = await service.deleteOlderThan(new Date());

      expect(result).toBe(0);
    });
  });
});
