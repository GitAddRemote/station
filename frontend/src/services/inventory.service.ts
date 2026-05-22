import axios from 'axios';
import { API_URL } from '../config/api';

export interface InventoryItem {
  id: string;
  userId: number;
  gameId: number;
  uexItemId: number;
  quantity: number;
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';
  quality?: number | null;
  locationType?: string | null;
  locationUexId?: number | null;
  notes?: string;
  sharedOrgId?: number | null;
  active: boolean;
  dateAdded: Date;
  dateModified: Date;
  itemName?: string;
  sharedOrgName?: string;
  categoryName?: string;
}

export interface OrgInventoryItem extends InventoryItem {
  orgId: number;
  orgName?: string;
  addedBy?: number;
  modifiedBy?: number;
  addedByUsername?: string;
  modifiedByUsername?: string;
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
  gameId: number;
  categoryId?: number;
  uexItemId?: number;
  sharedOnly?: boolean;
  sharedOrgId?: number;
  search?: string;
  minQuantity?: number;
  maxQuantity?: number;
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';
  minQuality?: number;
  maxQuality?: number;
  limit?: number;
  offset?: number;
  sort?: 'name' | 'quantity' | 'quality' | 'date_added' | 'date_modified';
  order?: 'asc' | 'desc';
}

export interface InventorySummary {
  userId: number;
  gameId: number;
  totalItems: number;
  uniqueItems: number;
  sharedItemsCount: number;
  lastUpdated: Date;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface InventoryCategory {
  id: number;
  name: string;
  section?: string;
  type?: string;
}

const buildInventoryQuery = (params: InventorySearchParams) => {
  const query: Record<string, string | number | boolean> = {
    game_id: params.gameId,
  };

  if (params.categoryId !== undefined) query.category_id = params.categoryId;
  if (params.uexItemId !== undefined) query.uex_item_id = params.uexItemId;
  if (params.sharedOnly !== undefined) query.shared_only = params.sharedOnly;
  if (params.sharedOrgId !== undefined)
    query.shared_org_id = params.sharedOrgId;
  if (params.search) query.search = params.search;
  if (params.minQuantity !== undefined) query.min_quantity = params.minQuantity;
  if (params.maxQuantity !== undefined) query.max_quantity = params.maxQuantity;
  if (params.unitOfMeasure) query.unit_of_measure = params.unitOfMeasure;
  if (params.minQuality !== undefined) query.min_quality = params.minQuality;
  if (params.maxQuality !== undefined) query.max_quality = params.maxQuality;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.offset !== undefined) query.offset = params.offset;
  if (params.sort) query.sort = params.sort;
  if (params.order) query.order = params.order;

  return query;
};

const buildOrgInventoryQuery = (params: {
  gameId: number;
  uexItemId?: number;
  categoryId?: number;
  activeOnly?: boolean;
  search?: string;
  minQuantity?: number;
  maxQuantity?: number;
  sort?: 'name' | 'quantity' | 'quality' | 'date_added' | 'date_modified';
  order?: 'asc' | 'desc';
  unitOfMeasure?: 'unit' | 'scu' | 'uscu';
  minQuality?: number;
  maxQuality?: number;
  limit?: number;
  offset?: number;
}) => {
  const query: Record<string, string | number | boolean> = {
    gameId: params.gameId,
  };

  if (params.uexItemId !== undefined) query.uexItemId = params.uexItemId;
  if (params.categoryId !== undefined) query.categoryId = params.categoryId;
  if (params.activeOnly !== undefined) query.activeOnly = params.activeOnly;
  if (params.search) query.search = params.search;
  if (params.minQuantity !== undefined) query.minQuantity = params.minQuantity;
  if (params.maxQuantity !== undefined) query.maxQuantity = params.maxQuantity;
  if (params.unitOfMeasure) query.unitOfMeasure = params.unitOfMeasure;
  if (params.minQuality !== undefined) query.minQuality = params.minQuality;
  if (params.maxQuality !== undefined) query.maxQuality = params.maxQuality;
  if (params.sort) query.sort = params.sort;
  if (params.order) query.order = params.order;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.offset !== undefined) query.offset = params.offset;

  return query;
};

