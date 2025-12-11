import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Container,
  Box,
  CircularProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  Button,
  Divider,
  Card,
  CardContent,
  Stack,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  Radio,
  TablePagination,
  Tooltip,
  LinearProgress,
  Alert,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SortIcon from '@mui/icons-material/Sort';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import InventoryIcon from '@mui/icons-material/Inventory';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ShareIcon from '@mui/icons-material/Share';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { inventoryService, InventoryCategory, InventoryItem, OrgInventoryItem } from '../services/inventory.service';
import { uexService, CatalogItem } from '../services/uex.service';
import { locationCache } from '../services/locationCache';
import type { SystemLocationValue } from '../components/location/SystemLocationSelector';
import { useDebounce } from '../hooks/useDebounce';

type InventoryRecord = InventoryItem | OrgInventoryItem;
type ActionMode = 'edit' | 'split' | 'share' | 'delete' | null;

const GAME_ID = 1;

const valueText = (value: number) => `${value.toLocaleString()} qty`;

const LazySystemLocationSelector = lazy(() => import('../components/location/SystemLocationSelector'));

const InventoryPage = () => {
  const navigate = useNavigate();
  const addSearchRef = useRef<HTMLInputElement | null>(null);
  const firstCatalogItemRef = useRef<HTMLDivElement | null>(null);
  const catalogItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const systemSelectRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<{ userId: number; username: string } | null>(null);
  const [orgOptions, setOrgOptions] = useState<{ id: number; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'personal' | 'org'>('personal');
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionAnchor, setActionAnchor] = useState<null | HTMLElement>(null);
  const [actionItem, setActionItem] = useState<InventoryRecord | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [actionWorking, setActionWorking] = useState(false);
  const [shareOrgId, setShareOrgId] = useState<number | ''>('');
  const [actionQuantity, setActionQuantity] = useState<number>(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryId, setCatalogCategoryId] = useState<number | ''>('');
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogRowsPerPage, setCatalogRowsPerPage] = useState(10);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [destinationSelection, setDestinationSelection] = useState<SystemLocationValue>({
    systemId: '',
    locationId: '',
  });
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemNotes, setNewItemNotes] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    categoryId: '' as number | '',
    locationId: '' as number | '',
    sharedOnly: false,
    valueRange: [0, 100000] as [number, number],
  });
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'location' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'location' | 'share'>('none');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [density, setDensity] = useState<'standard' | 'compact'>('standard');
  const itemGridTemplate = useMemo(
    () =>
      density === 'compact'
        ? { xs: '1fr', md: '2fr 1fr 0.8fr 0.8fr auto' }
        : { xs: '1fr', md: '2fr 1fr 1fr 1fr auto' },
    [density],
  );

  const debouncedSearch = useDebounce(filters.search, 350);
  const debouncedCatalogSearch = useDebounce(catalogSearch, 350);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const closeActionMenu = () => {
    setActionAnchor(null);
    setActionItem(null);
    setActionMode(null);
  };

  const handleActionOpen = (event: React.MouseEvent<HTMLElement>, item: InventoryRecord) => {
    setActionAnchor(event.currentTarget);
    setActionItem(item);
  };

  const fetchProfile = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${apiUrl}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        navigate('/login');
        return;
      }

      const data = await response.json();
      setUser({ userId: data.userId, username: data.username });
    } catch (err) {
      console.error('Error fetching profile:', err);
      navigate('/login');
    }
  }, [navigate]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await inventoryService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories', err);
    }
  }, []);

  const fetchOrganizations = useCallback(
    async (userId: number) => {
      try {
        const orgs = await inventoryService.getUserOrganizations(userId);
        const mapped = orgs.map((entry) => ({
          id: entry.organization?.id ?? entry.organizationId,
          name: entry.organization?.name ?? `Org #${entry.organizationId}`,
        }));
        setOrgOptions(mapped);
      } catch (err) {
        console.error('Error loading organizations', err);
      }
    },
    [],
  );

  const fetchCatalog = useCallback(async () => {
    try {
      setCatalogError(null);
      setCatalogLoading(true);
      const params = {
        search: debouncedCatalogSearch || undefined,
        categoryId:
          typeof catalogCategoryId === 'number' ? catalogCategoryId : undefined,
        limit: catalogRowsPerPage,
        offset: catalogPage * catalogRowsPerPage,
      };
      const data = await uexService.searchItems(params);
      setCatalogItems(data.items);
      setCatalogTotal(data.total);
      setSelectedCatalogItem((prev) => {
        if (data.items.length === 0) {
          return null;
        }
        if (!prev || !data.items.some((item) => item.id === prev.id)) {
          return data.items[0];
        }
        return prev;
      });
    } catch (err) {
      console.error('Error searching catalog', err);
      setCatalogError('Unable to load catalog items right now.');
      setCatalogItems([]);
      setCatalogTotal(0);
    } finally {
      setCatalogLoading(false);
    }
  }, [debouncedCatalogSearch, catalogCategoryId, catalogRowsPerPage, catalogPage]);

  const fetchInventory = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setError(null);
      if (initialLoading) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      const categoryId =
        typeof filters.categoryId === 'number' ? filters.categoryId : undefined;
      const locationId =
        typeof filters.locationId === 'number' ? filters.locationId : undefined;
      const [minQuantity, maxQuantity] = filters.valueRange;
      const apiSort =
        sortBy === 'date'
          ? 'date_modified'
          : sortBy === 'location'
          ? 'location'
          : sortBy;
      const limit = rowsPerPage;
      const offset = page * rowsPerPage;

      if (viewMode === 'org' && selectedOrgId) {
        const data = await inventoryService.getOrgInventory(selectedOrgId, {
          gameId: GAME_ID,
          search: debouncedSearch || undefined,
          categoryId,
          locationId,
          minQuantity,
          maxQuantity,
          sort: apiSort,
          order: sortDir,
          limit,
          offset,
        });
        setItems(data.items);
        setTotalCount(data.total);
        if (page > 0) {
          const lastPage = Math.max(0, Math.floor((data.total - 1) / rowsPerPage));
          if (page > lastPage) {
            setPage(lastPage);
          }
        }
      } else {
        const params = {
          gameId: GAME_ID,
          limit,
          offset,
          search: debouncedSearch || undefined,
          categoryId,
          locationId,
          minQuantity,
          maxQuantity,
          sharedOnly: filters.sharedOnly || undefined,
          sort: apiSort,
          order: sortDir,
        } as const;
        const data = await inventoryService.getInventory(params);
        setItems(data.items);
        setTotalCount(data.total);
        if (page > 0) {
          const lastPage = Math.max(0, Math.floor((data.total - 1) / rowsPerPage));
          if (page > lastPage) {
            setPage(lastPage);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching inventory', err);
      setError('Unable to load inventory right now.');
      setItems([]);
      setTotalCount(0);
    } finally {
      if (initialLoading) {
        setInitialLoading(false);
      }
      setRefreshing(false);
    }
  }, [
    user,
    viewMode,
    selectedOrgId,
    filters.categoryId,
    filters.locationId,
    filters.sharedOnly,
    filters.valueRange,
    debouncedSearch,
    sortBy,
    sortDir,
    page,
    rowsPerPage,
    initialLoading,
  ]);

  const openAddDialog = () => {
    setAddDialogOpen(true);
    setSelectedCatalogItem(null);
    setCatalogSearch('');
    setCatalogCategoryId('');
    setCatalogPage(0);
    setDestinationSelection({ systemId: '', locationId: '' });
    setNewItemQuantity(1);
    setNewItemNotes('');
    setCatalogError(null);
    setAddSubmitting(false);
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
  };

  const handleCreateInventoryItem = async (options?: { stayOpen?: boolean }) => {
    if (!selectedCatalogItem) {
      setCatalogError('Select an item to add.');
      return;
    }
    if (destinationSelection.locationId === '') {
      setCatalogError('Select a location.');
      return;
    }
    if (newItemQuantity <= 0) {
      setCatalogError('Quantity must be greater than 0.');
      return;
    }

    try {
      setAddSubmitting(true);
      setCatalogError(null);
      const numericLocationId = Number(destinationSelection.locationId);
      const existing = items.find(
        (item) =>
          item.uexItemId === selectedCatalogItem.uexId &&
          item.locationId === numericLocationId,
      );

      if (existing) {
        const shouldMerge = window.confirm(
          'An item with this location already exists. Merge quantities?',
        );
        if (shouldMerge) {
          const newQuantity =
            (Number(existing.quantity) || 0) + Number(newItemQuantity);
          await inventoryService.updateItem(existing.id, {
            quantity: newQuantity,
            locationId: numericLocationId,
          });
        } else {
          await inventoryService.createItem({
            gameId: GAME_ID,
            uexItemId: selectedCatalogItem.uexId,
            locationId: numericLocationId,
            quantity: newItemQuantity,
            notes: newItemNotes || undefined,
          });
        }
      } else {
        await inventoryService.createItem({
          gameId: GAME_ID,
          uexItemId: selectedCatalogItem.uexId,
          locationId: numericLocationId,
          quantity: newItemQuantity,
          notes: newItemNotes || undefined,
        });
      }

      await fetchInventory();
      if (options?.stayOpen) {
        setNewItemQuantity(1);
        setNewItemNotes('');
        setCatalogError(null);
      } else {
        closeAddDialog();
      }
    } catch (err) {
      console.error('Error adding inventory item', err);
      setCatalogError('Unable to add item right now.');
    } finally {
      setAddSubmitting(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, [fetchProfile, fetchCategories]);

  useEffect(() => {
    locationCache.prefetch(GAME_ID).catch((err) => {
      console.error('Error preloading systems/locations', err);
    });
  }, []);

  useEffect(() => {
    if (user?.userId) {
      fetchOrganizations(user.userId);
    }
  }, [user, fetchOrganizations]);

  useEffect(() => {
    if (user) {
      fetchInventory();
    }
  }, [user, fetchInventory]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filters.categoryId, filters.locationId, filters.sharedOnly, filters.valueRange, viewMode, selectedOrgId]);

  useEffect(() => {
    setCatalogPage(0);
  }, [debouncedCatalogSearch, catalogCategoryId]);

  useEffect(() => {
    if (addDialogOpen) {
      fetchCatalog();
    }
  }, [addDialogOpen, fetchCatalog]);

  useEffect(() => {
    if (!addDialogOpen) return;
    const handle = window.requestAnimationFrame(() => {
      if (addSearchRef.current) {
        addSearchRef.current.focus();
        addSearchRef.current.select();
      }
    });
    return () => window.cancelAnimationFrame(handle);
  }, [addDialogOpen]);

  useEffect(() => {
    if (actionMode && actionItem) {
      setActionQuantity(Number(actionItem.quantity) || 0);
    }
  }, [actionMode, actionItem]);

  const locationOptions = useMemo(() => {
    const map = new Map<number, string>();
    items.forEach((item) => {
      if (item.locationId) {
        const label = item.locationName || `Location #${item.locationId}`;
        map.set(item.locationId, label);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const maxQuantity = useMemo(
    () =>
      items.reduce((max, item) => {
        const qty = Number(item.quantity) || 0;
        return qty > max ? qty : max;
      }, 0),
    [items],
  );

  const currentMaxValue = filters.valueRange[1];

  useEffect(() => {
    if (maxQuantity > currentMaxValue) {
      setFilters((prev) => ({
        ...prev,
        valueRange: [0, Math.ceil(maxQuantity)],
      }));
    }
  }, [maxQuantity, currentMaxValue]);

  const filteredItems = useMemo(() => items, [items]);

  const groupedItems = useMemo(() => {
    if (groupBy === 'none') {
      return new Map<string, InventoryRecord[]>([['All items', filteredItems]]);
    }

    const groups = new Map<string, InventoryRecord[]>();
    filteredItems.forEach((item) => {
      let key = 'Other';
      if (groupBy === 'category') {
        key = item.categoryName || 'Uncategorized';
      } else if (groupBy === 'location') {
        key = item.locationName || 'Unknown location';
      } else if (groupBy === 'share') {
        key = item.sharedOrgId ? 'Shared' : 'Private';
      }

      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    });

    return groups;
  }, [groupBy, filteredItems]);

  const openActionDialog = (mode: ActionMode) => {
    setActionMode(mode);
    setActionAnchor(null);
    if (mode === 'share') {
      setShareOrgId('');
    }
  };

  const handleUpdateItem = async (payload: {
    quantity?: number;
    locationId?: number;
    notes?: string;
  }) => {
    if (!actionItem) return;
    try {
      setActionWorking(true);
      setError(null);
      const sanitizedPayload = { ...payload };
      if (
        sanitizedPayload.locationId !== undefined &&
        Number.isNaN(sanitizedPayload.locationId)
      ) {
        delete sanitizedPayload.locationId;
      }
      if (viewMode === 'org' && selectedOrgId) {
        await inventoryService.updateOrgItem(
          selectedOrgId,
          actionItem.id,
          sanitizedPayload,
        );
      } else {
        await inventoryService.updateItem(actionItem.id, sanitizedPayload);
      }
      closeActionMenu();
      await fetchInventory();
    } finally {
      setActionWorking(false);
    }
  };

  const handleSplit = async (quantity: number, locationId?: number) => {
    if (!actionItem || quantity <= 0) return;
    try {
      setActionWorking(true);
      setError(null);
      const remaining = Number(actionItem.quantity) - quantity;
      if (remaining < 0) {
        setError('Split quantity exceeds available amount.');
        throw new Error('Split quantity exceeds available amount');
      }
      const destination = locationId ?? actionItem.locationId;
      if (!destination) {
        setError('Choose a destination location for the split.');
        setActionWorking(false);
        return;
      }

      if (viewMode === 'org' && selectedOrgId) {
        await inventoryService.updateOrgItem(selectedOrgId, actionItem.id, {
          quantity: remaining,
        });
        await inventoryService.createOrgItem(selectedOrgId, {
          gameId: GAME_ID,
          uexItemId: actionItem.uexItemId,
          locationId: destination,
          quantity,
          notes: actionItem.notes,
        });
      } else {
        await inventoryService.updateItem(actionItem.id, { quantity: remaining });
        await inventoryService.createItem({
          gameId: GAME_ID,
          uexItemId: actionItem.uexItemId,
          locationId: destination,
          quantity,
          notes: actionItem.notes,
          sharedOrgId: actionItem.sharedOrgId,
        });
      }
      closeActionMenu();
      await fetchInventory();
    } finally {
      setActionWorking(false);
    }
  };

  const handleShare = async (orgId: number, quantity: number) => {
    if (!actionItem) return;
    try {
      setActionWorking(true);
      setError(null);
      const available = Number(actionItem.quantity) || 0;
      if (quantity <= 0 || quantity > available) {
        setError('Share quantity must be between 0 and the available amount.');
        setActionWorking(false);
        return;
      }
      await inventoryService.shareItem(actionItem.id, orgId, quantity);
      setShareOrgId('');
      closeActionMenu();
      await fetchInventory();
    } finally {
      setActionWorking(false);
    }
  };

  const handleUnshare = async () => {
    if (!actionItem) return;
    try {
      setActionWorking(true);
      await inventoryService.unshareItem(actionItem.id);
      closeActionMenu();
      await fetchInventory();
    } finally {
      setActionWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!actionItem) return;
    try {
      setActionWorking(true);
      setError(null);
      if (viewMode === 'org' && selectedOrgId) {
        await inventoryService.deleteOrgItem(selectedOrgId, actionItem.id);
      } else {
        await inventoryService.deleteItem(actionItem.id);
      }
      closeActionMenu();
      await fetchInventory();
    } finally {
      setActionWorking(false);
    }
  };

  const renderActionDialog = () => {
    if (!actionMode || !actionItem) return null;

    const quantityValue = Number(actionItem.quantity) || 0;

    return (
      <Box
        sx={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          width: 360,
          bgcolor: '#1f2933',
          borderRadius: 2,
          boxShadow: 6,
          p: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          zIndex: 10,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actionMode === 'edit' && <EditIcon fontSize="small" />}
            {actionMode === 'split' && <CallSplitIcon fontSize="small" />}
            {actionMode === 'share' && <ShareIcon fontSize="small" />}
            {actionMode === 'delete' && <DeleteForeverIcon fontSize="small" />}
            {actionMode === 'edit'
              ? 'Edit item'
              : actionMode === 'split'
              ? 'Split item'
              : actionMode === 'share'
              ? 'Share item'
              : 'Delete item'}
          </Typography>
          {actionMode === 'edit' && (
            <>
              <TextField
                label="Quantity"
                type="number"
                value={actionQuantity}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                onChange={(e) => setActionQuantity(Number(e.target.value))}
              />
              <FormControl fullWidth>
                <InputLabel id="edit-location-label">Location</InputLabel>
                <Select
                  labelId="edit-location-label"
                  label="Location"
                  value={actionItem.locationId ?? ''}
                  onChange={(e) =>
                    setActionItem((prev) =>
                      prev
                        ? { ...prev, locationId: Number(e.target.value) }
                        : prev,
                    )
                  }
                >
                  {locationOptions.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Notes"
                fullWidth
                multiline
                minRows={2}
                value={actionItem.notes || ''}
                onChange={(e) =>
                  setActionItem((prev) =>
                    prev ? { ...prev, notes: e.target.value } : prev,
                  )
                }
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="text" onClick={closeActionMenu}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={() =>
                    handleUpdateItem({
                      quantity: actionQuantity,
                      locationId: Number(actionItem.locationId),
                      notes: actionItem.notes,
                    })
                  }
                  disabled={actionWorking}
                >
                  Save changes
                </Button>
              </Stack>
            </>
          )}
          {actionMode === 'split' && (
            <>
              <Typography variant="body2" color="text.secondary">
                Current quantity: {quantityValue.toLocaleString()}
              </Typography>
              <TextField
                label="Quantity to split"
                type="number"
                fullWidth
                inputProps={{ min: 0.01, max: quantityValue, step: 0.01 }}
                value={actionQuantity}
                onChange={(e) => setActionQuantity(Number(e.target.value))}
              />
              <FormControl fullWidth>
                <InputLabel id="split-location-label">Destination</InputLabel>
                <Select
                  labelId="split-location-label"
                  label="Destination"
                  value={actionItem.locationId ?? ''}
                  onChange={(e) =>
                    setActionItem((prev) =>
                      prev
                        ? { ...prev, locationId: Number(e.target.value) }
                        : prev,
                    )
                  }
                >
                  {locationOptions.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="text" onClick={closeActionMenu}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={actionWorking}
                  onClick={() =>
                    handleSplit(actionQuantity, Number(actionItem.locationId))
                  }
                >
                  Split
                </Button>
              </Stack>
            </>
          )}
          {actionMode === 'share' && (
            <>
              <Typography variant="body2" color="text.secondary">
                Share a quantity with an organization
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="share-org-label">Organization</InputLabel>
                <Select
                  labelId="share-org-label"
                  label="Organization"
                  value={shareOrgId}
                  onChange={(e) =>
                    setShareOrgId(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                >
                  {orgOptions.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Quantity to share"
                type="number"
                fullWidth
                inputProps={{ min: 0.01, max: quantityValue, step: 0.01 }}
                value={actionQuantity}
                onChange={(e) => setActionQuantity(Number(e.target.value))}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="text" onClick={closeActionMenu}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={actionWorking || shareOrgId === ''}
                  onClick={() =>
                    typeof shareOrgId === 'number' &&
                    handleShare(shareOrgId, actionQuantity)
                  }
                >
                  Share
                </Button>
              </Stack>
            </>
          )}
          {actionMode === 'delete' && (
            <>
              <Typography variant="body2">
                Delete <strong>{actionItem.itemName || `Item ${actionItem.uexItemId}`}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This removes the record from the inventory. You can recreate it later.
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="text" onClick={closeActionMenu}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  disabled={actionWorking}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Box>
    );
  };

  const addReady = Boolean(
    selectedCatalogItem &&
    destinationSelection.locationId !== '' &&
    newItemQuantity > 0,
  );

  const handleAddKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && addReady) {
      event.preventDefault();
      handleCreateInventoryItem({ stayOpen: true });
    }
  };

  const handleCatalogSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab' && !event.shiftKey) {
      if (firstCatalogItemRef.current) {
        event.preventDefault();
        event.stopPropagation();
        firstCatalogItemRef.current.focus();
      }
    }
  };

  const handleCatalogListKeyDown = (event: React.KeyboardEvent) => {
    if (!catalogItems.length) return;

    const foundIndex = selectedCatalogItem
      ? catalogItems.findIndex((item) => item.id === selectedCatalogItem.id)
      : 0;
    const safeIndex = foundIndex >= 0 ? foundIndex : 0;
    const focusItem = (index: number) => {
      const target = catalogItems[index];
      if (!target) return;
      setSelectedCatalogItem(target);
      const ref = catalogItemRefs.current[index];
      if (ref) {
        ref.focus();
      }
    };

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(catalogItems.length - 1, safeIndex + 1);
      focusItem(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = Math.max(0, safeIndex - 1);
      focusItem(prev);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (selectedCatalogItem) {
        handleCreateInventoryItem({ stayOpen: true });
      }
    } else if (event.key === 'Tab' && !event.shiftKey) {
      if (systemSelectRef.current) {
        event.preventDefault();
        systemSelectRef.current.focus();
      }
    }
  };

  if (!user || initialLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#0b1118',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#0b1118' }}>
      <AppBar position="sticky" color="transparent" sx={{ backdropFilter: 'blur(6px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/dashboard')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              ml: 1,
              background: 'linear-gradient(135deg, #4A9EFF 0%, #7ABDFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            Inventory Command
          </Typography>
          <Chip
            icon={<InventoryIcon />}
            label={viewMode === 'org' ? 'Org Inventory' : 'Personal'}
            sx={{ mr: 2 }}
            color="primary"
            variant="outlined"
          />
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
          <Avatar sx={{ width: 32, height: 32, ml: 1, bgcolor: '#4A9EFF' }}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card
              sx={{
                background: 'linear-gradient(120deg, #0f1724 0%, #0f1b2c 50%, #0c1220 100%)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4} lg={3}>
                    <TextField
                      fullWidth
                      label="Search by name, note, or location"
                      placeholder="Prospector, Lorville, armors..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <FormControl fullWidth>
                      <InputLabel id="category-filter-label">Category</InputLabel>
                      <Select
                        labelId="category-filter-label"
                        label="Category"
                        value={filters.categoryId}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            categoryId:
                              e.target.value === '' ? '' : Number(e.target.value),
                          }))
                        }
                      >
                        <MenuItem value="">
                          <em>All</em>
                        </MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <FormControl fullWidth>
                      <InputLabel id="location-filter-label">Location</InputLabel>
                      <Select
                        labelId="location-filter-label"
                        label="Location"
                        value={filters.locationId}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            locationId:
                              e.target.value === '' ? '' : Number(e.target.value),
                          }))
                        }
                      >
                        <MenuItem value="">
                          <em>All</em>
                        </MenuItem>
                        {locationOptions.map((loc) => (
                          <MenuItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4} lg={3}>
                    <Box sx={{ px: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Value (quantity) range
                      </Typography>
                      <Slider
                        value={filters.valueRange}
                        min={0}
                        max={Math.max(filters.valueRange[1], maxQuantity || 1000)}
                        onChange={(_, value) =>
                          setFilters((prev) => ({
                            ...prev,
                            valueRange: value as [number, number],
                          }))
                        }
                        valueLabelDisplay="auto"
                        getAriaValueText={valueText}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={2} lg={2}>
                    <FormControl fullWidth>
                      <InputLabel id="org-selector-label">View</InputLabel>
                      <Select
                        labelId="org-selector-label"
                        label="View"
                        value={viewMode === 'personal' ? 'personal' : selectedOrgId ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'personal') {
                            setViewMode('personal');
                            setSelectedOrgId(null);
                          } else {
                            setViewMode('org');
                            setSelectedOrgId(Number(value));
                          }
                        }}
                      >
                        <MenuItem value="personal">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                            <ListItemText primary="My Inventory" />
                          </Stack>
                        </MenuItem>
                        {orgOptions.map((org) => (
                          <MenuItem key={org.id} value={org.id}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <ApartmentIcon fontSize="small" />
                              <ListItemText primary={org.name} />
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={filters.sharedOnly}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              sharedOnly: e.target.checked,
                            }))
                          }
                          size="small"
                          disabled={viewMode === 'org'}
                        />
                      }
                      label="Shared only"
                    />
                  </Grid>
                  <Grid item>
                    <Button
                      startIcon={<SortIcon />}
                      variant="outlined"
                      color="inherit"
                      onClick={() =>
                        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
                      }
                    >
                      Sort: {sortBy} ({sortDir})
                    </Button>
                  </Grid>
                  <Grid item>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id="sort-by-label">Sort By</InputLabel>
                      <Select
                        labelId="sort-by-label"
                        label="Sort By"
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(e.target.value as 'name' | 'quantity' | 'location' | 'date')
                        }
                      >
                        <MenuItem value="date">Last updated</MenuItem>
                        <MenuItem value="name">Name</MenuItem>
                        <MenuItem value="quantity">Quantity</MenuItem>
                        <MenuItem value="location">Location</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel id="group-by-label">Group By</InputLabel>
                      <Select
                        labelId="group-by-label"
                        label="Group By"
                        value={groupBy}
                        onChange={(e) =>
                          setGroupBy(e.target.value as 'none' | 'category' | 'location' | 'share')
                        }
                        startAdornment={<GroupWorkIcon sx={{ mr: 1 }} />}
                      >
                        <MenuItem value="none">No grouping</MenuItem>
                        <MenuItem value="category">Category</MenuItem>
                        <MenuItem value="location">Location</MenuItem>
                        <MenuItem value="share">Share status</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item>
                    <Button
                      variant="outlined"
                      color="inherit"
                      startIcon={<FilterAltIcon />}
                      onClick={() =>
                        setFilters({
                          search: '',
                          categoryId: '',
                          locationId: '',
                          sharedOnly: false,
                          valueRange: [0, maxQuantity || 100000],
                        })
                      }
                    >
                      Clear filters
                    </Button>
                  </Grid>
                  <Grid item>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id="density-select-label">View mode</InputLabel>
                      <Select
                        labelId="density-select-label"
                        label="View mode"
                        value={density}
                        onChange={(e) =>
                          setDensity(e.target.value as 'standard' | 'compact')
                        }
                      >
                        <MenuItem value="standard">Standard</MenuItem>
                        <MenuItem value="compact">Compact</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  {viewMode === 'personal' && (
                    <Grid item>
                      <Button variant="contained" onClick={openAddDialog}>
                        Add item
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ backgroundColor: '#0e1520', border: '1px solid rgba(255,255,255,0.05)' }}>
              <CardContent>
                {refreshing && (
                  <LinearProgress sx={{ mb: 2 }} color="primary" />
                )}
                {error && (
                  <Box
                    sx={{
                      backgroundColor: 'rgba(255,99,71,0.08)',
                      border: '1px solid rgba(255,99,71,0.2)',
                      borderRadius: 2,
                      p: 2,
                      mb: 2,
                    }}
                  >
                    <Typography color="error">{error}</Typography>
                  </Box>
                )}
                {filteredItems.length === 0 && !refreshing ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <InventoryIcon sx={{ fontSize: 42, color: '#4A9EFF' }} />
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      No inventory matches your filters
                    </Typography>
                    <Typography color="text.secondary">
                      Adjust filters or sync new items to get started.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{ mb: 2, color: '#9aa0a6' }}
                    >
                      <ViewAgendaIcon fontSize="small" />
                      <Typography variant="body2">
                        Showing {items.length.toLocaleString()} of{' '}
                        {totalCount.toLocaleString()} items
                      </Typography>
                    </Stack>
                    {density === 'compact' && (
                      <Box
                        sx={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 2,
                          backgroundColor: '#0e1520',
                          px: 1.5,
                          py: 0.75,
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: itemGridTemplate,
                            alignItems: 'center',
                            color: 'text.secondary',
                            fontSize: 12,
                            letterSpacing: 0.2,
                            textTransform: 'uppercase',
                          }}
                        >
                          <Typography variant="caption">Item</Typography>
                          <Typography variant="caption">Location</Typography>
                          <Typography variant="caption">Quantity</Typography>
                          <Typography variant="caption">Updated</Typography>
                          <Typography variant="caption" textAlign="right">
                            Actions
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    <Stack spacing={2}>
                      {Array.from(groupedItems.entries()).map(([group, groupItems]) => (
                        <Box
                          key={group}
                          sx={{
                            border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              px: density === 'compact' ? 1.5 : 2,
                              py: density === 'compact' ? 1 : 1.5,
                              backgroundColor: 'rgba(255,255,255,0.02)',
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                size="small"
                                label={group}
                                color="primary"
                                variant="outlined"
                              />
                              <Typography variant="body2" color="text.secondary">
                                {groupItems.length} item{groupItems.length === 1 ? '' : 's'}
                              </Typography>
                            </Stack>
                          </Box>
                          <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />
                            <Stack
                              divider={
                                <Divider flexItem sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />
                              }
                            >
                              {groupItems.map((item) => (
                                <Box
                                  key={item.id}
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: itemGridTemplate,
                                  gap: density === 'compact' ? 0.75 : 2,
                                  alignItems: density === 'compact' ? 'center' : 'center',
                                  px: density === 'compact' ? 1.25 : 2,
                                  py: density === 'compact' ? 0.6 : 1.5,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                  },
                                }}
                              >
                                <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
                                  <Stack
                                    direction="row"
                                    spacing={density === 'compact' ? 0.5 : 1}
                                    alignItems="center"
                                    flexWrap="wrap"
                                    columnGap={density === 'compact' ? 0.75 : 1}
                                    rowGap={density === 'compact' ? 0.25 : 0.5}
                                  >
                                    <Typography
                                      variant={density === 'compact' ? 'body2' : 'subtitle1'}
                                      sx={{ fontWeight: 600 }}
                                      noWrap
                                      title={item.itemName || `Item #${item.uexItemId}`}
                                    >
                                      {item.itemName || `Item #${item.uexItemId}`}
                                    </Typography>
                                    <Chip
                                      label={item.categoryName || 'General'}
                                      size={density === 'compact' ? 'small' : 'medium'}
                                      variant="outlined"
                                    />
                                    {item.sharedOrgId && (
                                      <Chip
                                        size={density === 'compact' ? 'small' : 'medium'}
                                        color="primary"
                                        variant="outlined"
                                        label={item.sharedOrgName || 'Shared'}
                                      />
                                    )}
                                  </Stack>
                                </Stack>
                                <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
                                  {density !== 'compact' && (
                                    <Typography variant="body2" color="text.secondary">
                                      Location
                                    </Typography>
                                  )}
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {item.locationName || 'Unknown'}
                                  </Typography>
                                </Stack>
                                <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
                                  {density !== 'compact' && (
                                    <Typography variant="body2" color="text.secondary">
                                      Quantity
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 700, letterSpacing: 0.1 }}
                                  >
                                    {Number(item.quantity).toLocaleString()}
                                  </Typography>
                                </Stack>
                                <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
                                  {density !== 'compact' && (
                                    <Typography variant="body2" color="text.secondary">
                                      Updated
                                    </Typography>
                                  )}
                                  <Typography variant="body2">
                                    {new Date(item.dateModified || item.dateAdded || '').toLocaleDateString()}
                                  </Typography>
                                </Stack>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  <Tooltip title="Actions">
                                    <IconButton onClick={(e) => handleActionOpen(e, item)}>
                                      <MoreVertIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                    <TablePagination
                      component="div"
                      count={totalCount}
                      page={page}
                      onPageChange={(_, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      sx={{ mt: 2 }}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Dialog
        open={addDialogOpen}
        onClose={closeAddDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Quick add inventory item</DialogTitle>
        <DialogContent dividers onKeyDown={handleAddKeyDown}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {catalogError && <Alert severity="error">{catalogError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      label="Search catalog"
                      value={catalogSearch}
                      inputRef={addSearchRef}
                      autoFocus
                      onChange={(e) => {
                        setCatalogSearch(e.target.value);
                        setCatalogPage(0);
                      }}
                      onKeyDown={handleCatalogSearchKeyDown}
                    />
                    <FormControl fullWidth>
                      <InputLabel id="catalog-category-label">Category</InputLabel>
                      <Select
                        labelId="catalog-category-label"
                        label="Category"
                        value={catalogCategoryId}
                        onChange={(e) =>
                          setCatalogCategoryId(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                      >
                        <MenuItem value="">
                          <em>All</em>
                        </MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Suspense fallback={<LinearProgress sx={{ height: 4, borderRadius: 2 }} />}>
                      <LazySystemLocationSelector
                        value={destinationSelection}
                        onChange={setDestinationSelection}
                        gameId={GAME_ID}
                        systemSelectRef={systemSelectRef}
                      />
                    </Suspense>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          fullWidth
                          label="Quantity"
                          type="number"
                          inputProps={{ min: 0.01, step: 0.01 }}
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setNewItemQuantity((qty) => Number(Math.max(0.01, qty - 1).toFixed(2)))
                            }
                          >
                            -1
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setNewItemQuantity((qty) => Number(Math.max(0.01, qty + 1).toFixed(2)))
                            }
                          >
                            +1
                          </Button>
                        </Stack>
                      </Stack>
                      <TextField
                        fullWidth
                        label="Notes"
                        value={newItemNotes}
                        onChange={(e) => setNewItemNotes(e.target.value)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Tip: Ctrl/Cmd + Enter to add and keep this dialog open for rapid entry.
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Grid>
              <Grid item xs={12} md={7}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    minHeight: 360,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Catalog results
                    </Typography>
                    {catalogLoading ? (
                      <LinearProgress sx={{ flex: 1, height: 4, borderRadius: 1 }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {catalogTotal.toLocaleString()} items
                      </Typography>
                    )}
                  </Stack>
                  {catalogLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : catalogItems.length === 0 ? (
                    <Typography color="text.secondary">
                      No catalog items found with these filters.
                    </Typography>
                  ) : (
                    <List
                      dense
                      disablePadding
                      sx={{
                        maxHeight: 320,
                        overflow: 'auto',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 1,
                      }}
                      onKeyDown={handleCatalogListKeyDown}
                    >
                      {catalogItems.map((item, index) => (
                        <ListItemButton
                          key={item.id}
                          selected={selectedCatalogItem?.id === item.id}
                          onClick={() => {
                            setSelectedCatalogItem(item);
                            setCatalogError(null);
                          }}
                          ref={(el) => {
                            catalogItemRefs.current[index] = el;
                            if (index === 0) {
                              firstCatalogItemRef.current = el;
                            }
                          }}
                        >
                          <ListItemIcon>
                            <Radio checked={selectedCatalogItem?.id === item.id} />
                          </ListItemIcon>
                          <ListItemText
                            primary={item.name}
                            secondary={item.categoryName || 'Uncategorized'}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                  <TablePagination
                    component="div"
                    count={catalogTotal}
                    page={catalogPage}
                    onPageChange={(_, newPage) => setCatalogPage(newPage)}
                    rowsPerPage={catalogRowsPerPage}
                    onRowsPerPageChange={(event) => {
                      setCatalogRowsPerPage(parseInt(event.target.value, 10));
                      setCatalogPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                  />
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddDialog} disabled={addSubmitting}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleCreateInventoryItem({ stayOpen: true })}
            disabled={addSubmitting || !addReady}
          >
            Add & stay
          </Button>
          <Button
            variant="contained"
            onClick={() => handleCreateInventoryItem()}
            disabled={addSubmitting || !addReady}
          >
            Add & close
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={closeActionMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={() => openActionDialog('edit')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openActionDialog('split')}>
          <ListItemIcon>
            <CallSplitIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Split</ListItemText>
        </MenuItem>
        {viewMode === 'personal' && (
          <MenuItem onClick={() => openActionDialog('share')}>
            <ListItemIcon>
              <ShareIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share</ListItemText>
          </MenuItem>
        )}
        {viewMode === 'personal' && actionItem?.sharedOrgId && (
          <MenuItem onClick={handleUnshare}>
            <ListItemIcon>
              <UnpublishedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Unshare</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => openActionDialog('delete')}>
          <ListItemIcon>
            <DeleteForeverIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {renderActionDialog()}
    </Box>
  );
};

export default InventoryPage;
