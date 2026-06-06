import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UexService } from './uex.service';
import { UexCategory } from './entities/uex-category.entity';
import { UexCommodity } from './entities/uex-commodity.entity';
import { UexItem } from './entities/uex-item.entity';
import { UexStarSystem } from './entities/uex-star-system.entity';

describe('UexService', () => {
  let service: UexService;
  let itemRepository: Repository<UexItem>;
  let commodityRepository: Repository<UexCommodity>;

  const mockCategoryRepository = {};
  const mockStarSystemRepository = {
    find: jest.fn(),
  };

  const mockItem = {
    id: '1',
    uexId: 100,
    name: 'Test Item',
    idCategory: 5,
    category: { name: 'Weapons' },
    categoryName: 'Weapons',
    active: true,
    deleted: false,
  } as unknown as UexItem;

  const createQueryBuilder = () => {
    const qb: Record<string, jest.Mock> = {
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

  const createCommodityQueryBuilder = (results: unknown[] = [], total = 0) => {
    const qb: Record<string, jest.Mock> = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([results, total]),
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
          provide: getRepositoryToken(UexCommodity),
          useValue: { createQueryBuilder: jest.fn() },
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
    commodityRepository = module.get<Repository<UexCommodity>>(
      getRepositoryToken(UexCommodity),
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
      id: '1',
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
    const mockQueryBuilder: Record<string, jest.Mock> = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          uexId: 10,
          name: 'Stanton',
          code: 'STANTON',
          active: true,
        },
      ]),
    };

    (
      mockStarSystemRepository as unknown as Record<string, jest.Mock>
    ).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

    const systems = await service.getStarSystems({});

    expect(
      (mockStarSystemRepository as unknown as Record<string, jest.Mock>)
        .createQueryBuilder,
    ).toHaveBeenCalledWith('system');
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'system.deleted = FALSE',
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'system.active = TRUE',
    );
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('system.name', 'ASC');
    expect(systems[0]).toMatchObject({
      id: '1',
      uexId: 10,
      name: 'Stanton',
      code: 'STANTON',
      active: true,
    });
  });

  it('should allow including inactive systems when filters disable flags', async () => {
    const mockQueryBuilder: Record<string, jest.Mock> = {
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

    (
      mockStarSystemRepository as unknown as Record<string, jest.Mock>
    ).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

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

  describe('searchCommodities', () => {
    it('should apply base filters and return mapped results', async () => {
      const mockCommodity = {
        id: '1',
        uexId: 42,
        name: 'Laranite',
        code: 'LAR',
        section: 'Minerals',
        idCategory: 3,
        isBuyable: true,
        isSellable: false,
        isIllegal: null,
        isFuel: null,
        priceBuy: '12.50',
        priceSell: null,
        scu: '1.00',
      };
      const qb = createCommodityQueryBuilder([mockCommodity], 1);
      (commodityRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.searchCommodities({});

      expect(commodityRepository.createQueryBuilder).toHaveBeenCalledWith(
        'commodity',
      );
      expect(qb.where).toHaveBeenCalledWith('commodity.deleted = FALSE');
      expect(qb.andWhere).toHaveBeenCalledWith('commodity.active = TRUE');
      expect(qb.orderBy).toHaveBeenCalledWith('commodity.name', 'ASC');

      expect(result.total).toBe(1);
      expect(result.commodities[0]).toMatchObject({
        id: '1',
        uexId: 42,
        name: 'Laranite',
        code: 'LAR',
        section: 'Minerals',
        categoryId: 3,
        isBuyable: true,
        isSellable: false,
        isIllegal: false,
        isFuel: false,
        priceBuy: 12.5,
        priceSell: undefined,
        scu: 1,
      });
    });

    it('should apply search, categoryId, and boolean flag filters', async () => {
      const qb = createCommodityQueryBuilder();
      (commodityRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await service.searchCommodities({
        search: 'gold',
        categoryId: 7,
        isBuyable: true,
        isSellable: false,
        isIllegal: true,
        isFuel: false,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('commodity.name ILIKE :search', {
        search: '%gold%',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'commodity.idCategory = :categoryId',
        { categoryId: 7 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(commodity.isBuyable, FALSE) = :isBuyable',
        { isBuyable: true },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(commodity.isSellable, FALSE) = :isSellable',
        { isSellable: false },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(commodity.isIllegal, FALSE) = :isIllegal',
        { isIllegal: true },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(commodity.isFuel, FALSE) = :isFuel',
        { isFuel: false },
      );
    });

    it('should not apply flag filters when flags are undefined', async () => {
      const qb = createCommodityQueryBuilder();
      (commodityRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await service.searchCommodities({});

      const andWhereCalls = qb.andWhere.mock.calls.map((c: unknown[]) => c[0]);
      expect(andWhereCalls).not.toContain(expect.stringContaining('isBuyable'));
      expect(andWhereCalls).not.toContain(
        expect.stringContaining('isSellable'),
      );
    });

    it('should apply default limit and offset', async () => {
      const qb = createCommodityQueryBuilder();
      (commodityRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.searchCommodities({});

      expect(qb.take).toHaveBeenCalledWith(25);
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(0);
    });

    it('should cap limit at 100', async () => {
      const qb = createCommodityQueryBuilder();
      (commodityRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.searchCommodities({ limit: 200 });

      expect(qb.take).toHaveBeenCalledWith(100);
      expect(result.limit).toBe(100);
    });
  });
});
