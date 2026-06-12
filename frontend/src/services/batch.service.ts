import { api } from './api.service';

export interface BatchDto {
  id: string;
  ownerType: 'user' | 'org';
  ownerId: string;
  name: string;
  locationId: string;
  locationName?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedBatchesDto {
  data: BatchDto[];
  total: number;
  page: number;
  limit: number;
}

export interface BatchLocationConflictItem {
  id: string;
  name: string;
  currentLocationId: string | null;
  currentLocationName: string | null;
  targetLocationId: string;
  targetLocationName: string;
}

export interface BatchLocationConflictDto {
  conflictingItems: BatchLocationConflictItem[];
}

const BASE = '/api/inventory/batches';

export const batchService = {
  async list(page = 1, limit = 50): Promise<PaginatedBatchesDto> {
    const res = await api.get<PaginatedBatchesDto>(BASE, { params: { page, limit } });
    return res.data;
  },

  async create(name: string, locationId: string): Promise<BatchDto> {
    const res = await api.post<BatchDto>(BASE, { name, locationId });
    return res.data;
  },

  async update(id: string, patch: { name?: string; locationId?: string }, force = false): Promise<BatchDto> {
    const res = await api.patch<BatchDto>(`${BASE}/${id}`, patch, { params: force ? { force: 'true' } : {} });
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async addItems(batchId: string, itemIds: string[], force = false): Promise<BatchDto> {
    const res = await api.post<BatchDto>(
      `${BASE}/${batchId}/items`,
      { itemIds },
      { params: force ? { force: 'true' } : {} },
    );
    return res.data;
  },

  async removeItem(batchId: string, itemId: string): Promise<void> {
    await api.delete(`${BASE}/${batchId}/items/${itemId}`);
  },
};
