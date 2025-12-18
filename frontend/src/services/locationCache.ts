import { locationService, LocationRecord } from './location.service';
import { uexService, StarSystem } from './uex.service';

const DEFAULT_GAME_ID = 1;
const STORAGE_PREFIX = 'storableLocations:v1';

type StoredLocations = {
  etag?: string;
  updatedAt: number;
  data: LocationRecord[];
};

const systemsPromises = new Map<number, Promise<StarSystem[]>>();
const storableLocationPromises = new Map<number, Promise<LocationRecord[]>>();

const getStorageKey = (gameId: number) => `${STORAGE_PREFIX}:${gameId}`;

const readStoredLocations = (gameId: number): StoredLocations | null => {
  const raw = localStorage.getItem(getStorageKey(gameId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'data' in parsed &&
      Array.isArray((parsed as { data: unknown }).data)
    ) {
      return parsed as StoredLocations;
    }
  } catch (error) {
    console.error('Failed to parse stored locations cache', error);
  }

  return null;
};

const writeStoredLocations = (gameId: number, payload: StoredLocations) => {
  localStorage.setItem(getStorageKey(gameId), JSON.stringify(payload));
};

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

const fetchStorableLocations = async (gameId: number = DEFAULT_GAME_ID) => {
  const cachedPromise = storableLocationPromises.get(gameId);
  if (cachedPromise) {
    return cachedPromise;
  }

  const promise = (async () => {
    const cached = readStoredLocations(gameId);
    const { data, etag, notModified } =
      await locationService.getStorableLocations({
        gameId,
        etag: cached?.etag,
      });

    if (notModified) {
      if (cached) {
        return cached.data;
      }
      // No cached data; fall back to refetch without ETag
      const fresh = await locationService.getStorableLocations({ gameId });
      writeStoredLocations(gameId, {
        etag: fresh.etag,
        updatedAt: Date.now(),
        data: fresh.data,
      });
      return fresh.data;
    }

    writeStoredLocations(gameId, {
      etag,
      updatedAt: Date.now(),
      data,
    });
    return data;
  })().catch((error) => {
    storableLocationPromises.delete(gameId);
    throw error;
  });

  storableLocationPromises.set(gameId, promise);
  return promise;
};

export const locationCache = {
  async prefetch(gameId: number = DEFAULT_GAME_ID) {
    const systems = await fetchActiveSystems(gameId);
    await fetchStorableLocations(gameId);
    return systems;
  },
  getActiveSystems(gameId: number = DEFAULT_GAME_ID) {
    return fetchActiveSystems(gameId);
  },
  getAllLocations(gameId: number = DEFAULT_GAME_ID) {
    return fetchStorableLocations(gameId);
  },
  clear() {
    systemsPromises.clear();
    storableLocationPromises.clear();
  },
};
