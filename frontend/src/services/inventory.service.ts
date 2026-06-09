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

export type OrgInventoryItem = InventoryItem;

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
  page?: number;
  limit?: number;
  ownerType?: 'user' | 'org';
  ownerId?: string;
  catalogEntryId?: string;
  catalogKind?: 'item' | 'commodity' | 'vehicle';
  categoryId?: string;
  search?: string;
  minQuantity?: number;
  maxQuantity?: number;
  unitOfMeasureId?: string;
  locationId?: string;
  sort?: 'name' | 'quantity' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedInventoryResponse {
  data: InventoryItem[];
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

export interface CreateInventoryItemPayload {
  catalogEntryId: string;
  quantity: number;
  unitOfMeasureId: string;
  locationId?: string | null;
  quality?: number | null;
  notes?: string | null;
  isOrgAvailable?: boolean;
  customName?: string | null;
}

const buildInventoryQuery = (params: InventorySearchParams) => {
  const query: Record<string, string | number | boolean> = {};

  if (params.page !== undefined) query.page = params.page;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.ownerType !== undefined) query.ownerType = params.ownerType;
  if (params.ownerId !== undefined) query.ownerId = params.ownerId;
  if (params.catalogEntryId !== undefined) query.catalogEntryId = params.catalogEntryId;
  if (params.catalogKind !== undefined) query.catalogKind = params.catalogKind;
  if (params.categoryId !== undefined) query.categoryId = params.categoryId;
  if (params.search) query.search = params.search;
  if (params.minQuantity !== undefined) query.minQuantity = params.minQuantity;
  if (params.maxQuantity !== undefined) query.maxQuantity = params.maxQuantity;
  if (params.unitOfMeasureId !== undefined) query.unitOfMeasureId = params.unitOfMeasureId;
  if (params.locationId !== undefined) query.locationId = params.locationId;
  if (params.sort) query.sort = params.sort;
  if (params.order) query.order = params.order;

  return query;
};

export const inventoryService = {
  async getInventory(
    params: InventorySearchParams,
  ): Promise<PaginatedInventoryResponse> {
    const response = await axios.get(`${API_URL}/api/inventory`, {
      params: buildInventoryQuery(params),
      withCredentials: true,
    });
    return response.data;
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

  async createItem(payload: CreateInventoryItemPayload): Promise<InventoryItem> {
    const response = await axios.post(`${API_URL}/api/inventory`, payload, {
      withCredentials: true,
    });
    return response.data;
  },

  async updateItem(
    id: string,
    updates: Partial<Pick<CreateInventoryItemPayload, 'quantity' | 'unitOfMeasureId' | 'locationId' | 'quality' | 'notes' | 'isOrgAvailable' | 'customName'>>,
  ): Promise<InventoryItem> {
    const response = await axios.patch(
      `${API_URL}/api/inventory/${id}`,
      updates,
      { withCredentials: true },
    );
    return response.data;
  },

  async deleteItem(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/inventory/${id}`, {
      withCredentials: true,
    });
  },

  async getUserOrganizations(
    userId: number,
  ): Promise<UserOrganizationMembership[]> {
    const response = await axios.get(
      `${API_URL}/user-organization-roles/user/${userId}/organizations`,
      { withCredentials: true },
    );
    return response.data;
  },

  async getOrgInventory(
    orgId: number,
    params: InventorySearchParams,
  ): Promise<PaginatedInventoryResponse> {
    const response = await axios.get(`${API_URL}/api/orgs/${orgId}/inventory`, {
      params: buildInventoryQuery(params),
      withCredentials: true,
    });
    return response.data;
  },

  async createOrgItem(
    orgId: number,
    payload: CreateInventoryItemPayload,
  ): Promise<InventoryItem> {
    const response = await axios.post(
      `${API_URL}/api/orgs/${orgId}/inventory`,
      payload,
      { withCredentials: true },
    );
    return response.data;
  },

  async updateOrgItem(
    orgId: number,
    id: string,
    updates: Partial<Pick<CreateInventoryItemPayload, 'quantity' | 'unitOfMeasureId' | 'locationId' | 'quality' | 'notes' | 'isOrgAvailable' | 'customName'>>,
  ): Promise<InventoryItem> {
    const response = await axios.patch(
      `${API_URL}/api/orgs/${orgId}/inventory/${id}`,
      updates,
      { withCredentials: true },
    );
    return response.data;
  },

  async deleteOrgItem(orgId: number, id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/orgs/${orgId}/inventory/${id}`, {
      withCredentials: true,
    });
  },

  async splitItem(
    id: string,
    splitQuantity: number,
  ): Promise<{ remaining: InventoryItem; split: InventoryItem }> {
    const response = await axios.post(
      `${API_URL}/api/inventory/${id}/split`,
      { splitQuantity },
      { withCredentials: true },
    );
    return response.data;
  },

  async splitOrgItem(
    orgId: number,
    id: string,
    splitQuantity: number,
  ): Promise<{ remaining: InventoryItem; split: InventoryItem }> {
    const response = await axios.post(
      `${API_URL}/api/orgs/${orgId}/inventory/${id}/split`,
      { splitQuantity },
      { withCredentials: true },
    );
    return response.data;
  },

  async shareItem(itemId: string, orgId: number, quantity: number): Promise<void> {
    await axios.post(
      `${API_URL}/api/inventory/${itemId}/share`,
      { orgId, quantity },
      { withCredentials: true },
    );
  },

  async unshareItem(itemId: string): Promise<void> {
    await axios.delete(`${API_URL}/api/inventory/${itemId}/share`, {
      withCredentials: true,
    });
  },
};
