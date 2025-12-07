import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UexCompany } from '../../uex/entities/uex-company.entity';
import { UexSyncService } from '../uex-sync.service';
import {
  UEXCompaniesClient,
  UEXCompanyResponse,
} from '../clients/uex-companies.client';
import { SystemUserService } from '../../users/system-user.service';

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  durationMs: number;
}

@Injectable()
export class CompaniesSyncService {
  private readonly logger = new Logger(CompaniesSyncService.name);

  constructor(
    @InjectRepository(UexCompany)
    private readonly companyRepository: Repository<UexCompany>,
    private readonly uexClient: UEXCompaniesClient,
    private readonly syncService: UexSyncService,
    private readonly systemUserService: SystemUserService,
  ) {}

  async syncCompanies(
    _forceFull?: boolean,
  ): Promise<SyncResult & { syncMode: 'delta' | 'full' }> {
    const endpoint = 'companies';
    const startTime = Date.now();

    try {
      await this.syncService.acquireSyncLock(endpoint);

      // For now, always run a full sync
      const companies = await this.uexClient.fetchCompanies();
      if (companies.length === 0) {
        const durationMs = Date.now() - startTime;
        await this.syncService.recordSyncSuccess(endpoint, {
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsDeleted: 0,
          durationMs,
          syncMode: 'full',
        });
        return {
          created: 0,
          updated: 0,
          durationMs,
          syncMode: 'full',
          deleted: 0,
        };
      }

      const result = await this.upsertCompanies(companies);
      const durationMs = Date.now() - startTime;

      await this.syncService.recordSyncSuccess(endpoint, {
        recordsCreated: result.created,
        recordsUpdated: result.updated,
        recordsDeleted: 0,
        durationMs,
        syncMode: 'full',
      });

      this.logger.log(
        `Companies sync completed: created ${result.created}, updated ${result.updated}, duration ${durationMs}ms`,
      );

      return {
        ...result,
        deleted: 0,
        durationMs,
        syncMode: 'full',
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.syncService.recordSyncFailure(endpoint, error, durationMs);
      throw error;
    } finally {
      await this.syncService.releaseSyncLock(endpoint);
    }
  }

  private async upsertCompanies(
    companies: UEXCompanyResponse[],
  ): Promise<{ created: number; updated: number }> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    for (const company of companies) {
      const existing = await this.companyRepository.findOne({
        where: { uexId: company.id },
      });

      const payload = {
        name: company.name,
        code: company.nickname ?? undefined,
        deleted: false,
        uexDateModified:
          company.date_modified !== undefined && company.date_modified !== null
            ? new Date(company.date_modified * 1000)
            : undefined,
        modifiedById: systemUserId,
      };

      if (existing) {
        await this.companyRepository.update({ uexId: company.id }, payload);
        updated++;
      } else {
        await this.companyRepository.save({
          uexId: company.id,
          ...payload,
          active: true,
          addedById: systemUserId,
        });
        created++;
      }
    }

    return { created, updated };
  }
}
