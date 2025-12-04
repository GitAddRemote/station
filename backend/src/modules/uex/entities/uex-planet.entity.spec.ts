import { UexPlanet } from './uex-planet.entity';
import { UexStarSystem } from './uex-star-system.entity';

describe('UexPlanet Entity', () => {
  it('should create a UexPlanet instance', () => {
    const planet = new UexPlanet();
    planet.id = 1;
    planet.uexId = 10;
    planet.starSystemId = 1;
    planet.name = 'Hurston';
    planet.code = 'HUR';
    planet.isAvailable = true;
    planet.isLandable = true;
    planet.active = true;
    planet.deleted = false;

    expect(planet).toBeDefined();
    expect(planet.id).toBe(1);
    expect(planet.uexId).toBe(10);
    expect(planet.starSystemId).toBe(1);
    expect(planet.name).toBe('Hurston');
    expect(planet.code).toBe('HUR');
    expect(planet.isAvailable).toBe(true);
    expect(planet.isLandable).toBe(true);
    expect(planet.active).toBe(true);
    expect(planet.deleted).toBe(false);
  });

  it('should support star system relation', () => {
    const planet = new UexPlanet();
    const starSystem = new UexStarSystem();
    starSystem.uexId = 1;
    starSystem.name = 'Stanton';

    planet.starSystem = starSystem;

    expect(planet.starSystem).toBeDefined();
    expect(planet.starSystem.name).toBe('Stanton');
  });

  it('should allow code to be optional', () => {
    const planet = new UexPlanet();
    planet.uexId = 10;
    planet.starSystemId = 1;
    planet.name = 'Test Planet';

    expect(planet.code).toBeUndefined();
  });
});
