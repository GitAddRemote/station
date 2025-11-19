import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { Role } from '../../modules/roles/role.entity';
import { Organization } from '../../modules/organizations/organization.entity';
import { User } from '../../modules/users/user.entity';
import { UserOrganizationRole } from '../../modules/user-organization-roles/user-organization-role.entity';

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseSeederService,
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedAll', () => {
    it('should seed all data successfully', async () => {
      jest.spyOn(rolesRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(rolesRepository, 'create').mockReturnValue(mockRole as any);
      jest.spyOn(rolesRepository, 'save').mockResolvedValue(mockRole as any);

      jest.spyOn(organizationsRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(organizationsRepository, 'create')
        .mockReturnValue(mockOrganization as any);
      jest
        .spyOn(organizationsRepository, 'save')
        .mockResolvedValue(mockOrganization as any);

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(usersRepository, 'create').mockReturnValue(mockUser as any);
      jest.spyOn(usersRepository, 'save').mockResolvedValue(mockUser as any);

      jest.spyOn(userOrgRolesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(userOrgRolesRepository, 'create')
        .mockReturnValue(mockUserOrgRole as any);
      jest
        .spyOn(userOrgRolesRepository, 'save')
        .mockResolvedValue(mockUserOrgRole as any);

      await expect(service.seedAll()).resolves.toBeUndefined();
    });

    it('should handle existing data gracefully', async () => {
      jest.spyOn(rolesRepository, 'findOne').mockResolvedValue(mockRole as any);
      jest
        .spyOn(organizationsRepository, 'findOne')
        .mockResolvedValue(mockOrganization as any);
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(userOrgRolesRepository, 'findOne')
        .mockResolvedValue(mockUserOrgRole as any);

      await expect(service.seedAll()).resolves.toBeUndefined();

      expect(rolesRepository.save).not.toHaveBeenCalled();
      expect(organizationsRepository.save).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(userOrgRolesRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      jest
        .spyOn(rolesRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.seedAll()).rejects.toThrow('Database error');
    });
  });
});
