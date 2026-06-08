export const INVENTORY_QUALITY_MIN = 0;
export const DEFAULT_INVENTORY_QUALITY_MAX = 1000;
export const INVENTORY_QUALITY_MAX_ENV = 'INVENTORY_QUALITY_MAX';

export interface InventoryQualityPolicy {
  min: number;
  max: number;
}

export function getInventoryQualityPolicy(
  env: NodeJS.ProcessEnv = process.env,
): InventoryQualityPolicy {
  return {
    min: INVENTORY_QUALITY_MIN,
    max: parseInventoryQualityMax(env[INVENTORY_QUALITY_MAX_ENV]),
  };
}

export function parseInventoryQualityMax(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_INVENTORY_QUALITY_MAX;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue < INVENTORY_QUALITY_MIN) {
    return DEFAULT_INVENTORY_QUALITY_MAX;
  }

  return parsedValue;
}
