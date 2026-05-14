import axios from 'axios';
import { API_URL } from '../config/api';

export interface LocationRecord {
  id: string;
  gameId: number;
  locationType: string;
  displayName: string;
  shortName: string;
  isAvailable: boolean;
  isLandable?: boolean;
  hasArmistice?: boolean;
  hierarchyPath?: Record<string, string>;
}

export interface StorableLocationsResponse {
  data: LocationRecord[];
  etag?: string;
  notModified: boolean;
}

export const locationService = {
  async searchLocations(params: {
    gameId: number;
    search?: string;
    type?: string;
    limit?: number;
    starSystemId?: number;
  }): Promise<LocationRecord[]> {
    const response = await axios.get(`${API_URL}/api/locations`, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  async getStorableLocations(params: {
    gameId: number;
    etag?: string;
  }): Promise<StorableLocationsResponse> {
    const response = await axios.get(`${API_URL}/api/locations/storable`, {
      params: { gameId: params.gameId },
      headers: params.etag ? { 'If-None-Match': params.etag } : {},
      withCredentials: true,
      validateStatus: (status) => status === 200 || status === 304,
    });

    if (response.status === 304) {
      return { data: [], etag: params.etag, notModified: true };
    }

    const nextEtag =
      typeof response.headers.etag === 'string'
        ? response.headers.etag
        : undefined;

    return {
      data: response.data as LocationRecord[],
      etag: nextEtag,
      notModified: false,
    };
  },
};
