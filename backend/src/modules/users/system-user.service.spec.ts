import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemUserService } from './system-user.service';
import { User } from './user.entity';

describe('SystemUserService', () => {
  let service: SystemUserService;

  const mockSystemUser = {
    id: 1,
    username: 'station-system',
    email: 'system@station.internal',
    isSystemUser: true,
    isActive: true,
  };

  const mockRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemUserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SystemUserService>(SystemUserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should cache system user ID at startup', async () => {
      mockRepository.findOne.mockResolvedValue(mockSystemUser);

      await service.onModuleInit();

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, isSystemUser: true },
        select: ['id'],
      });
      expect(service.getSystemUserId()).toBe(1);
    });

    it('should throw error if system user is missing', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.onModuleInit()).rejects.toThrow(
        'System user not found! Run migrations to seed system user: pnpm migration:run',
      );
    });
  });

  describe('getSystemUserId', () => {
    it('should return cached system user ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockSystemUser);
      await service.onModuleInit();

      expect(service.getSystemUserId()).toBe(1);
    });

    it('should throw error if not initialized', () => {
      expect(() => service.getSystemUserId()).toThrow(
        'System user not initialized. Ensure SystemUserService.onModuleInit() has been called.',
      );
    });
  });

  describe('isSystemUser', () => {
    it('should return true for system user ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockSystemUser);
      await service.onModuleInit();

      expect(service.isSystemUser(1)).toBe(true);
    });

    it('should return false for non-system user ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockSystemUser);
      await service.onModuleInit();

      expect(service.isSystemUser(2)).toBe(false);
      expect(service.isSystemUser(100)).toBe(false);
    });
  });
});
