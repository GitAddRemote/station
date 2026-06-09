import axios from 'axios';
import { API_URL } from '../config/api';

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
  code: string;
  label: string;
  description: string | null;
  catalogKind: string | null;
}

export interface UserOrganizationMembership {
  id: number;
  userId: number;
  organizationId: number;
  roleId: number;
  organization?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
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

export const inventoryService = {
  async getUnitsOfMeasure(): Promise<UnitOfMeasure[]> {
    const response = await axios.get(`${API_URL}/api/units-of-measure`, {
      withCredentials: true,
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

    const response = await axios.get(`${API_URL}/api/inventory`, {
      params: query,
      withCredentials: true,
    });
    // Provide both .data and .items so callers using either shape work
    return { ...response.data, items: response.data.data };
  },

  async getCategories(): Promise<InventoryCategory[]> {
    const response = await axios.get(`${API_URL}/api/catalog/categories`, {
      withCredentials: true,
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
    const response = await axios.post(`${API_URL}/api/inventory`, item, {
      withCredentials: true,
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
    const response = await axios.patch(`${API_URL}/api/inventory/${id}`, updates, {
      withCredentials: true,
    });
    return response.data;
  },

  async deleteItem(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/inventory/${id}`, {
      withCredentials: true,
    });
  },

  async getUserOrganizations(userId: number): Promise<UserOrganizationMembership[]> {
    const response = await axios.get(
      `${API_URL}/user-organization-roles/user/${userId}/organizations`,
      { withCredentials: true },
    );
    return response.data;
  },

  // Org inventory — uses the same /api/inventory endpoint filtered by ownerType/ownerId
  async getOrgInventory(
    orgId: number,
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
      ownerId: String(orgId),
      categoryId: params.categoryId,
      search: params.search,
      limit: params.limit,
      page: params.page !== undefined ? params.page : 1,
      minQuantity: params.minQuantity,
      maxQuantity: params.maxQuantity,
    });
  },

  async createOrgItem(
    orgId: number,
    item: {
      catalogEntryId: string;
      quantity: number;
      unitOfMeasureId: string;
      locationId?: string | null;
      quality?: number | null;
      notes?: string | null;
    },
  ): Promise<InventoryItem> {
    const response = await axios.post(
      `${API_URL}/api/inventory`,
      { ...item, ownerType: 'org', ownerId: String(orgId) },
      { withCredentials: true },
    );
    return response.data;
  },

  async updateOrgItem(
    _orgId: number,
    id: string,
    updates: { quantity?: number; notes?: string | null },
  ): Promise<InventoryItem> {
    return inventoryService.updateItem(id, updates);
  },

  async deleteOrgItem(_orgId: number, id: string): Promise<void> {
    return inventoryService.deleteItem(id);
  },
};
