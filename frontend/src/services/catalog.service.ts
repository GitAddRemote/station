import axios from 'axios';
import { API_URL } from '../config/api';

export interface CatalogEntryDto {
  id: string;
  catalogKind: 'item' | 'commodity' | 'vehicle';
  uexId?: number | null;
  name: string;
  slug: string;
  categoryId: string;
  categoryPath: string;
  isAvailableLive: boolean;
  isIllegal?: boolean | null;
  isConcept?: boolean | null;
  size?: number | null;
  scu?: string | null;
  crewMin?: number | null;
  crewMax?: number | null;
  baseProperties?: Record<string, unknown> | null;
  attributes?: Record<string, unknown> | null;
}

export interface CatalogCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  path: string;
  pathIds: string[];
  depth: number;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  children: CatalogCategory[];
}

export interface CatalogQueryParams {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  includeUnavailable?: boolean;
}

export interface PaginatedCatalogResponse {
  data: CatalogEntryDto[];
  total: number;
  page: number;
  limit: number;
}

export interface LocationDto {
  id: string;
  name: string;
  slug: string;
  sourceType: string;
  starSystemUexId: number | null;
  starSystemName: string | null;
}

export const catalogService = {
  async getCatalogItems(
    params: CatalogQueryParams,
  ): Promise<PaginatedCatalogResponse> {
    const response = await axios.get(`${API_URL}/api/catalog`, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  async getCatalogCategories(): Promise<CatalogCategory[]> {
    const response = await axios.get(`${API_URL}/api/catalog/categories`, {
      withCredentials: true,
    });
    return response.data;
  },

  async getLocations(search?: string): Promise<LocationDto[]> {
    const response = await axios.get(`${API_URL}/api/catalog/locations`, {
      params: search && search.length >= 2 ? { search } : undefined,
      withCredentials: true,
    });
    return response.data;
  },
};
