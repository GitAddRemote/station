import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UexModule } from './uex.module';
import {
  UexCategory,
  UexCompany,
  UexItem,
  UexStarSystem,
  UexOrbit,
  UexPlanet,
  UexMoon,
  UexCity,
  UexSpaceStation,
  UexOutpost,
  UexPoi,
} from './entities';

describe('UexModule', () => {
  let module: TestingModule;

  // Mock repositories for all entities
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [UexModule],
    })
      .overrideProvider(getRepositoryToken(UexCategory))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexCompany))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexItem))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexStarSystem))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexOrbit))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexPlanet))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexMoon))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexCity))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexSpaceStation))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexOutpost))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UexPoi))
      .useValue(mockRepository)
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should compile UexModule successfully', () => {
    const uexModule = module.get(UexModule);
    expect(uexModule).toBeDefined();
  });
});
