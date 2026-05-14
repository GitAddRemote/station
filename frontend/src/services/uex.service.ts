import axios from 'axios';
import { API_URL } from '../config/api';

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
  async searchItems(
    params: CatalogSearchParams,
  ): Promise<CatalogSearchResponse> {
    const response = await axios.get(`${API_URL}/api/uex/items`, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  async getStarSystems(): Promise<StarSystem[]> {
    const response = await axios.get(`${API_URL}/api/uex/star-systems`, {
      withCredentials: true,
    });
    return response.data;
  },
};
