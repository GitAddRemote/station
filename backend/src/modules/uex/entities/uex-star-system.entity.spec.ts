import { UexStarSystem } from './uex-star-system.entity';

describe('UexStarSystem Entity', () => {
  it('should create a UexStarSystem instance', () => {
    const starSystem = new UexStarSystem();
    starSystem.id = 1;
    starSystem.uexId = 1;
    starSystem.name = 'Stanton';
    starSystem.code = 'STAN';
    starSystem.isAvailable = true;
    starSystem.active = true;
    starSystem.deleted = false;

    expect(starSystem).toBeDefined();
    expect(starSystem.id).toBe(1);
    expect(starSystem.uexId).toBe(1);
    expect(starSystem.name).toBe('Stanton');
    expect(starSystem.code).toBe('STAN');
    expect(starSystem.isAvailable).toBe(true);
    expect(starSystem.active).toBe(true);
    expect(starSystem.deleted).toBe(false);
  });

  it('should inherit audit fields from BaseUexEntity', () => {
    const starSystem = new UexStarSystem();
    const now = new Date();

    starSystem.uexDateModified = now;

    expect(starSystem.uexDateModified).toBe(now);
  });
});
