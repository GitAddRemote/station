import { UexCompany } from './uex-company.entity';

describe('UexCompany Entity', () => {
  it('should create a UexCompany instance', () => {
    const company = new UexCompany();
    company.id = 1;
    company.uexId = 200;
    company.name = 'Anvil Aerospace';
    company.code = 'ANVL';
    company.active = true;
    company.deleted = false;

    expect(company).toBeDefined();
    expect(company.id).toBe(1);
    expect(company.uexId).toBe(200);
    expect(company.name).toBe('Anvil Aerospace');
    expect(company.code).toBe('ANVL');
    expect(company.active).toBe(true);
    expect(company.deleted).toBe(false);
  });

  it('should allow code to be optional', () => {
    const company = new UexCompany();
    company.uexId = 200;
    company.name = 'Generic Company';

    expect(company.code).toBeUndefined();
  });

  it('should inherit soft-delete fields from BaseUexEntity', () => {
    const company = new UexCompany();
    company.active = true;
    company.deleted = false;

    expect(company.active).toBe(true);
    expect(company.deleted).toBe(false);
  });
});
