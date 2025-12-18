import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import InventoryPage from './Inventory';

const mockUpdateItem = jest.fn();
const mockGetInventory = jest.fn();

jest.mock('../services/inventory.service', () => ({
  inventoryService: {
    getCategories: jest.fn().mockResolvedValue([]),
    getUserOrganizations: jest.fn().mockResolvedValue([]),
    getInventory: (...args: unknown[]) => mockGetInventory(...args),
    getOrgInventory: jest.fn(),
    updateItem: (...args: unknown[]) => mockUpdateItem(...args),
    updateOrgItem: jest.fn(),
    shareItem: jest.fn(),
    unshareItem: jest.fn(),
  },
}));

jest.mock('../services/locationCache', () => ({
  locationCache: {
    prefetch: jest.fn().mockResolvedValue([]),
    getActiveSystems: jest.fn().mockResolvedValue([]),
    getAllLocations: jest.fn().mockResolvedValue([]),
  },
}));

const mockItem = {
  id: 'item-1',
  userId: 1,
  gameId: 1,
  uexItemId: 100,
  locationId: 200,
  quantity: 2,
  notes: '',
  sharedOrgId: null,
  active: true,
  dateAdded: new Date().toISOString(),
  dateModified: new Date().toISOString(),
  itemName: 'Test Item',
  locationName: 'Test Location',
  categoryName: 'Test Category',
};

describe('Inventory editor mode inline controls', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetInventory.mockResolvedValue({ items: [mockItem], total: 1, limit: 25, offset: 0 });
    mockUpdateItem.mockResolvedValue({});
    // minimal profile fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ userId: 1, username: 'tester' }),
    } as unknown as Response);
    localStorage.setItem('access_token', 'token');
  });

  it('renders inline location/quantity/save in Editor Mode and calls update on save', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

    const viewModeSelect = screen.getByLabelText('View mode');
    fireEvent.mouseDown(viewModeSelect);
    const editorOption = await screen.findByText('Editor Mode');
    fireEvent.click(editorOption);

    const quantityInput = await screen.findByTestId('inline-quantity-item-1');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    const saveButton = screen.getByTestId('inline-save-item-1');
    fireEvent.click(saveButton);

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalled());
    expect(mockUpdateItem).toHaveBeenCalledWith('item-1', {
      locationId: 200,
      quantity: 5,
    });
  });
});
