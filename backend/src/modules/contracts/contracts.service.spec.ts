import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StationInventoryItem } from '../inventory/entities/station-inventory-item.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { ContractsService } from './contracts.service';
import { ContractItem } from './entities/contract-item.entity';
import { ContractMilestone } from './entities/contract-milestone.entity';
import { ContractParty } from './entities/contract-party.entity';
import {
  Contract,
  ContractRisk,
  ContractStatus,
  ContractType,
} from './entities/contract.entity';

type MockRepository<T extends ObjectLiteral = ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockDataSource = {
  transaction: jest.fn((fn: (manager: unknown) => Promise<unknown>) =>
    fn({
      create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({
        ...data,
      })),
      save: jest.fn((_entity: unknown, data: unknown) => Promise.resolve(data)),
      findOne: jest.fn(),
      delete: jest.fn(),
    }),
  ),
};

const mockPermissionsService = {
  hasPermission: jest.fn(),
};

const mockAuditLogsService = {
  log: jest.fn(),
};

describe('ContractsService', () => {
  let service: ContractsService;
  let contractRepository: MockRepository<Contract>;
  let milestoneRepository: MockRepository<ContractMilestone>;
  let partyRepository: MockRepository<ContractParty>;
  let itemRepository: MockRepository<ContractItem>;

  beforeEach(async () => {
    contractRepository = createMockRepository<Contract>();
    milestoneRepository = createMockRepository<ContractMilestone>();
    partyRepository = createMockRepository<ContractParty>();
    itemRepository = createMockRepository<ContractItem>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: getRepositoryToken(Contract),
          useValue: contractRepository,
        },
        {
          provide: getRepositoryToken(ContractMilestone),
          useValue: milestoneRepository,
        },
        {
          provide: getRepositoryToken(ContractParty),
          useValue: partyRepository,
        },
        {
          provide: getRepositoryToken(ContractItem),
          useValue: itemRepository,
        },
        {
          provide: getRepositoryToken(StationInventoryItem),
          useValue: createMockRepository<StationInventoryItem>(),
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a contract when found and user has permission', async () => {
      const contract: Partial<Contract> = {
        id: 'contract-id',
        orgId: 'org-id',
        title: 'Test Contract',
        status: ContractStatus.OPEN,
        type: ContractType.TRANSPORT,
        milestones: [],
        parties: [],
        items: [],
      };

      contractRepository.findOne!.mockResolvedValue(contract);
      mockPermissionsService.hasPermission.mockResolvedValue(true);

      const result = await service.findOne('user-id', 'contract-id');

      expect(result).toEqual(contract);
      expect(mockPermissionsService.hasPermission).toHaveBeenCalledWith(
        'user-id',
        'org-id',
        'can_view_org_contracts',
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      contractRepository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('user-id', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      const contract: Partial<Contract> = {
        id: 'contract-id',
        orgId: 'org-id',
        status: ContractStatus.OPEN,
        type: ContractType.TRANSPORT,
        milestones: [],
        parties: [],
        items: [],
      };

      contractRepository.findOne!.mockResolvedValue(contract);
      mockPermissionsService.hasPermission.mockResolvedValue(false);

      await expect(service.findOne('user-id', 'contract-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    it('should create a contract in draft status', async () => {
      mockPermissionsService.hasPermission.mockResolvedValue(true);

      const savedContract: Partial<Contract> = {
        id: 'new-contract-id',
        orgId: 'org-id',
        title: 'New Contract',
        status: ContractStatus.DRAFT,
        type: ContractType.MINING,
      };

      // transaction mock returns saved contract
      mockDataSource.transaction.mockImplementation(
        async (fn: (manager: unknown) => Promise<unknown>) => {
          const manager = {
            create: jest.fn(
              (_entity: unknown, data: Record<string, unknown>) => ({
                ...data,
              }),
            ),
            save: jest.fn(() => Promise.resolve(savedContract)),
            findOne: jest.fn().mockResolvedValue(null),
            delete: jest.fn(),
          };
          return fn(manager);
        },
      );

      // findOne called after creation to return full contract
      contractRepository.findOne!.mockResolvedValue({
        ...savedContract,
        milestones: [],
        parties: [],
        items: [],
      });

      const dto = {
        title: 'New Contract',
        type: ContractType.MINING,
        orgId: 'org-id',
        risk: ContractRisk.LOW,
      };

      const result = await service.create('user-id', dto);

      expect(mockPermissionsService.hasPermission).toHaveBeenCalledWith(
        'user-id',
        'org-id',
        'can_manage_contracts',
      );
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException when user lacks manage permission', async () => {
      mockPermissionsService.hasPermission.mockResolvedValue(false);

      await expect(
        service.create('user-id', {
          title: 'Test',
          type: ContractType.MINING,
          orgId: 'org-id',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated contracts', async () => {
      mockPermissionsService.hasPermission.mockResolvedValue(true);

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      contractRepository.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.findAll('user-id', {
        orgId: 'org-id',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('publish', () => {
    it('should transition draft contract to open', async () => {
      const contract: Partial<Contract> = {
        id: 'contract-id',
        orgId: 'org-id',
        status: ContractStatus.DRAFT,
        type: ContractType.TRANSPORT,
      };

      // First findOne call (getContractOrThrow), second call (findOne after save)
      contractRepository
        .findOne!.mockResolvedValueOnce(contract)
        .mockResolvedValueOnce({
          ...contract,
          status: ContractStatus.OPEN,
          milestones: [],
          parties: [],
          items: [],
        });

      contractRepository.save!.mockResolvedValue({
        ...contract,
        status: ContractStatus.OPEN,
      });

      mockPermissionsService.hasPermission.mockResolvedValue(true);

      const result = await service.publish('user-id', 'contract-id');

      expect(result.status).toBe(ContractStatus.OPEN);
      expect(contractRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if contract is not draft', async () => {
      const contract: Partial<Contract> = {
        id: 'contract-id',
        orgId: 'org-id',
        status: ContractStatus.OPEN,
        type: ContractType.TRANSPORT,
      };

      contractRepository.findOne!.mockResolvedValue(contract);
      mockPermissionsService.hasPermission.mockResolvedValue(true);

      await expect(service.publish('user-id', 'contract-id')).rejects.toThrow(
        'Only draft contracts can be published',
      );
    });
  });

  describe('claim', () => {
    it('should transition open contract to claimed and add assignee party', async () => {
      const contract: Partial<Contract> = {
        id: 'contract-id',
        orgId: 'org-id',
        status: ContractStatus.OPEN,
        type: ContractType.SECURITY,
      };

      contractRepository
        .findOne!.mockResolvedValueOnce(contract)
        .mockResolvedValueOnce({
          ...contract,
          status: ContractStatus.CLAIMED,
          milestones: [],
          parties: [],
          items: [],
        });

      mockPermissionsService.hasPermission.mockResolvedValue(true);

      mockDataSource.transaction.mockImplementation(
        async (fn: (manager: unknown) => Promise<unknown>) => {
          const manager = {
            create: jest.fn(
              (_entity: unknown, data: Record<string, unknown>) => ({
                ...data,
              }),
            ),
            save: jest.fn(() =>
              Promise.resolve({ ...contract, status: ContractStatus.CLAIMED }),
            ),
            findOne: jest.fn().mockResolvedValue(null),
          };
          return fn(manager);
        },
      );

      const result = await service.claim('user-id', 'contract-id');

      expect(result.status).toBe(ContractStatus.CLAIMED);
    });

    it('should throw BadRequestException if contract is not open', async () => {
      const contract: Partial<Contract> = {
        id: 'contract-id',
        orgId: 'org-id',
        status: ContractStatus.ACTIVE,
        type: ContractType.TRANSPORT,
      };

      contractRepository.findOne!.mockResolvedValue(contract);
      mockPermissionsService.hasPermission.mockResolvedValue(true);

      await expect(service.claim('user-id', 'contract-id')).rejects.toThrow(
        'Only open contracts can be claimed',
      );
    });
  });
});
