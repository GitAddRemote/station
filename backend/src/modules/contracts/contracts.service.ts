import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AuditAction, AuditEntityType } from '../audit-logs/audit-log.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StationInventoryItem } from '../inventory/entities/station-inventory-item.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { OrgPermission } from '../permissions/permissions.constants';
import { AddContractPartyDto } from './dto/add-contract-party.dto';
import { ContractQueryDto } from './dto/contract-query.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ContractItem } from './entities/contract-item.entity';
import {
  ContractMilestone,
  MilestoneState,
} from './entities/contract-milestone.entity';
import { ContractParty } from './entities/contract-party.entity';
import { ContractStatusHistory } from './entities/contract-status-history.entity';
import {
  Contract,
  ContractStatus,
  ContractType,
} from './entities/contract.entity';

export interface PaginatedContractsResult {
  data: Contract[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ContractsService {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 20;

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(ContractMilestone)
    private readonly milestoneRepository: Repository<ContractMilestone>,
    @InjectRepository(ContractParty)
    private readonly partyRepository: Repository<ContractParty>,
    @InjectRepository(ContractItem)
    private readonly itemRepository: Repository<ContractItem>,
    @InjectRepository(ContractStatusHistory)
    private readonly statusHistoryRepository: Repository<ContractStatusHistory>,
    @InjectRepository(StationInventoryItem)
    private readonly inventoryItemRepository: Repository<StationInventoryItem>,
    private readonly dataSource: DataSource,
    private readonly permissionsService: PermissionsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    userId: string,
    query: ContractQueryDto,
  ): Promise<PaginatedContractsResult> {
    const page = query.page ?? ContractsService.DEFAULT_PAGE;
    const limit = query.limit ?? ContractsService.DEFAULT_LIMIT;

    if (query.orgId) {
      await this.assertPermission(
        userId,
        query.orgId,
        OrgPermission.CAN_VIEW_ORG_CONTRACTS,
      );
    }

    const qb = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.milestones', 'milestones')
      .leftJoinAndSelect('contract.parties', 'parties')
      .orderBy('contract.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.orgId) {
      qb.andWhere('contract.org_id = :orgId', { orgId: query.orgId });
    }

    if (query.type) {
      qb.andWhere('contract.type = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('contract.status = :status', { status: query.status });
    }

    if (query.assignedToMe) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM contract_party cp WHERE cp.contract_id = contract.id AND cp.user_id = :userId)',
        { userId },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(userId: string, contractId: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['milestones', 'parties', 'items'],
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_VIEW_ORG_CONTRACTS,
    );

    return contract;
  }

  async getStatusHistory(
    userId: string,
    contractId: string,
  ): Promise<ContractStatusHistory[]> {
    const contract = await this.getContractOrThrow(contractId);
    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_VIEW_ORG_CONTRACTS,
    );
    return this.statusHistoryRepository.find({
      where: { contractId },
      relations: ['changedByUser'],
      order: { changedAt: 'ASC' },
    });
  }

