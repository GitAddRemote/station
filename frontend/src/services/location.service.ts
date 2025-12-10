import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

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

export const locationService = {
  async searchLocations(params: {
    gameId: number;
    search?: string;
    type?: string;
    limit?: number;
  }): Promise<LocationRecord[]> {
    const response = await axios.get(`${API_URL}/api/locations`, {
      params,
      headers: getAuthHeader(),
    });
    return response.data;
  },
};
