import {
  DEFAULT_INVENTORY_QUALITY_MAX,
  getInventoryQualityPolicy,
  INVENTORY_QUALITY_MIN,
  parseInventoryQualityMax,
} from './inventory-quality.config';

describe('inventory quality policy', () => {
  it('uses the documented default max when the env var is absent', () => {
    expect(getInventoryQualityPolicy({})).toEqual({
      min: INVENTORY_QUALITY_MIN,
      max: DEFAULT_INVENTORY_QUALITY_MAX,
    });
  });

  it('accepts a configured integer upper bound', () => {
    expect(parseInventoryQualityMax('2500')).toBe(2500);
  });

  it('falls back to the documented default when the env value is invalid', () => {
    expect(parseInventoryQualityMax('-1')).toBe(DEFAULT_INVENTORY_QUALITY_MAX);
    expect(parseInventoryQualityMax('12.5')).toBe(
      DEFAULT_INVENTORY_QUALITY_MAX,
    );
    expect(parseInventoryQualityMax('abc')).toBe(DEFAULT_INVENTORY_QUALITY_MAX);
  });
});
