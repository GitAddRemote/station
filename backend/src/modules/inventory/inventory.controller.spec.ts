import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryService = {
    createItem: jest.fn(),
    listItems: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
    createList: jest.fn(),
    listLists: jest.fn(),
    deleteList: jest.fn(),
    addItemToList: jest.fn(),
    removeItemFromList: jest.fn(),
  };

  const request = {
    user: { userId: '00000000-0000-0000-0000-000000000007', username: 'pilot' },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates inventory creation to the service', async () => {
    const dto = {
      catalogEntryId: '00000000-0000-0000-0000-000000000101',
      quantity: 2,
      unitOfMeasureId: '00000000-0000-0000-0000-000000000201',
    };
    mockInventoryService.createItem.mockResolvedValue({ id: 'item-1' });

    await controller.createItem(request, dto);

    expect(service.createItem).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000007',
      dto,
    );
  });

  it('delegates inventory listing to the service', async () => {
    const query = { ownerType: 'user' as const, page: 1, limit: 20 };
    mockInventoryService.listItems.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await controller.listItems(request, query);

    expect(service.listItems).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000007',
      query,
    );
  });

  it('delegates inventory updates to the service', async () => {
    const dto = { quantity: 4 };
    await controller.updateItem(
      request,
      '00000000-0000-0000-0000-000000000111',
      dto,
    );

    expect(service.updateItem).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000007',
      '00000000-0000-0000-0000-000000000111',
      dto,
    );
  });

  it('delegates inventory deletion to the service', async () => {
    await controller.deleteItem(
      request,
      '00000000-0000-0000-0000-000000000111',
    );

    expect(service.deleteItem).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000007',
      '00000000-0000-0000-0000-000000000111',
    );
  });

  it('delegates list creation to the service', async () => {
    const dto = { name: 'To Sell' };
    const result = { id: 'list-1' };
    mockInventoryService.createList.mockResolvedValue(result);

    await expect(controller.createList(request, dto)).resolves.toEqual(result);
    expect(service.createList).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000007',
      dto,
    );
  });

  it('delegates list retrieval to the service', async () => {
    mockInventoryService.listLists.mockResolvedValue([]);

    await controller.listLists(request);

    expect(service.listLists).toHaveBeenCalledWith(7);
  });

  it('delegates list deletion to the service', async () => {
    const listId = '00000000-0000-0000-0000-000000000111';

    await controller.deleteList(request, listId);

    expect(service.deleteList).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000007',
      listId,
    );
  });

  it('delegates adding an item to a list to the service', async () => {
    const listId = '00000000-0000-0000-0000-000000000111';
    const dto = { inventoryItemId: '00000000-0000-0000-0000-000000000222' };

    await controller.addItemToList(request, listId, dto);

    expect(service.addItemToList).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000007',
      listId,
      dto,
    );
  });

  it('delegates removing an item from a list to the service', async () => {
    const listId = '00000000-0000-0000-0000-000000000111';
    const inventoryItemId = '00000000-0000-0000-0000-000000000222';

    await controller.removeItemFromList(request, listId, inventoryItemId);

    expect(service.removeItemFromList).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000007',
      listId,
      inventoryItemId,
    );
  });
});
