import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { StationCatalogEntry } from './entities/station-catalog-entry.entity';
import { StationCatalogCategory } from './entities/station-catalog-category.entity';

describe('CatalogService', () => {
  let service: CatalogService;

  const mockEntryRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const createQueryBuilder = () => {
    const builder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    mockEntryRepository.createQueryBuilder.mockReturnValue(builder);
    return builder;
  };

  const category = {
    id: 'cat-1',
    parentId: null,
    name: 'Weapons',
    slug: 'weapons',
    path: 'item.weapons',
    pathIds: ['cat-1'],
    depth: 1,
    description: null,
    sortOrder: 0,
    isActive: true,
  } as StationCatalogCategory;

  const entry = {
    id: 'entry-1',
    categoryId: 'cat-1',
    category,
    catalogKind: 'item',
    uexId: 42,
    name: 'Laser Rifle',
    slug: 'laser-rifle',
    isAvailableLive: true,
    isIllegal: false,
    isConcept: false,
    size: 2,
    scu: null,
    crewMin: null,
    crewMax: null,
    baseProperties: { rarity: 'rare' },
    attributes: { damage: 10 },
  } as unknown as StationCatalogEntry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: getRepositoryToken(StationCatalogEntry),
          useValue: mockEntryRepository,
        },
        {
          provide: getRepositoryToken(StationCatalogCategory),
          useValue: mockCategoryRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached search results without querying repositories', async () => {
    const cachedResult = { data: [], total: 0, page: 1, limit: 50 };
    mockCacheManager.get.mockResolvedValueOnce(cachedResult);

    const result = await service.searchCatalog({ page: 1, limit: 50 });

    expect(result).toBe(cachedResult);
    expect(mockEntryRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('applies search, descendant category filter, pagination, and default availability on cache miss', async () => {
    mockCacheManager.get.mockResolvedValueOnce(null);
    mockCategoryRepository.findOne.mockResolvedValueOnce(category);
    const builder = createQueryBuilder();
    builder.getManyAndCount.mockResolvedValueOnce([[entry], 1]);

    const result = await service.searchCatalog({
      categoryId: 'cat-1',
      search: 'rifle',
      page: 2,
      limit: 20,
      includeUnavailable: false,
    });

    expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
    });
    expect(builder.andWhere).toHaveBeenCalledWith(
      'entry.is_available_live = TRUE',
    );
    expect(builder.andWhere).toHaveBeenCalledWith('entry.name ILIKE :search', {
      search: '%rifle%',
    });
    expect(builder.andWhere).toHaveBeenCalledWith(
      '(category.path = :categoryPath OR category.path LIKE :categoryPathLike)',
      {
        categoryPath: 'item.weapons',
        categoryPathLike: 'item.weapons.%',
      },
    );
    expect(builder.skip).toHaveBeenCalledWith(20);
    expect(builder.take).toHaveBeenCalledWith(20);
    expect(mockCacheManager.set).toHaveBeenCalled();
    expect(result).toEqual({
      data: [
        {
          id: 'entry-1',
          catalogKind: 'item',
          uexId: 42,
          name: 'Laser Rifle',
          slug: 'laser-rifle',
          categoryId: 'cat-1',
          categoryPath: 'item.weapons',
          isAvailableLive: true,
          isIllegal: false,
          isConcept: false,
          size: 2,
          scu: null,
          crewMin: null,
          crewMax: null,
          baseProperties: { rarity: 'rare' },
          attributes: { damage: 10 },
        },
      ],
      total: 1,
      page: 2,
      limit: 20,
    });
  });

  it('throws when category filter references a missing category', async () => {
    mockCacheManager.get.mockResolvedValueOnce(null);
    mockCategoryRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.searchCatalog({ categoryId: 'missing', page: 1, limit: 50 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds and caches the full category tree', async () => {
    mockCacheManager.get.mockResolvedValueOnce(null);
    mockCategoryRepository.find.mockResolvedValueOnce([
      {
        ...category,
        parentId: null,
      },
      {
        ...category,
        id: 'cat-2',
        parentId: 'cat-1',
        name: 'Rifles',
        slug: 'rifles',
        path: 'item.weapons.rifles',
        pathIds: ['cat-1', 'cat-2'],
        depth: 2,
      },
    ]);

    const result = await service.getCategoryTree();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'cat-1',
        children: [
          expect.objectContaining({
            id: 'cat-2',
            children: [],
          }),
        ],
      }),
    ]);
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'catalog:categories:tree',
      result,
      300000,
    );
  });

  it('returns cached entry detail when available', async () => {
    const cachedEntry = { id: 'entry-1', name: 'Laser Rifle' };
    mockCacheManager.get.mockResolvedValueOnce(cachedEntry);

    const result = await service.getCatalogEntryById('entry-1');

    expect(result).toBe(cachedEntry);
    expect(mockEntryRepository.findOne).not.toHaveBeenCalled();
  });

  it('loads and caches entry detail on cache miss', async () => {
    mockCacheManager.get.mockResolvedValueOnce(null);
    mockEntryRepository.findOne.mockResolvedValueOnce(entry);

    const result = await service.getCatalogEntryById('entry-1');

    expect(mockEntryRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      relations: ['category'],
    });
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'catalog:entry:entry-1',
      result,
      300000,
    );
    expect(result.name).toBe('Laser Rifle');
  });
});
