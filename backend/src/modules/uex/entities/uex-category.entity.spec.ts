import { UexCategory } from './uex-category.entity';

describe('UexCategory Entity', () => {
  it('should create a UexCategory instance', () => {
    const category = new UexCategory();
    category.id = 1;
    category.uexId = 100;
    category.name = 'Test Category';
    category.type = 'item';
    category.section = 'weapons';
    category.isGameRelated = true;
    category.active = true;
    category.deleted = false;

    expect(category).toBeDefined();
    expect(category.id).toBe(1);
    expect(category.uexId).toBe(100);
    expect(category.name).toBe('Test Category');
    expect(category.type).toBe('item');
    expect(category.section).toBe('weapons');
    expect(category.isGameRelated).toBe(true);
    expect(category.active).toBe(true);
    expect(category.deleted).toBe(false);
  });

  it('should allow optional fields to be undefined', () => {
    const category = new UexCategory();
    category.uexId = 100;
    category.name = 'Minimal Category';

    expect(category.type).toBeUndefined();
    expect(category.section).toBeUndefined();
  });

  it('should inherit audit fields from BaseUexEntity', () => {
    const category = new UexCategory();
    const now = new Date();

    category.dateAdded = now;
    category.dateModified = now;
    category.addedById = 1;
    category.modifiedById = 1;

    expect(category.dateAdded).toBe(now);
    expect(category.dateModified).toBe(now);
    expect(category.addedById).toBe(1);
    expect(category.modifiedById).toBe(1);
  });
});
