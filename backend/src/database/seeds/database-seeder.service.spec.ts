import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { Role } from '../../modules/roles/role.entity';
import { Organization } from '../../modules/organizations/organization.entity';
import { User } from '../../modules/users/user.entity';
import { UserOrganizationRole } from '../../modules/user-organization-roles/user-organization-role.entity';
import { Game } from '../../modules/games/game.entity';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
}));

describe('DatabaseSeederService', () => {
  let service: DatabaseSeederService;
  let rolesRepository: Repository<Role>;
  let organizationsRepository: Repository<Organization>;
  let usersRepository: Repository<User>;
  let userOrgRolesRepository: Repository<UserOrganizationRole>;
  let gamesRepository: Repository<Game>;
  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  let loggerErrorSpy: jest.Mock;

  const mockGame = {
    id: 1,
    name: 'Star Citizen',
    code: 'sc',
    description: 'Star Citizen MMO',
    active: true,
  };

  const mockRole = {
    id: 1,
    name: 'Owner',
    description: 'Full access',
    permissions: {},
  };

  const mockOrganization = {
    id: 1,
    name: 'Demo Organization',
    description: 'Test org',
    isActive: true,
    gameId: 1,
  };

  const mockUser = {
    id: 1,
    username: 'demo',
    email: 'demo@example.com',
    password: 'hashed',
    isActive: true,
  };

  const mockUserOrgRole = {
    id: 1,
    userId: 1,
    organizationId: 1,
    roleId: 1,
  };

  beforeEach(async () => {
    mockLogger.log.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    loggerErrorSpy = mockLogger.error;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseSeederService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserOrganizationRole),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Game),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseSeederService>(DatabaseSeederService);
    rolesRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    organizationsRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userOrgRolesRepository = module.get<Repository<UserOrganizationRole>>(
      getRepositoryToken(UserOrganizationRole),
    );
    gamesRepository = module.get<Repository<Game>>(getRepositoryToken(Game));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedAll', () => {
    it('should seed all data successfully', async () => {
      // Mock games seeding - first call returns null (new game), second call returns the game for org creation
      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValueOnce(null) // First game check (sc)
        .mockResolvedValueOnce(null) // Second game check (sq42)
        .mockResolvedValueOnce(mockGame as unknown as Game) // Get sc game for org creation
        .mockResolvedValueOnce(null); // Org check

      jest
        .spyOn(gamesRepository, 'create')
        .mockReturnValue(mockGame as unknown as Game);
      jest
        .spyOn(gamesRepository, 'save')
        .mockResolvedValue(mockGame as unknown as Game);

      jest.spyOn(rolesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(rolesRepository, 'create')
        .mockReturnValue(mockRole as unknown as Role);
      jest
        .spyOn(rolesRepository, 'save')
        .mockResolvedValue(mockRole as unknown as Role);

      jest.spyOn(organizationsRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(organizationsRepository, 'create')
        .mockReturnValue(mockOrganization as unknown as Organization);
      jest
        .spyOn(organizationsRepository, 'save')
        .mockResolvedValue(mockOrganization as unknown as Organization);

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(usersRepository, 'create')
        .mockReturnValue(mockUser as unknown as User);
      jest
        .spyOn(usersRepository, 'save')
        .mockResolvedValue(mockUser as unknown as User);

      jest.spyOn(userOrgRolesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(userOrgRolesRepository, 'create')
        .mockReturnValue(mockUserOrgRole as unknown as UserOrganizationRole);
      jest
        .spyOn(userOrgRolesRepository, 'save')
        .mockResolvedValue(mockUserOrgRole as unknown as UserOrganizationRole);

      await expect(service.seedAll()).resolves.toBeUndefined();
    });

    it('should handle existing data gracefully', async () => {
      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);
      jest
        .spyOn(rolesRepository, 'findOne')
        .mockResolvedValue(mockRole as unknown as Role);
      jest
        .spyOn(organizationsRepository, 'findOne')
        .mockResolvedValue(mockOrganization as unknown as Organization);
      jest
        .spyOn(usersRepository, 'findOne')
        .mockResolvedValue(mockUser as unknown as User);
      jest
        .spyOn(userOrgRolesRepository, 'findOne')
        .mockResolvedValue(mockUserOrgRole as unknown as UserOrganizationRole);

      await expect(service.seedAll()).resolves.toBeUndefined();

      expect(gamesRepository.save).not.toHaveBeenCalled();
      expect(rolesRepository.save).not.toHaveBeenCalled();
      expect(organizationsRepository.save).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(userOrgRolesRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      jest
        .spyOn(gamesRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.seedAll()).rejects.toThrow('Database error');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '❌ Database seeding failed:',
        expect.any(Error),
      );
    });
  });
});
