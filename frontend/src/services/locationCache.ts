import { locationService, LocationRecord } from './location.service';
import { uexService, StarSystem } from './uex.service';

const DEFAULT_GAME_ID = 1;
const LOCATIONS_LIMIT = 2000;

const systemsPromises = new Map<number, Promise<StarSystem[]>>();
const locationsPromises = new Map<number, Promise<LocationRecord[]>>();

const fetchActiveSystems = async (gameId: number = DEFAULT_GAME_ID) => {
  const cached = systemsPromises.get(gameId);
  if (cached) {
    return cached;
  }

  const promise = uexService
    .getStarSystems()
    .then((systems) => systems.filter((system) => system.active))
    .catch((error) => {
      systemsPromises.delete(gameId);
      throw error;
    });

  systemsPromises.set(gameId, promise);
  return promise;
};

const fetchAllLocations = async (gameId: number = DEFAULT_GAME_ID) => {
  const cached = locationsPromises.get(gameId);
  if (cached) {
    return cached;
  }

  const promise = locationService
    .searchLocations({ gameId, limit: LOCATIONS_LIMIT })
    .catch((error) => {
      locationsPromises.delete(gameId);
      throw error;
    });

  locationsPromises.set(gameId, promise);
  return promise;
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
    systemsPromises.clear();
    locationsPromises.clear();
  },
};