  async create(userId: string, dto: CreateContractDto): Promise<Contract> {
    await this.assertPermission(
      userId,
      dto.orgId,
      OrgPermission.CAN_MANAGE_CONTRACTS,
    );

    const contract = await this.dataSource.transaction(async (manager) => {
      const newContract = manager.create(Contract, {
        orgId: dto.orgId,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        status: ContractStatus.DRAFT,
        risk: dto.risk ?? null,
        rewardAuec: dto.rewardAuec != null ? String(dto.rewardAuec) : null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        deliveryLocationId: dto.deliveryLocationId ?? null,
        details: dto.details ?? null,
        creatorId: userId,
      });

      const saved = await manager.save(Contract, newContract);

      if (dto.milestones?.length) {
        const milestones = dto.milestones.map((m, index) =>
          manager.create(ContractMilestone, {
            contractId: saved.id,
            label: m.label,
            state: MilestoneState.PENDING,
            sortOrder: m.sortOrder ?? index,
          }),
        );
        await manager.save(ContractMilestone, milestones);
      }

      if (dto.items?.length) {
        const items = dto.items.map((item, index) =>
          manager.create(ContractItem, {
            contractId: saved.id,
            itemSubtype: item.itemSubtype,
            catalogEntryId: item.catalogEntryId ?? null,
            inventoryItemId: item.inventoryItemId ?? null,
            pickupLocationId: item.pickupLocationId ?? null,
            quantity: item.quantity != null ? String(item.quantity) : '0',
            quality: item.quality != null ? String(item.quality) : null,
            vehicleSubtype: item.vehicleSubtype ?? null,
            sortOrder: item.sortOrder ?? index,
          }),
        );
        await manager.save(ContractItem, items);
      }

      // Create creator party record
      await manager.save(
        ContractParty,
        manager.create(ContractParty, {
          contractId: saved.id,
          userId,
          role: 'creator' as ContractParty['role'],
        }),
      );

      return saved;
    });

    await this.recordStatusTransition(
      contract.id,
      null,
      ContractStatus.DRAFT,
      userId,
      'Contract created',
    );

    await this.auditLogsService.log({
      userId,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { contractTitle: contract.title, orgId: contract.orgId },
    });

    return this.findOne(userId, contract.id);
  }

