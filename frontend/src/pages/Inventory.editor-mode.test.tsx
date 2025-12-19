import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import InventoryPage from './Inventory';
import { locationCache } from '../services/locationCache';
import type { LocationRecord } from '../services/location.service';

const mockUpdateItem = jest.fn();
const mockGetInventory = jest.fn();
const mockGetUserOrganizations = jest.fn();
const mockCreateItem = jest.fn();
const mockCreateOrgItem = jest.fn();
const mockSearchItems = jest.fn();

jest.mock('../services/inventory.service', () => ({
  inventoryService: {
    getCategories: jest.fn().mockResolvedValue([]),
    getUserOrganizations: (...args: unknown[]) => mockGetUserOrganizations(...args),
    getInventory: (...args: unknown[]) => mockGetInventory(...args),
    getOrgInventory: jest.fn(),
    updateItem: (...args: unknown[]) => mockUpdateItem(...args),
    updateOrgItem: jest.fn(),
    createItem: (...args: unknown[]) => mockCreateItem(...args),
    createOrgItem: (...args: unknown[]) => mockCreateOrgItem(...args),
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

jest.mock('../services/uex.service', () => ({
  uexService: {
    searchItems: (...args: unknown[]) => mockSearchItems(...args),
    getStarSystems: jest.fn(),
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
    mockGetUserOrganizations.mockResolvedValue([]);
    mockUpdateItem.mockResolvedValue({});
    mockCreateItem.mockResolvedValue({});
    mockSearchItems.mockResolvedValue({
      items: [
        {
          id: 101,
          uexId: 300,
          name: 'New Catalog Item',
          categoryName: 'Category',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
    const mockedLocationCache = locationCache as jest.Mocked<typeof locationCache>;
    const mockLocation: LocationRecord = {
      id: '200',
      gameId: 1,
      locationType: 'city',
      displayName: 'Test Location',
      shortName: 'Test Loc',
      isAvailable: true,
      hierarchyPath: {},
    };
    mockedLocationCache.getAllLocations.mockResolvedValue([mockLocation]);
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

  it('allows creating a new inventory item from the pinned row', async () => {
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

    const itemInput = await screen.findByTestId('new-row-item-input');
    fireEvent.focus(itemInput);
    fireEvent.change(itemInput, { target: { value: 'New' } });

    const itemOption = await screen.findByText('New Catalog Item');
    fireEvent.click(itemOption);

    const locationInput = await screen.findByTestId('new-row-location-input');
    fireEvent.focus(locationInput);
    fireEvent.change(locationInput, { target: { value: 'Test' } });
    const locationOption = await screen.findByText('Test Location');
    fireEvent.click(locationOption);

    const quantityInput = screen.getByTestId('new-row-quantity');
    fireEvent.change(quantityInput, { target: { value: '7' } });

    const saveButton = screen.getByTestId('new-row-save');
    fireEvent.click(saveButton);

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalled());
    expect(mockCreateItem).toHaveBeenCalledWith({
      gameId: 1,
      uexItemId: 300,
      locationId: 200,
      quantity: 7,
    });
  });

  it('creates org inventory when an organization is selected', async () => {
    mockGetUserOrganizations.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        organizationId: 42,
        roleId: 1,
        organization: { id: 42, name: 'Test Org' },
      },
    ]);
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

    const viewSelect = screen.getByLabelText('View');
    fireEvent.mouseDown(viewSelect);
    const orgOption = await screen.findByText('Test Org');
    fireEvent.click(orgOption);

    const viewModeSelect = screen.getByLabelText('View mode');
    fireEvent.mouseDown(viewModeSelect);
    const editorOption = await screen.findByText('Editor Mode');
    fireEvent.click(editorOption);

    const itemInput = await screen.findByTestId('new-row-item-input');
    fireEvent.change(itemInput, { target: { value: 'New' } });
    fireEvent.click(await screen.findByText('New Catalog Item'));

    const locationInput = await screen.findByTestId('new-row-location-input');
    fireEvent.change(locationInput, { target: { value: 'Test' } });
    fireEvent.click(await screen.findByText('Test Location'));

    const quantityInput = screen.getByTestId('new-row-quantity');
    fireEvent.change(quantityInput, { target: { value: '9' } });

    const saveButton = screen.getByTestId('new-row-save');
    fireEvent.click(saveButton);

    await waitFor(() => expect(mockCreateOrgItem).toHaveBeenCalled());
    expect(mockCreateOrgItem).toHaveBeenCalledWith(42, {
      gameId: 1,
      uexItemId: 300,
      locationId: 200,
      quantity: 9,
    });
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('shows org error and blocks save when in org view without selection', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

    const viewSelect = screen.getByLabelText('View');
    fireEvent.mouseDown(viewSelect);
    const personalOption = await screen.findByText('My Inventory');
    fireEvent.click(personalOption);

    const viewModeSelect = screen.getByLabelText('View mode');
    fireEvent.mouseDown(viewModeSelect);
    const editorOption = await screen.findByText('Editor Mode');
    fireEvent.click(editorOption);

    // Switch to org view without choosing an org
    fireEvent.mouseDown(viewSelect);
    const listbox = await screen.findByRole('presentation');
    const options = Array.from(listbox.querySelectorAll('[role="option"]'));
    const maybeOrgOption = options.find((opt) => opt.textContent && opt.textContent !== 'My Inventory');
    if (maybeOrgOption) {
      fireEvent.click(maybeOrgOption);
    }

    const saveButton = await screen.findByTestId('new-row-save');
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(
        screen.getByText('Select an organization to add items in org view.'),
      ).toBeInTheDocument(),
    );
    expect(saveButton).toBeDisabled();
    expect(mockCreateItem).not.toHaveBeenCalled();
    expect(mockCreateOrgItem).not.toHaveBeenCalled();
  });

  it('surfaces validation errors and focuses the first invalid field for new row', async () => {
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

    const saveButton = await screen.findByTestId('new-row-save');
    fireEvent.click(saveButton);

    await waitFor(() => expect(screen.getByText('Select an item')).toBeInTheDocument());
    const itemInput = await screen.findByTestId('new-row-item-input');
    await waitFor(() => expect(document.activeElement).toBe(itemInput));
  });

  it('prevents non-integer quantities and shows error', async () => {
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

    const itemInput = await screen.findByTestId('new-row-item-input');
    fireEvent.change(itemInput, { target: { value: 'New' } });
    fireEvent.click(await screen.findByText('New Catalog Item'));

    const locationInput = await screen.findByTestId('new-row-location-input');
    fireEvent.change(locationInput, { target: { value: 'Test' } });
    fireEvent.click(await screen.findByText('Test Location'));

    const quantityInput = screen.getByTestId('new-row-quantity');
    fireEvent.change(quantityInput, { target: { value: '7.5' } });
    const saveButton = screen.getByTestId('new-row-save');
    fireEvent.click(saveButton);

    expect(mockCreateItem).not.toHaveBeenCalled();
    expect(screen.getByText('Quantity must be an integer greater than 0')).toBeInTheDocument();
  });

  it('keeps the row dirty and shows retry on API failure', async () => {
    mockCreateItem.mockRejectedValueOnce(new Error('fail'));
    mockCreateItem.mockResolvedValueOnce({});
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

    fireEvent.change(await screen.findByTestId('new-row-item-input'), { target: { value: 'New' } });
    fireEvent.click(await screen.findByText('New Catalog Item'));

    const locationInput = await screen.findByTestId('new-row-location-input');
    fireEvent.change(locationInput, { target: { value: 'Test' } });
    fireEvent.click(await screen.findByText('Test Location'));

    const quantityInput = screen.getByTestId('new-row-quantity');
    fireEvent.change(quantityInput, { target: { value: '7' } });

    fireEvent.click(screen.getByTestId('new-row-save'));

    await waitFor(() =>
      expect(screen.getByText('Unable to add item. Please try again.')).toBeInTheDocument(),
    );
    expect((screen.getByTestId('new-row-quantity') as HTMLInputElement).value).toBe('7');
    const retryButton = screen.getByTestId('new-row-retry');
    fireEvent.click(retryButton);
    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(2));
  });

  it('shows inline quantity validation error for non-integer input and focuses the field', async () => {
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
    fireEvent.change(quantityInput, { target: { value: '3.5' } });
    fireEvent.click(screen.getByTestId('inline-save-item-1'));

    await waitFor(() =>
      expect(screen.getByText('Quantity must be an integer greater than 0')).toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(quantityInput));
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it('focuses inline save on API failure', async () => {
    mockUpdateItem.mockRejectedValueOnce(new Error('fail'));
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

    const saveButton = await screen.findByTestId('inline-save-item-1');
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(screen.getByText('Unable to save. Please try again.')).toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(saveButton));
  });
});
