import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

export interface CatalogItem {
  id: number;
  uexId: number;
  name: string;
  categoryId?: number;
  categoryName?: string;
}

export interface CatalogSearchParams {
  search?: string;
  categoryId?: number;
  limit?: number;
  offset?: number;
}

export interface CatalogSearchResponse {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface StarSystem {
  id: number;
  uexId: number;
  name: string;
  code: string;
  active: boolean;
}

export const uexService = {
  async searchItems(params: CatalogSearchParams): Promise<CatalogSearchResponse> {
    const response = await axios.get(`${API_URL}/api/uex/items`, {
      params,
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async getStarSystems(): Promise<StarSystem[]> {
    const response = await axios.get(`${API_URL}/api/uex/star-systems`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },
};
