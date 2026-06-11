import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrgGuildMappingService } from './org-guild-mapping.service';
import { OrgGuildMapping } from './entities/org-guild-mapping.entity';
import { PermissionsService } from '../permissions/permissions.service';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockPermissions = {
  hasPermission: jest.fn(),
};

describe('OrgGuildMappingService', () => {
  let service: OrgGuildMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgGuildMappingService,
        { provide: getRepositoryToken(OrgGuildMapping), useValue: mockRepo },
        { provide: PermissionsService, useValue: mockPermissions },
      ],
    }).compile();

    service = module.get(OrgGuildMappingService);
    jest.clearAllMocks();
  });

  describe('findForUser', () => {
    it('returns only mappings the user has view permission for', async () => {
      const mappings = [
        {
          id: '1',
          organizationId: 'org-a',
          discordGuildId: 'guild-1',
          isActive: true,
        },
        {
          id: '2',
          organizationId: 'org-b',
          discordGuildId: 'guild-2',
          isActive: true,
        },
      ] as OrgGuildMapping[];
      mockRepo.find.mockResolvedValue(mappings);
      mockPermissions.hasPermission
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.findForUser('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('upsert', () => {
    it('creates a new mapping when one does not exist', async () => {
      const newMapping = { id: 'new-id' } as OrgGuildMapping;
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockResolvedValue(newMapping);

      const result = await service.upsert({
        organizationId: 'org-1',
        discordGuildId: 'guild-1',
      });
      expect(result.id).toBe('new-id');
    });

    it('updates an existing mapping for the same org', async () => {
      const existing = {
        id: 'existing-id',
        organizationId: 'org-1',
        discordGuildId: 'guild-1',
      } as OrgGuildMapping;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue({
        ...existing,
        discordGuildNameSnapshot: 'My Guild',
      });

      const result = await service.upsert({
        organizationId: 'org-1',
        discordGuildId: 'guild-1',
        discordGuildNameSnapshot: 'My Guild',
      });
      expect(result.discordGuildNameSnapshot).toBe('My Guild');
    });

    it('throws ConflictException when guild is already mapped to a different org', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'existing-id',
        organizationId: 'org-other',
        discordGuildId: 'guild-1',
      } as OrgGuildMapping);

      await expect(
        service.upsert({ organizationId: 'org-1', discordGuildId: 'guild-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      const mapping = { id: 'm-1', isActive: true } as OrgGuildMapping;
      mockRepo.findOne.mockResolvedValue(mapping);
      mockRepo.save.mockResolvedValue({ ...mapping, isActive: false });

      await service.deactivate('m-1');
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('throws NotFoundException when mapping does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.deactivate('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
