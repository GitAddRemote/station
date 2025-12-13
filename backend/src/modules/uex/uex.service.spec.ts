import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UexService } from './uex.service';
import { UexCategory } from './entities/uex-category.entity';
import { UexItem } from './entities/uex-item.entity';
import { UexStarSystem } from './entities/uex-star-system.entity';

describe('UexService', () => {
  let service: UexService;
  let itemRepository: Repository<UexItem>;

  const mockCategoryRepository = {};
  const mockStarSystemRepository = {
    find: jest.fn(),
  };

  const mockItem = {
    id: 1,
    uexId: 100,
    name: 'Test Item',
    idCategory: 5,
    category: { name: 'Weapons' },
    categoryName: 'Weapons',
    active: true,
    deleted: false,
  } as unknown as UexItem;

  const createQueryBuilder = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockItem], 1]),
    };
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UexService,
        {
          provide: getRepositoryToken(UexCategory),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(UexItem),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UexStarSystem),
          useValue: mockStarSystemRepository,
        },
      ],
    }).compile();

    service = module.get<UexService>(UexService);
    itemRepository = module.get<Repository<UexItem>>(
      getRepositoryToken(UexItem),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should search items with filters and pagination', async () => {
    const qb = createQueryBuilder();
    (itemRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const result = await service.searchItems({
      search: 'test',
      categoryId: 5,
      limit: 10,
      offset: 20,
    });

    expect(itemRepository.createQueryBuilder).toHaveBeenCalledWith('item');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
      'item.category',
      'category',
    );
    expect(qb.where).toHaveBeenCalledWith('item.deleted = FALSE');
    expect(qb.andWhere).toHaveBeenCalledWith('item.active = TRUE');
    expect(qb.andWhere).toHaveBeenCalledWith('item.idCategory = :categoryId', {
      categoryId: 5,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('item.name ILIKE :search', {
      search: '%test%',
    });
    expect(qb.orderBy).toHaveBeenCalledWith('item.name', 'ASC');
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(qb.skip).toHaveBeenCalledWith(20);

    expect(result.total).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
    expect(result.items[0]).toMatchObject({
      id: 1,
      uexId: 100,
      name: 'Test Item',
      categoryId: 5,
      categoryName: 'Weapons',
    });
  });

  it('should apply defaults and cap limits', async () => {
    const qb = createQueryBuilder();
    (itemRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const result = await service.searchItems({});

    expect(qb.take).toHaveBeenCalledWith(25);
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(0);
  });

  it('should return active star systems by default', async () => {
    const mockQueryBuilder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          uexId: 10,
          name: 'Stanton',
          code: 'STANTON',
          active: true,
        },
      ]),
    };

    (mockStarSystemRepository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(mockQueryBuilder);

    const systems = await service.getStarSystems({});

    expect(
      (mockStarSystemRepository as any).createQueryBuilder,
    ).toHaveBeenCalledWith('system');
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'system.deleted = FALSE',
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'system.active = TRUE',
    );
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('system.name', 'ASC');
    expect(systems[0]).toMatchObject({
      id: 1,
      uexId: 10,
      name: 'Stanton',
      code: 'STANTON',
      active: true,
    });
  });

  it('should allow including inactive systems when filters disable flags', async () => {
    const mockQueryBuilder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 2,
          uexId: 20,
          name: 'Terra',
          code: 'TERRA',
          active: false,
        },
      ]),
    };

    (mockStarSystemRepository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(mockQueryBuilder);

    const systems = await service.getStarSystems({
      activeOnly: false,
    });

    expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
      'system.active = TRUE',
    );
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'system.deleted = FALSE',
    );
    expect(systems[0].active).toBe(false);
  });
});
