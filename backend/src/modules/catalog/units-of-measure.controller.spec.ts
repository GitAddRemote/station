import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import { UnitsOfMeasureController } from './units-of-measure.controller';

describe('UnitsOfMeasureController', () => {
  let controller: UnitsOfMeasureController;
  let service: CatalogService;

  const mockCatalogService = {
    getUnitsOfMeasure: jest.fn().mockResolvedValue([
      {
        id: 'uom-1',
        name: 'Unit',
        abbreviation: 'unit',
        catalog_kind: null,
        scale_factor: 1,
        sort_order: 1,
      },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitsOfMeasureController],
      providers: [
        {
          provide: CatalogService,
          useValue: mockCatalogService,
        },
      ],
    }).compile();

    controller = module.get<UnitsOfMeasureController>(UnitsOfMeasureController);
    service = module.get<CatalogService>(CatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates list requests to the service', async () => {
    const result = await controller.listUnitsOfMeasure();

    expect(service.getUnitsOfMeasure).toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: 'uom-1',
        name: 'Unit',
        abbreviation: 'unit',
        catalog_kind: null,
        scale_factor: 1,
        sort_order: 1,
      },
    ]);
  });
});
