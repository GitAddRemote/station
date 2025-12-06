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
};
