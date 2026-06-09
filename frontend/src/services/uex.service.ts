import { api } from './api.service';

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
    const response = await api.get('/api/uex/items', { params });
    return response.data;
  },

  async getStarSystems(): Promise<StarSystem[]> {
    const response = await api.get('/api/uex/star-systems');
    return response.data;
  },
};
