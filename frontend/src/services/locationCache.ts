import { locationService, LocationRecord } from './location.service';
import { uexService, StarSystem } from './uex.service';

const DEFAULT_GAME_ID = 1;
const LOCATIONS_LIMIT = 2000;

let systemsPromise: Promise<StarSystem[]> | null = null;
let locationsPromise: Promise<LocationRecord[]> | null = null;

const fetchActiveSystems = async (gameId: number = DEFAULT_GAME_ID) => {
  if (!systemsPromise) {
    systemsPromise = uexService
      .getStarSystems()
      .then((systems) => systems.filter((system) => system.active));
  }

  return systemsPromise;
};

const fetchAllLocations = async (gameId: number = DEFAULT_GAME_ID) => {
  if (!locationsPromise) {
    locationsPromise = locationService
      .searchLocations({ gameId, limit: LOCATIONS_LIMIT })
      .catch((error) => {
        locationsPromise = null;
        throw error;
      });
  }

  return locationsPromise;
};

export const locationCache = {
  async prefetch(gameId: number = DEFAULT_GAME_ID) {
    const systems = await fetchActiveSystems(gameId);
    await fetchAllLocations(gameId);
    return systems;
  },
  getActiveSystems(gameId: number = DEFAULT_GAME_ID) {
    return fetchActiveSystems(gameId);
  },
  getAllLocations(gameId: number = DEFAULT_GAME_ID) {
    return fetchAllLocations(gameId);
  },
  clear() {
    systemsPromise = null;
    locationsPromise = null;
  },
};
