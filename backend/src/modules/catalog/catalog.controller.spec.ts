import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

describe('CatalogController', () => {
  let controller: CatalogController;
  let service: CatalogService;

  const mockCatalogService = {
    searchCatalog: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
    }),
    getCategoryTree: jest.fn().mockResolvedValue([]),
    getCatalogEntryById: jest.fn().mockResolvedValue({ id: 'entry-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: mockCatalogService,
        },
      ],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
    service = module.get<CatalogService>(CatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates list queries to the service', async () => {
    const query = {
      search: 'rifle',
      categoryId: '00000000-0000-0000-0000-000000000001',
      page: 1,
      limit: 20,
      includeUnavailable: false,
    };

    const result = await controller.listCatalog(query);

    expect(service.searchCatalog).toHaveBeenCalledWith(query);
    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 50 });
  });

  it('delegates category tree requests to the service', async () => {
    await controller.listCategories();
    expect(service.getCategoryTree).toHaveBeenCalled();
  });

  it('delegates detail requests to the service', async () => {
    await controller.getById('entry-1');
    expect(service.getCatalogEntryById).toHaveBeenCalledWith('entry-1');
  });
});
