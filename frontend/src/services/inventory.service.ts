import { api } from './api.service';

export interface InventoryItem {
  id: string;
  ownerType: 'user' | 'org';
  ownerId: string;
  catalogEntryId: string;
  catalogKind: 'item' | 'commodity' | 'vehicle';
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  locationId: string | null;
  locationName: string | null;
  unitOfMeasureId: string;
  unitOfMeasureCode: string;
  unitOfMeasureLabel: string;
  unitOfMeasureDescription: string | null;
  quantity: number;
  quality: number | null;
  isOrgAvailable: boolean;
  alias: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Keep OrgInventoryItem as alias for backwards compat with Inventory.tsx
export type OrgInventoryItem = InventoryItem;

export interface UnitOfMeasure {
  id: string;
  abbreviation: string;
  name: string;
  catalogKind: 'item' | 'commodity' | 'vehicle' | null;
  scaleFactor: number;
  sortOrder: number;
}

export interface UserOrganizationMembership {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  organization?: {
    id: string;
    name: string;
  };
  role?: {
    id: string;
    name: string;
  };
}

export interface InventorySearchParams {
  ownerType?: 'user' | 'org';
  ownerId?: string;
  orgAvailable?: boolean;
  catalogKind?: 'item' | 'commodity' | 'vehicle';
  categoryId?: string;
  search?: string;
  includeSummary?: boolean;
  page?: number;
  limit?: number;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface InventoryListResponse {
  data: InventoryItem[];
  items: InventoryItem[]; // alias for backwards compat
  total: number;
  page: number;
  limit: number;
}

export interface InventoryCategory {
  id: string;
  name: string;
  path?: string;
  depth?: number;
}

export interface OrgInventoryItemV2 {
  id: string;
  ownerType: 'user' | 'org';
  ownerId: string;
  catalogEntryId: string;
  catalogKind: 'item' | 'commodity' | 'vehicle';
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  locationId: string | null;
  locationName: string | null;
  unitOfMeasureId: string;
  unitOfMeasureCode: string;
  unitOfMeasureLabel: string;
  unitOfMeasureDescription: string | null;
  quantity: number;
  quality: number | null;
  isOrgAvailable: boolean;
  alias: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgInventorySummaryCategory {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  totalQuantity: number;
}

export interface OrgInventorySummary {
  totalItems: number;
  totalQuantity: number;
  byCategory: OrgInventorySummaryCategory[];
}

export interface PaginatedOrgInventoryResponse {
  data: OrgInventoryItemV2[];
  total: number;
  page: number;
  limit: number;
  summary?: OrgInventorySummary;
}

export interface OrgInventoryQueryParams {
  ownerType?: 'org' | 'user';
  ownerId?: string;
  orgId?: string;
  orgAvailable?: boolean;
  catalogKind?: 'item' | 'commodity' | 'vehicle';
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  includeSummary?: boolean;
}

export const inventoryService = {
  async getUnitsOfMeasure(): Promise<UnitOfMeasure[]> {
    const response = await api.get(`/api/units-of-measure`, {
    });
    return response.data;
  },

  async getInventory(params: InventorySearchParams): Promise<InventoryListResponse> {
    const query: Record<string, string | number | boolean> = {};
    if (params.ownerType !== undefined) query.ownerType = params.ownerType;
    if (params.ownerId !== undefined) query.ownerId = params.ownerId;
    if (params.orgAvailable !== undefined) query.orgAvailable = params.orgAvailable;
    if (params.catalogKind !== undefined) query.catalogKind = params.catalogKind;
    if (params.categoryId !== undefined) query.categoryId = params.categoryId;
    if (params.search) query.search = params.search;
    if (params.includeSummary !== undefined) query.includeSummary = params.includeSummary;
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;

    const response = await api.get(`/api/inventory`, {
      params: query,
    });
    // Provide both .data and .items so callers using either shape work
    return { ...response.data, items: response.data.data };
  },

  async getCategories(): Promise<InventoryCategory[]> {
    const response = await api.get(`/api/catalog/categories`, {
    });
    const flatten = (nodes: Array<{ id: string; name: string; path: string; depth: number; children: unknown[] }>): InventoryCategory[] =>
      nodes.flatMap((node) => [
        { id: node.id, name: node.name, path: node.path, depth: node.depth },
        ...flatten(node.children as typeof nodes),
      ]);
    return flatten(response.data);
  },

  async createItem(item: {
    catalogEntryId: string;
    quantity: number;
    unitOfMeasureId: string;
    locationId?: string | null;
    quality?: number | null;
    notes?: string | null;
    isOrgAvailable?: boolean;
  }): Promise<InventoryItem> {
    const response = await api.post(`/api/inventory`, item, {
    });
    return response.data;
  },

  async updateItem(id: string, updates: {
    quantity?: number;
    unitOfMeasureId?: string;
    locationId?: string | null;
    quality?: number | null;
    notes?: string | null;
    isOrgAvailable?: boolean;
  }): Promise<InventoryItem> {
    const response = await api.patch(`/api/inventory/${id}`, updates, {
    });
    return response.data;
  },

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/api/inventory/${id}`, {
    });
  },

  async getUserOrganizations(userId: string): Promise<UserOrganizationMembership[]> {
    const response = await api.get(
      `/user-organization-roles/user/${userId}/organizations`,
    );
    return response.data;
  },

  // Org inventory — uses the same /api/inventory endpoint filtered by ownerType/ownerId
  async getOrgInventory(
    orgId: string,
    params: {
      categoryId?: string;
      search?: string;
      limit?: number;
      page?: number;
      catalogEntryId?: string;
      minQuantity?: number;
      maxQuantity?: number;
    },
  ): Promise<InventoryListResponse> {
    return inventoryService.getInventory({
      ownerType: 'org',
      ownerId: orgId,
      categoryId: params.categoryId,
      search: params.search,
      limit: params.limit,
      page: params.page !== undefined ? params.page : 1,
      minQuantity: params.minQuantity,
      maxQuantity: params.maxQuantity,
    });
  },

  async createOrgItem(
    orgId: string,
    item: {
      catalogEntryId: string;
      quantity: number;
      unitOfMeasureId: string;
      locationId?: string | null;
      quality?: number | null;
      notes?: string | null;
    },
  ): Promise<InventoryItem> {
    const response = await api.post(
      `/api/inventory`,
      { ...item, ownerType: 'org', ownerId: orgId },
    );
    return response.data;
  },

  async updateOrgItem(
    _orgId: string,
    id: string,
    updates: { quantity?: number; unitOfMeasureId?: string; notes?: string | null; locationId?: string | null; quality?: number | null },
  ): Promise<InventoryItem> {
    return inventoryService.updateItem(id, updates);
  },

  async deleteOrgItem(_orgId: string, id: string): Promise<void> {
    return inventoryService.deleteItem(id);
  },

  async listOrgInventory(
    params: OrgInventoryQueryParams,
  ): Promise<PaginatedOrgInventoryResponse> {
    const response = await api.get(`/api/inventory`, {
      params: {
        ...(params.ownerType && { ownerType: params.ownerType }),
        ...(params.ownerId && { ownerId: params.ownerId }),
        ...(params.orgId && { orgId: params.orgId }),
        ...(params.orgAvailable !== undefined && { orgAvailable: params.orgAvailable }),
        ...(params.catalogKind && { catalogKind: params.catalogKind }),
        ...(params.categoryId && { categoryId: params.categoryId }),
        ...(params.search && { search: params.search }),
        ...(params.page !== undefined && { page: params.page }),
        ...(params.limit !== undefined && { limit: params.limit }),
        ...(params.includeSummary !== undefined && { includeSummary: params.includeSummary }),
      },
    });
    return response.data;
  },
};
