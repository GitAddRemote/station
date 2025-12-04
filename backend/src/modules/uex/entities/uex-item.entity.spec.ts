import { UexItem } from './uex-item.entity';
import { UexCategory } from './uex-category.entity';
import { UexCompany } from './uex-company.entity';

describe('UexItem Entity', () => {
  it('should create a UexItem instance', () => {
    const item = new UexItem();
    item.id = 1;
    item.uexId = 300;
    item.name = 'F7C Hornet';
    item.starCitizenUuid = 'uuid-12345';
    item.idCategory = 100;
    item.idCompany = 200;
    item.categoryName = 'Ships';
    item.companyName = 'Anvil Aerospace';
    item.size = 'S2';
    item.weightScu = 25.5;
    item.isCommodity = false;
    item.isBuyable = true;
    item.isSellable = true;
    item.active = true;
    item.deleted = false;

    expect(item).toBeDefined();
    expect(item.id).toBe(1);
    expect(item.uexId).toBe(300);
    expect(item.name).toBe('F7C Hornet');
    expect(item.starCitizenUuid).toBe('uuid-12345');
    expect(item.idCategory).toBe(100);
    expect(item.idCompany).toBe(200);
    expect(item.categoryName).toBe('Ships');
    expect(item.companyName).toBe('Anvil Aerospace');
    expect(item.size).toBe('S2');
    expect(item.weightScu).toBe(25.5);
    expect(item.isCommodity).toBe(false);
    expect(item.isBuyable).toBe(true);
    expect(item.isSellable).toBe(true);
    expect(item.active).toBe(true);
    expect(item.deleted).toBe(false);
  });

  it('should support category relation', () => {
    const item = new UexItem();
    const category = new UexCategory();
    category.uexId = 100;
    category.name = 'Ships';

    item.category = category;

    expect(item.category).toBeDefined();
    expect(item.category?.name).toBe('Ships');
  });

  it('should support company relation', () => {
    const item = new UexItem();
    const company = new UexCompany();
    company.uexId = 200;
    company.name = 'Anvil Aerospace';

    item.company = company;

    expect(item.company).toBeDefined();
    expect(item.company?.name).toBe('Anvil Aerospace');
  });

  it('should allow optional fields to be undefined', () => {
    const item = new UexItem();
    item.uexId = 300;
    item.name = 'Basic Item';

    expect(item.starCitizenUuid).toBeUndefined();
    expect(item.idCategory).toBeUndefined();
    expect(item.idCompany).toBeUndefined();
    expect(item.section).toBeUndefined();
    expect(item.categoryName).toBeUndefined();
    expect(item.companyName).toBeUndefined();
    expect(item.size).toBeUndefined();
    expect(item.weightScu).toBeUndefined();
  });

  it('should have commodity flags with default values', () => {
    const item = new UexItem();

    expect(item.isCommodity).toBeUndefined();
    expect(item.isBuyable).toBeUndefined();
    expect(item.isSellable).toBeUndefined();
  });
});
