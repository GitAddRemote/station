import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryService = {
    createList: jest.fn(),
    listLists: jest.fn(),
    deleteList: jest.fn(),
    addItemToList: jest.fn(),
    removeItemFromList: jest.fn(),
  };

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

  it('delegates list creation to the service', async () => {
    const req = {
      user: { userId: 7, username: 'pilot' },
    } as AuthenticatedRequest;
    const dto = { name: 'To Sell' };
    const result = { id: 'list-1' };
    mockInventoryService.createList.mockResolvedValue(result);

    await expect(controller.createList(req, dto)).resolves.toEqual(result);
    expect(service.createList).toHaveBeenCalledWith(7, dto);
  });

  it('delegates list retrieval to the service', async () => {
    const req = {
      user: { userId: 7, username: 'pilot' },
    } as AuthenticatedRequest;
    mockInventoryService.listLists.mockResolvedValue([]);

    await controller.listLists(req);

    expect(service.listLists).toHaveBeenCalledWith(7);
  });

  it('delegates list deletion to the service', async () => {
    const req = {
      user: { userId: 7, username: 'pilot' },
    } as AuthenticatedRequest;
    const listId = '00000000-0000-0000-0000-000000000111';

    await controller.deleteList(req, listId);

    expect(service.deleteList).toHaveBeenCalledWith(7, listId);
  });

  it('delegates adding an item to a list to the service', async () => {
    const req = {
      user: { userId: 7, username: 'pilot' },
    } as AuthenticatedRequest;
    const listId = '00000000-0000-0000-0000-000000000111';
    const dto = { inventoryItemId: '00000000-0000-0000-0000-000000000222' };

    await controller.addItemToList(req, listId, dto);

    expect(service.addItemToList).toHaveBeenCalledWith(7, listId, dto);
  });

  it('delegates removing an item from a list to the service', async () => {
    const req = {
      user: { userId: 7, username: 'pilot' },
    } as AuthenticatedRequest;
    const listId = '00000000-0000-0000-0000-000000000111';
    const inventoryItemId = '00000000-0000-0000-0000-000000000222';

    await controller.removeItemFromList(req, listId, inventoryItemId);

    expect(service.removeItemFromList).toHaveBeenCalledWith(
      7,
      listId,
      inventoryItemId,
    );
  });
});