export const inventoryService = {
  /**
   * Get user inventory with filters
   */
  async getInventory(
    params: InventorySearchParams,
  ): Promise<InventoryListResponse> {
    const response = await axios.get(`${API_URL}/api/inventory`, {
      params: buildInventoryQuery(params),
      withCredentials: true,
    });
    return response.data;
  },

  /**
   * Get active UEX categories for filtering
   */
  async getCategories(): Promise<InventoryCategory[]> {
    const response = await axios.get(`${API_URL}/api/uex/categories`, {
      withCredentials: true,
    });
    return response.data;
  },

  /**
   * Get inventory summary statistics
   */
  async getSummary(gameId: number): Promise<InventorySummary> {
    const response = await axios.get(
      `${API_URL}/api/inventory/summary/${gameId}`,
      {
        withCredentials: true,
      },
    );
    return response.data;
  },

  /**
   * Create new inventory item
   */
  async createItem(
    item: Omit<
      InventoryItem,
      'id' | 'userId' | 'dateAdded' | 'dateModified' | 'active'
    >,
  ): Promise<InventoryItem> {
    const response = await axios.post(`${API_URL}/api/inventory`, item, {
      withCredentials: true,
    });
    return response.data;
  },

  /**
   * Update inventory item
   */
  async updateItem(
    id: string,
    updates: Partial<InventoryItem>,
  ): Promise<InventoryItem> {
    const response = await axios.put(
      `${API_URL}/api/inventory/${id}`,
      updates,
      {
        withCredentials: true,
      },
    );
    return response.data;
  },

  /**
   * Delete inventory item
   */
  async deleteItem(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/inventory/${id}`, {
      withCredentials: true,
    });
  },

  /**
   * Share an item with an organization
   */
  async shareItem(itemId: string, orgId: number, quantity: number) {
    await axios.post(
      `${API_URL}/api/inventory/${itemId}/share`,
      { orgId, quantity },
      {
        withCredentials: true,
      },
    );
  },

  /**
   * Unshare an item from any organization
   */
  async unshareItem(itemId: string) {
    await axios.delete(`${API_URL}/api/inventory/${itemId}/share`, {
      withCredentials: true,
    });
  },

  /**
   * Get organizations for the current user
   */
  async getUserOrganizations(
    userId: number,
  ): Promise<UserOrganizationMembership[]> {
    const response = await axios.get(
      `${API_URL}/user-organization-roles/user/${userId}/organizations`,
      {
        withCredentials: true,
      },
    );
    return response.data;
  },

  /**
   * Get organization inventory with filters
   */
  async getOrgInventory(
    orgId: number,
    params: {
      gameId: number;
      uexItemId?: number;
      categoryId?: number;
      activeOnly?: boolean;
      search?: string;
      minQuantity?: number;
      maxQuantity?: number;
      unitOfMeasure?: 'unit' | 'scu' | 'uscu';
      minQuality?: number;
      maxQuality?: number;
      sort?: 'name' | 'quantity' | 'quality' | 'date_added' | 'date_modified';
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    },
  ): Promise<InventoryListResponse> {
    const response = await axios.get(`${API_URL}/api/orgs/${orgId}/inventory`, {
      params: buildOrgInventoryQuery(params),
      withCredentials: true,
    });

    return response.data;
  },

  /**
   * Create org inventory item
   */
  async createOrgItem(
    orgId: number,
    item: Omit<
      OrgInventoryItem,
      | 'id'
      | 'userId'
      | 'dateAdded'
      | 'dateModified'
      | 'active'
      | 'orgId'
      | 'orgName'
      | 'addedBy'
      | 'modifiedBy'
    >,
  ): Promise<OrgInventoryItem> {
    const response = await axios.post(
      `${API_URL}/api/orgs/${orgId}/inventory`,
      item,
      { withCredentials: true },
    );
    return response.data;
  },

  /**
   * Update org inventory item
   */
  async updateOrgItem(
    orgId: number,
    id: string,
    updates: Partial<OrgInventoryItem>,
  ): Promise<OrgInventoryItem> {
    const response = await axios.put(
      `${API_URL}/api/orgs/${orgId}/inventory/${id}`,
      updates,
      { withCredentials: true },
    );
    return response.data;
  },

  /**
   * Delete org inventory item
   */
  async deleteOrgItem(orgId: number, id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/orgs/${orgId}/inventory/${id}`, {
      withCredentials: true,
    });
  },
};
