import { BadRequestException } from '@nestjs/common';
import { OrgInventoryController } from './org-inventory.controller';
import { OrgInventoryService } from './org-inventory.service';

describe('OrgInventoryController', () => {
  let controller: OrgInventoryController;
  let orgInventoryService: jest.Mocked<Pick<OrgInventoryService, 'search'>>;

  beforeEach(() => {
    orgInventoryService = {
      search: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        limit: 25,
        offset: 0,
      }),
    };

    controller = new OrgInventoryController(
      orgInventoryService as unknown as OrgInventoryService,
    );
  });

  it('accepts camelCase query aliases for org inventory filters', async () => {
    await controller.list({ user: { userId: 7 } }, 42, {
      gameId: '1',
      categoryId: '5',
      uexItemId: '9',
      locationId: '12',
      minQuantity: '0.25',
      maxQuantity: '10.5',
      limit: '25',
      offset: '50',
    });

    expect(orgInventoryService.search).toHaveBeenCalledWith(7, {
      orgId: 42,
      gameId: 1,
      categoryId: 5,
      uexItemId: 9,
      locationId: 12,
      search: undefined,
      limit: 25,
      offset: 50,
      sort: undefined,
      order: undefined,
      activeOnly: undefined,
      minQuantity: 0.25,
      maxQuantity: 10.5,
    });
  });

  it('throws a bad request for invalid numeric pagination params', async () => {
    await expect(
      controller.list({ user: { userId: 7 } }, 42, {
        gameId: '1',
        limit: 'abc',
      }),
    ).rejects.toThrow(new BadRequestException('limit must be a number'));
  });
});