  async update(
    userId: string,
    contractId: string,
    dto: UpdateContractDto,
  ): Promise<Contract> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_MANAGE_CONTRACTS,
    );

    if (
      contract.status !== ContractStatus.DRAFT &&
      contract.status !== ContractStatus.OPEN
    ) {
      throw new BadRequestException(
        'Only draft or open contracts can be updated',
      );
    }

    if (dto.title !== undefined) contract.title = dto.title;
    if (dto.description !== undefined)
      contract.description = dto.description ?? null;
    if (dto.risk !== undefined) contract.risk = dto.risk ?? null;
    if (dto.rewardAuec !== undefined) {
      contract.rewardAuec =
        dto.rewardAuec != null ? String(dto.rewardAuec) : null;
    }
    if (dto.deadline !== undefined) {
      contract.deadline = dto.deadline ? new Date(dto.deadline) : null;
    }
    if (dto.deliveryLocationId !== undefined) {
      contract.deliveryLocationId = dto.deliveryLocationId ?? null;
    }
    if (dto.details !== undefined) contract.details = dto.details ?? null;

    await this.contractRepository.save(contract);

    await this.auditLogsService.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { orgId: contract.orgId },
    });

    return this.findOne(userId, contract.id);
  }

  async remove(userId: string, contractId: string): Promise<void> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_MANAGE_CONTRACTS,
    );

    const prevStatus = contract.status;
    contract.status = ContractStatus.CANCELLED;
    await this.contractRepository.save(contract);
    await this.recordStatusTransition(
      contract.id,
      prevStatus,
      ContractStatus.CANCELLED,
      userId,
    );

    await this.auditLogsService.log({
      userId,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { orgId: contract.orgId },
    });
  }

  async publish(userId: string, contractId: string): Promise<Contract> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_MANAGE_CONTRACTS,
    );

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Only draft contracts can be published');
    }

    contract.status = ContractStatus.OPEN;
    await this.contractRepository.save(contract);
    await this.recordStatusTransition(
      contract.id,
      ContractStatus.DRAFT,
      ContractStatus.OPEN,
      userId,
    );

    await this.auditLogsService.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { transition: 'publish', orgId: contract.orgId },
    });

    return this.findOne(userId, contract.id);
  }

  async claim(userId: string, contractId: string): Promise<Contract> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_CLAIM_CONTRACT,
    );

    if (contract.status !== ContractStatus.OPEN) {
      throw new BadRequestException('Only open contracts can be claimed');
    }

    await this.dataSource.transaction(async (manager) => {
      contract.status = ContractStatus.CLAIMED;
      await manager.save(Contract, contract);

      const existing = await manager.findOne(ContractParty, {
        where: {
          contractId,
          userId,
          role: 'assignee' as ContractParty['role'],
        },
      });
      if (!existing) {
        await manager.save(
          ContractParty,
          manager.create(ContractParty, {
            contractId,
            userId,
            role: 'assignee' as ContractParty['role'],
          }),
        );
      }
    });
    await this.recordStatusTransition(
      contract.id,
      ContractStatus.OPEN,
      ContractStatus.CLAIMED,
      userId,
    );

    await this.auditLogsService.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { transition: 'claim', orgId: contract.orgId },
    });

    return this.findOne(userId, contract.id);
  }

  async start(userId: string, contractId: string): Promise<Contract> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_CLAIM_CONTRACT,
    );

    if (contract.status !== ContractStatus.CLAIMED) {
      throw new BadRequestException('Only claimed contracts can be started');
    }

    contract.status = ContractStatus.ACTIVE;
    await this.contractRepository.save(contract);
    await this.recordStatusTransition(
      contract.id,
      ContractStatus.CLAIMED,
      ContractStatus.ACTIVE,
      userId,
    );

    await this.auditLogsService.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { transition: 'start', orgId: contract.orgId },
    });

    return this.findOne(userId, contract.id);
  }

  async complete(userId: string, contractId: string): Promise<Contract> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_CLAIM_CONTRACT,
    );

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Only active contracts can be completed');
    }

    if (contract.type === ContractType.TRANSFER) {
      await this.executeTransferCompletion(userId, contract);
    } else {
      contract.status = ContractStatus.COMPLETED;
      await this.contractRepository.save(contract);
    }
    await this.recordStatusTransition(
      contract.id,
      ContractStatus.ACTIVE,
      ContractStatus.COMPLETED,
      userId,
    );

    await this.auditLogsService.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { transition: 'complete', orgId: contract.orgId },
    });

    return this.findOne(userId, contract.id);
  }

  private async executeTransferCompletion(
    userId: string,
    contract: Contract,
  ): Promise<void> {
    const items = await this.itemRepository.find({
      where: { contractId: contract.id },
    });

    await this.dataSource.transaction(async (manager) => {
      for (const contractItem of items) {
        if (!contractItem.inventoryItemId) continue;

        const memberItem = await manager.findOne(StationInventoryItem, {
          where: { id: contractItem.inventoryItemId },
        });

        if (!memberItem) continue;

        const transferQty = Number(contractItem.quantity);

        // Find or create org-owned inventory record for same catalogEntryId + quality
        let orgItem = await manager.findOne(StationInventoryItem, {
          where: {
            ownerType: 'org',
            ownerId: contract.orgId,
            catalogEntryId: memberItem.catalogEntryId,
            quality:
              memberItem.quality === null ? IsNull() : memberItem.quality,
          },
        });

        if (orgItem) {
          orgItem.quantity = String(Number(orgItem.quantity) + transferQty);
          await manager.save(StationInventoryItem, orgItem);
        } else {
          orgItem = manager.create(StationInventoryItem, {
            ownerType: 'org',
            ownerId: contract.orgId,
            catalogEntryId: memberItem.catalogEntryId,
            catalogKind: memberItem.catalogKind,
            locationId: memberItem.locationId,
            unitOfMeasureId: memberItem.unitOfMeasureId,
            quantity: String(transferQty),
            quality: memberItem.quality,
            alias: null,
            effectiveProperties: null,
            notes: null,
          });
          await manager.save(StationInventoryItem, orgItem);
        }

        // Subtract from member item
        const remaining = Number(memberItem.quantity) - transferQty;
        if (remaining <= 0) {
          await manager.delete(StationInventoryItem, { id: memberItem.id });
        } else {
          memberItem.quantity = String(remaining);
          await manager.save(StationInventoryItem, memberItem);
        }

        await this.auditLogsService.log({
          userId,
          action: AuditAction.UPDATE,
          entityType: AuditEntityType.ORGANIZATION,
          entityId: memberItem.id,
          metadata: {
            event: 'inventory_transfer',
            contractId: contract.id,
            fromUserId: memberItem.ownerId,
            toOrgId: contract.orgId,
            catalogEntryId: memberItem.catalogEntryId,
            quantity: transferQty,
          },
        });
      }

      contract.status = ContractStatus.COMPLETED;
      await manager.save(Contract, contract);
    });
  }

  async dispute(userId: string, contractId: string): Promise<Contract> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_MANAGE_CONTRACTS,
    );

    if (
      contract.status !== ContractStatus.ACTIVE &&
      contract.status !== ContractStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Only active or completed contracts can be disputed',
      );
    }

    const prevStatusDispute = contract.status;
    contract.status = ContractStatus.DISPUTED;
    await this.contractRepository.save(contract);
    await this.recordStatusTransition(
      contract.id,
      prevStatusDispute,
      ContractStatus.DISPUTED,
      userId,
    );

    await this.auditLogsService.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { transition: 'dispute', orgId: contract.orgId },
    });

    return this.findOne(userId, contract.id);
  }

  async cancel(userId: string, contractId: string): Promise<Contract> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_MANAGE_CONTRACTS,
    );

    const terminalStatuses: ContractStatus[] = [
      ContractStatus.COMPLETED,
      ContractStatus.CANCELLED,
    ];

    if (terminalStatuses.includes(contract.status)) {
      throw new BadRequestException(
        'Cannot cancel a completed or already cancelled contract',
      );
    }

    const prevStatusCancel = contract.status;
    contract.status = ContractStatus.CANCELLED;
    await this.contractRepository.save(contract);
    await this.recordStatusTransition(
      contract.id,
      prevStatusCancel,
      ContractStatus.CANCELLED,
      userId,
    );

    await this.auditLogsService.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ORGANIZATION,
      entityId: contract.id,
      metadata: { transition: 'cancel', orgId: contract.orgId },
    });

    return this.findOne(userId, contract.id);
  }

  async updateMilestone(
    userId: string,
    contractId: string,
    milestoneId: string,
    dto: UpdateMilestoneDto,
  ): Promise<ContractMilestone> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_CLAIM_CONTRACT,
    );

    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, contractId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    milestone.state = dto.state;
    return this.milestoneRepository.save(milestone);
  }

  async addParty(
    userId: string,
    contractId: string,
    dto: AddContractPartyDto,
  ): Promise<ContractParty> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_MANAGE_CONTRACTS,
    );

    const party = this.partyRepository.create({
      contractId,
      userId: dto.userId ?? null,
      orgId: dto.orgId ?? null,
      role: dto.role,
    });

    return this.partyRepository.save(party);
  }

  async removeParty(
    userId: string,
    contractId: string,
    partyId: string,
  ): Promise<void> {
    const contract = await this.getContractOrThrow(contractId);

    await this.assertPermission(
      userId,
      contract.orgId,
      OrgPermission.CAN_MANAGE_CONTRACTS,
    );

    const result = await this.partyRepository.delete({
      id: partyId,
      contractId,
    });

    if (!result.affected) {
      throw new NotFoundException('Party not found');
    }
  }

  private async getContractOrThrow(contractId: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  private async assertPermission(
    userId: string,
    orgId: string,
    permission: OrgPermission,
  ): Promise<void> {
    const hasPermission = await this.permissionsService.hasPermission(
      userId,
      orgId,
      permission,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission: ${permission}`,
      );
    }
  }

  private async recordStatusTransition(
    contractId: string,
    fromStatus: ContractStatus | null,
    toStatus: ContractStatus,
    changedBy: string,
    note?: string,
  ): Promise<void> {
    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        contractId,
        fromStatus: fromStatus ?? null,
        toStatus,
        changedBy,
        note: note ?? null,
      }),
    );
  }
}
