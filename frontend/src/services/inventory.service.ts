import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface InventoryItem {
  id: string;
  userId: number;
  gameId: number;
  uexItemId: number;
  locationId: number;
  quantity: number;
  notes?: string;
  sharedOrgId?: number | null;
  active: boolean;
  dateAdded: Date;
  dateModified: Date;
  itemName?: string;
  locationName?: string;
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
  locationId?: number;
  sharedOnly?: boolean;
  sharedOrgId?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: 'name' | 'quantity' | 'date_added' | 'date_modified';
  order?: 'asc' | 'desc';
}

export interface InventorySummary {
  userId: number;
  gameId: number;
  totalItems: number;
  uniqueItems: number;
  locationCount: number;
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
  if (params.locationId !== undefined) query.location_id = params.locationId;
  if (params.sharedOnly !== undefined) query.shared_only = params.sharedOnly;
  if (params.sharedOrgId !== undefined) query.shared_org_id = params.sharedOrgId;
  if (params.search) query.search = params.search;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.offset !== undefined) query.offset = params.offset;
  if (params.sort) query.sort = params.sort;
  if (params.order) query.order = params.order;

  return query;
};

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

const buildOrgInventoryQuery = (params: {
  gameId: number;
  uexItemId?: number;
  locationId?: number;
  activeOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const query: Record<string, string | number | boolean> = {
    gameId: params.gameId,
  };

  if (params.uexItemId !== undefined) query.uexItemId = params.uexItemId;
  if (params.locationId !== undefined) query.locationId = params.locationId;
  if (params.activeOnly !== undefined) query.activeOnly = params.activeOnly;
  if (params.search) query.search = params.search;
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
      headers: getAuthHeader(),
    });
    return response.data;
  },

  /**
   * Get active UEX categories for filtering
   */
  async getCategories(): Promise<InventoryCategory[]> {
    const response = await axios.get(`${API_URL}/api/uex/categories`, {
      headers: getAuthHeader(),
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
        headers: getAuthHeader(),
      },
    );
    return response.data;
  },

  /**
   * Create new inventory item
   */
  async createItem(item: Omit<InventoryItem, 'id' | 'userId' | 'dateAdded' | 'dateModified' | 'active'>): Promise<InventoryItem> {
    const response = await axios.post(`${API_URL}/api/inventory`, item, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  /**
   * Update inventory item
   */
  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await axios.put(`${API_URL}/api/inventory/${id}`, updates, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  /**
   * Delete inventory item
   */
  async deleteItem(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/inventory/${id}`, {
      headers: getAuthHeader(),
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
        headers: getAuthHeader(),
      },
    );
  },

  /**
   * Unshare an item from any organization
   */
  async unshareItem(itemId: string) {
    await axios.delete(`${API_URL}/api/inventory/${itemId}/share`, {
      headers: getAuthHeader(),
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
        headers: getAuthHeader(),
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
      locationId?: number;
      activeOnly?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<InventoryListResponse> {
    const response = await axios.get(
      `${API_URL}/api/orgs/${orgId}/inventory`,
      {
        params: buildOrgInventoryQuery(params),
        headers: getAuthHeader(),
      },
    );

    const items: OrgInventoryItem[] = response.data;
    return {
      items,
      total: items.length,
      limit: params.limit ?? items.length,
      offset: params.offset ?? 0,
    };
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
      { headers: getAuthHeader() },
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
      { headers: getAuthHeader() },
    );
    return response.data;
  },

  /**
   * Delete org inventory item
   */
  async deleteOrgItem(orgId: number, id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/orgs/${orgId}/inventory/${id}`, {
      headers: getAuthHeader(),
    });
  },
};
