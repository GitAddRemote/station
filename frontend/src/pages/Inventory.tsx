import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import {
  Box,
  CircularProgress,
  TextField,
  MenuItem,
  Button,
  Stack,
  Typography,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  LinearProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip as MuiTooltip,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import CallSplitIcon from '@mui/icons-material/CallSplit';

import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SortIcon from '@mui/icons-material/Sort';
import GridViewIcon from '@mui/icons-material/GridView';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InventoryTwoToneIcon from '@mui/icons-material/InventoryTwoTone';
import ViewListIcon from '@mui/icons-material/ViewList';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PackageIcon from '@mui/icons-material/Inventory2';
import LayersIcon from '@mui/icons-material/Layers';
import './Inventory.css';
import {
  inventoryService,
  InventoryCategory,
  InventoryItem,
  OrgInventoryItem,
} from '../services/inventory.service';
import { catalogService, CatalogEntryDto, LocationDto } from '../services/catalog.service';
import LocationPicker from '../components/inventory/LocationPicker';
import InventoryCard from '../components/inventory/InventoryCard';
import InventoryItemDrawer from '../components/inventory/InventoryItemDrawer';
import { useDebounce } from '../hooks/useDebounce';
import { useFocusController } from '../hooks/useFocusController';
import InventoryInlineRow from '../components/inventory/InventoryInlineRow';
import InventoryNewRow from '../components/inventory/InventoryNewRow';
import {
  OrgPermission,
  permissionsService,
} from '../services/permissions.service';
import { api } from '../services/api.service';

type InventoryRecord = InventoryItem | OrgInventoryItem;
type ActionMode = 'edit' | 'split' | 'delete' | null;

interface GroupedRow {
  catalogEntryId: string;
  itemName: string;
  catalogKind: 'item' | 'commodity' | 'vehicle';
  categoryName: string;
  totalQuantity: number;
  maxQuality: number | null;
  maxQualityCount: number;
  subRows: InventoryRecord[];
  representative: InventoryRecord;
}
type InlineDraft = { quantity: number | ''; quality: number | ''; locationId?: string | null; locationName?: string | null };

const EDITOR_MODE_QUANTITY_MAX = 999999.999999;
const MIN_INVENTORY_QUANTITY = 0.000001;
const SLIDER_QUANTITY_MAX = 10000;
const VIEW_MODE_STORAGE_KEY = 'inventory:viewMode';
const ORG_ID_STORAGE_KEY = 'inventory:selectedOrgId';
const DENSITY_STORAGE_KEY = 'inventory:density';
const LAYOUT_MODE_STORAGE_KEY = 'inventory:layoutMode';

const readStoredViewMode = (): 'personal' | 'org' => {
  if (typeof window === 'undefined') return 'personal';
  const stored = window.sessionStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === 'org' ? 'org' : 'personal';
};

const readStoredOrgId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(ORG_ID_STORAGE_KEY) || null;
};

const readStoredLayoutMode = (): 'table' | 'card' => {
  if (typeof window === 'undefined') return 'table';
  const stored = window.sessionStorage.getItem(LAYOUT_MODE_STORAGE_KEY);
  return stored === 'card' ? 'card' : 'table';
};

const readStoredDensity = (): 'standard' | 'compact' => {
  if (typeof window === 'undefined') return 'standard';
  const stored = window.sessionStorage.getItem(DENSITY_STORAGE_KEY);
  return stored === 'compact' ? 'compact' : 'standard';
};

const InventoryPage = () => {
  const navigate = useNavigate();
  const addSearchRef = useRef<HTMLInputElement | null>(null);
  const addQuantityRef = useRef<HTMLInputElement | null>(null);
  const addLocationRef = useRef<HTMLInputElement | null>(null);
  const addQualityRef = useRef<HTMLInputElement | null>(null);
  const addNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const firstCatalogItemRef = useRef<HTMLDivElement | null>(null);
  const catalogItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [user, setUser] = useState<{ userId: string; username: string } | null>(
    null,
  );
  const [orgOptions, setOrgOptions] = useState<{ id: string; name: string }[]>(
    [],
  );
  const orgsLoaded = useRef(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() =>
    readStoredOrgId(),
  );
  const [viewMode, setViewMode] = useState<'personal' | 'org'>(() =>
    readStoredViewMode(),
  );
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
  const [editLocation, setEditLocation] = useState<LocationDto | null>(null);
  const [editQuality, setEditQuality] = useState<number | ''>('');
  const [editUomId, setEditUomId] = useState<string>('');
  const [actionQuantity, setActionQuantity] = useState<number>(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryId, setCatalogCategoryId] = useState<string | ''>('');
  const [catalogItems, setCatalogItems] = useState<CatalogEntryDto[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogRowsPerPage, setCatalogRowsPerPage] = useState(25);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedCatalogItem, setSelectedCatalogItem] =
    useState<CatalogEntryDto | null>(null);
  const [allUoms, setAllUoms] = useState<import('../services/inventory.service').UnitOfMeasure[]>([]);
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemUomId, setNewItemUomId] = useState<string>('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemLocation, setNewItemLocation] = useState<LocationDto | null>(null);
  const [newItemQuality, setNewItemQuality] = useState<number | ''>('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [orgPermissions, setOrgPermissions] = useState<OrgPermission[]>([]);
  const [orgPermissionsLoading, setOrgPermissionsLoading] = useState(false);
  const [orgPermissionsError, setOrgPermissionsError] = useState<string | null>(
    null,
  );
  const permissionsFetchedForOrgId = useRef<string | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    categoryId: '' as string | '',
    valueRange: [0, SLIDER_QUANTITY_MAX] as [number, number],
    qualityRange: [0, 1000] as [number, number],
  });
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<'none' | 'category'>(
    'none',
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [density, setDensity] = useState<'standard' | 'compact'>(() =>
    readStoredDensity(),
  );
  const [layoutMode, setLayoutMode] = useState<'table' | 'card'>(() =>
    readStoredLayoutMode(),
  );
  const [selectedDrawerGroup, setSelectedDrawerGroup] = useState<GroupedRow | null>(null);
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, InlineDraft>>(
    {},
  );
  const [inlineSaving, setInlineSaving] = useState<Set<string>>(new Set());
  const [inlineSaved, setInlineSaved] = useState<Set<string>>(new Set());
  const [inlineError, setInlineError] = useState<Record<string, string | null>>(
    {},
  );
  const [inlineActiveField, setInlineActiveField] = useState<{
    rowKey: string;
    field: 'quantity' | 'quality' | 'location';
  } | null>(null);
  const [inlineLocations, setInlineLocations] = useState<Record<string, LocationDto | null>>({});
  const [pendingFocusAfterPageChange, setPendingFocusAfterPageChange] =
    useState(false);
  const [newRowDraft, setNewRowDraft] = useState<{
    itemId: string | '';
    quantity: number | '';
  }>({
    itemId: '',
    quantity: '',
  });
  const [newRowSelectedItem, setNewRowSelectedItem] =
    useState<CatalogEntryDto | null>(null);
  const [newRowSelectedLocation, setNewRowSelectedLocation] =
    useState<LocationDto | null>(null);
  const [newRowQuality, setNewRowQuality] = useState<number | ''>('');
  const [newRowUomId, setNewRowUomId] = useState<string>('');
  const [newRowItemInput, setNewRowItemInput] = useState('');
  const [newRowItemOptions, setNewRowItemOptions] = useState<CatalogEntryDto[]>([]);
  const [newRowItemLoading, setNewRowItemLoading] = useState(false);
  const [newRowItemError, setNewRowItemError] = useState<string | null>(null);
  const [newRowErrors, setNewRowErrors] = useState<{
    item?: string | null;
    quantity?: string | null;
    org?: string | null;
    api?: string | null;
  }>({});
  const [newRowSaving, setNewRowSaving] = useState(false);
  const debouncedSearch = useDebounce(filters.search, 350);
  const debouncedCatalogSearch = useDebounce(catalogSearch, 350);
  const isOrgMode = viewMode === 'org';
  const debouncedNewItemSearch = useDebounce(newRowItemInput, 300);

  useEffect(() => {
    window.sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (selectedOrgId === null) {
      window.sessionStorage.removeItem(ORG_ID_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(ORG_ID_STORAGE_KEY, selectedOrgId.toString());
  }, [selectedOrgId]);

  useEffect(() => {
    window.sessionStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    window.sessionStorage.setItem(LAYOUT_MODE_STORAGE_KEY, layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    if (!orgsLoaded.current || selectedOrgId === null) return;
    const isValidOrg = orgOptions.some((org) => org.id === selectedOrgId);
    if (!isValidOrg) {
      setSelectedOrgId(null);
      if (viewMode === 'org') {
        setViewMode('personal');
      }
    }
  }, [orgOptions, selectedOrgId, viewMode]);

  // Load UoMs once on mount
  useEffect(() => {
    inventoryService.getUnitsOfMeasure().then(setAllUoms).catch(() => {});
  }, []);

  const commodityUoms = useMemo(
    () => allUoms.filter((u) => u.catalogKind === 'commodity'),
    [allUoms],
  );
  const unitUom = useMemo(
    () => allUoms.find((u) => u.abbreviation === 'unit'),
    [allUoms],
  );

  const defaultUomIdFor = useCallback(
    (catalogKind: 'item' | 'commodity' | 'vehicle' | null): string => {
      if (catalogKind === 'commodity') {
        return commodityUoms[0]?.id ?? '';
      }
      return unitUom?.id ?? '';
    },
    [commodityUoms, unitUom],
  );

  // Reset UoMs when catalog item selection changes
  useEffect(() => {
    setNewItemUomId(defaultUomIdFor(selectedCatalogItem?.catalogKind ?? null));
  }, [selectedCatalogItem, defaultUomIdFor]);

  useEffect(() => {
    setNewRowUomId(defaultUomIdFor(newRowSelectedItem?.catalogKind ?? null));
  }, [newRowSelectedItem, defaultUomIdFor]);

  const inlineDraftFallbacks = useRef<Map<string, InlineDraft>>(new Map());

  useEffect(() => {
    const itemIds = new Set(items.map((item) => item.id.toString()));
    inlineDraftFallbacks.current.forEach((_, key) => {
      if (!itemIds.has(key)) {
        inlineDraftFallbacks.current.delete(key);
      }
    });
  }, [items]);

  const getRowOrder = useCallback(
    () => items.map((item) => item.id.toString()),
    [items],
  );
  const getNewRowOrder = useCallback((): Array<'new-row'> => ['new-row'], []);
  const handleFocusBoundary = useCallback(async () => {
    const totalPages = Math.ceil(totalCount / rowsPerPage);
    if (page < totalPages - 1) {
      setPendingFocusAfterPageChange(true);
      setPage((prev) => prev + 1);
    }
    return null;
  }, [page, rowsPerPage, totalCount]);
  const focusController = useFocusController<string, 'quantity' | 'quality' | 'save'>({
    fieldOrder: useMemo(() => ['quantity', 'quality', 'save'] as const, []),
    getRowOrder,
    onBoundary: handleFocusBoundary,
  });
  const newRowFocusController = useFocusController<
    'new-row',
    'item' | 'quantity' | 'save'
  >({
    fieldOrder: useMemo(() => ['item', 'quantity', 'save'] as const, []),
    getRowOrder: getNewRowOrder,
  });
  const quantityRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const qualityRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const saveRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const newRowItemRef = useRef<HTMLInputElement | null>(null);
  const newRowQuantityRef = useRef<HTMLInputElement | null>(null);
  const newRowSaveRef = useRef<HTMLButtonElement | null>(null);
  const newRowItemCache = useRef<Map<string, CatalogEntryDto[]>>(new Map());

  const activateInlineField = useCallback(
    (rowKey: string, field: 'quantity' | 'quality' | 'location') => {
      setInlineActiveField({ rowKey, field });
      setInlineError((prev) => ({ ...prev, [rowKey]: null }));
    },
    [],
  );
  const handleInlineDraftChange = useCallback(
    (itemId: string, changes: Partial<{ quantity: number | ''; quality: number | '' }>) => {
      setInlineDrafts((prev) => ({
        ...prev,
        [itemId]: {
          quantity:
            changes.quantity === undefined
              ? (prev[itemId]?.quantity ?? 0)
              : (changes.quantity as number | ''),
          quality:
            changes.quality === undefined
              ? (prev[itemId]?.quality ?? '')
              : (changes.quality as number | ''),
        },
      }));
      setInlineError((prev) => ({ ...prev, [itemId]: null }));
    },
    [],
  );
  const handleInlineErrorChange = useCallback(
    (itemId: string, message: string | null) => {
      setInlineError((prev) => ({
        ...prev,
        [itemId]: message,
      }));
    },
    [],
  );
  const handleInlineQuantityBlur = useCallback((rowKey: string) => {
    setInlineActiveField((prev) => {
      if (!prev || prev.rowKey !== rowKey) return prev;
      if (prev.field !== 'quantity') return prev;
      return null;
    });
  }, []);

  const handleInlineQualityBlur = useCallback((rowKey: string) => {
    setInlineActiveField((prev) => {
      if (!prev || prev.rowKey !== rowKey) return prev;
      if (prev.field !== 'quality') return prev;
      return null;
    });
  }, []);

  const handleInlineLocationChange = useCallback(
    (itemId: string, location: LocationDto | null) => {
      setInlineLocations((prev) => ({ ...prev, [itemId]: location }));
    },
    [],
  );

  const handleInlineLocationBlur = useCallback((rowKey: string) => {
    setInlineActiveField((prev) => {
      if (!prev || prev.rowKey !== rowKey) return prev;
      if (prev.field !== 'location') return prev;
      return null;
    });
  }, []);
  const handleQuantityRef = useCallback(
    (ref: HTMLInputElement | null, key: string) => {
      quantityRefs.current[key] = ref;
    },
    [],
  );
  const handleQualityRef = useCallback(
    (ref: HTMLInputElement | null, key: string) => {
      qualityRefs.current[key] = ref;
    },
    [],
  );
  const handleSaveRef = useCallback(
    (ref: HTMLButtonElement | null, key: string) => {
      saveRefs.current[key] = ref;
    },
    [],
  );

  const closeActionMenu = () => {
    setActionAnchor(null);
    setActionItem(null);
    setActionMode(null);
  };

  const handleActionOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, item: InventoryRecord) => {
      setActionAnchor(event.currentTarget);
      setActionItem(item);
    },
    [],
  );

  const canViewOrgInventory = useMemo(
    () =>
      orgPermissions.includes(OrgPermission.CAN_VIEW_ORG_INVENTORY) ||
      orgPermissions.includes(OrgPermission.CAN_EDIT_ORG_INVENTORY) ||
      orgPermissions.includes(OrgPermission.CAN_ADMIN_ORG_INVENTORY),
    [orgPermissions],
  );

  const canManageOrgInventory = useMemo(
    () =>
      orgPermissions.includes(OrgPermission.CAN_EDIT_ORG_INVENTORY) ||
      orgPermissions.includes(OrgPermission.CAN_ADMIN_ORG_INVENTORY),
    [orgPermissions],
  );
  const showAddButton =
    viewMode === 'personal' ||
    (viewMode === 'org' && Boolean(selectedOrgId) && canManageOrgInventory);
  const addButtonLabel = viewMode === 'org' ? 'Add org item' : 'Add item';
  const selectedOrgName = useMemo(
    () =>
      orgOptions.find((org) => org.id === selectedOrgId)?.name ??
      'Organization',
    [orgOptions, selectedOrgId],
  );

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/users/profile');
      const data = response.data;
      setUser({ userId: data.userId, username: data.username });
    } catch {
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

  const fetchOrganizations = useCallback(async (userId: string) => {
    try {
      const orgs = await inventoryService.getUserOrganizations(userId);
      const mapped = orgs.map((entry) => ({
        id: entry.organization?.id ?? entry.organizationId,
        name: entry.organization?.name ?? `Org #${entry.organizationId}`,
      }));
      const viewableOrgs = (
        await Promise.all(
          mapped.map(async (org) => {
            try {
              const perms = await permissionsService.getUserPermissions(
                userId,
                org.id,
              );
              const canView =
                perms.includes(OrgPermission.CAN_VIEW_ORG_INVENTORY) ||
                perms.includes(OrgPermission.CAN_EDIT_ORG_INVENTORY) ||
                perms.includes(OrgPermission.CAN_ADMIN_ORG_INVENTORY);
              return canView ? org : null;
            } catch {
              return null;
            }
          }),
        )
      ).filter((org): org is { id: string; name: string } => org !== null);
      setOrgOptions(viewableOrgs);
      orgsLoaded.current = true;
    } catch (err) {
      console.error('Error loading organizations', err);
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    try {
      setCatalogError(null);
      setCatalogLoading(true);
      const params = {
        search: debouncedCatalogSearch || undefined,
        categoryId: catalogCategoryId || undefined,
        limit: catalogRowsPerPage,
        page: catalogPage + 1,
      };
      const data = await catalogService.getCatalogItems(params);
      setCatalogItems(data.data);
      setCatalogTotal(data.total);
      setSelectedCatalogItem((prev) => {
        if (data.data.length === 0) {
          return null;
        }
        if (!prev || !data.data.some((item) => item.id === prev.id)) {
          return data.data[0];
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
  }, [
    debouncedCatalogSearch,
    catalogCategoryId,
    catalogRowsPerPage,
    catalogPage,
  ]);

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
      const categoryId = filters.categoryId || undefined;
      const limit = rowsPerPage;

      const sortParam: 'name' | 'quantity' | 'date_modified' =
        sortBy === 'name' ? 'name' : sortBy === 'quantity' ? 'quantity' : 'date_modified';

      if (isOrgMode && selectedOrgId) {
        if (orgPermissionsLoading || permissionsFetchedForOrgId.current !== selectedOrgId || !canViewOrgInventory) {
          setItems([]);
          setTotalCount(0);
          if (initialLoading) setInitialLoading(false);
          setRefreshing(false);
          return;
        }
        const data = await inventoryService.getOrgInventory(selectedOrgId, {
          search: debouncedSearch || undefined,
          categoryId,
          limit,
          page: page + 1,
          minQuantity: filters.valueRange[0] > 0 ? filters.valueRange[0] : undefined,
          maxQuantity: filters.valueRange[1] < SLIDER_QUANTITY_MAX ? filters.valueRange[1] : undefined,
          minQuality: filters.qualityRange[0] > 0 ? filters.qualityRange[0] : undefined,
          maxQuality: filters.qualityRange[1] < 1000 ? filters.qualityRange[1] : undefined,
          sort: sortParam,
          order: sortDir,
        });
        setItems(data.data);
        setTotalCount(data.total);
        if (page > 0) {
          const lastPage = Math.max(0, Math.floor((data.total - 1) / rowsPerPage));
          if (page > lastPage) setPage(lastPage);
        }
      } else {
        const data = await inventoryService.getInventory({
          limit,
          page: page + 1,
          search: debouncedSearch || undefined,
          categoryId,
          minQuantity: filters.valueRange[0] > 0 ? filters.valueRange[0] : undefined,
          maxQuantity: filters.valueRange[1] < SLIDER_QUANTITY_MAX ? filters.valueRange[1] : undefined,
          minQuality: filters.qualityRange[0] > 0 ? filters.qualityRange[0] : undefined,
          maxQuality: filters.qualityRange[1] < 1000 ? filters.qualityRange[1] : undefined,
          sort: sortParam,
          order: sortDir,
        });
        setItems(data.data);
        setTotalCount(data.total);
        if (page > 0) {
          const lastPage = Math.max(0, Math.floor((data.total - 1) / rowsPerPage));
          if (page > lastPage) setPage(lastPage);
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
    isOrgMode,
    selectedOrgId,
    orgPermissionsLoading,
    canViewOrgInventory,
    filters.categoryId,
    filters.valueRange,
    filters.qualityRange,
    debouncedSearch,
    page,
    rowsPerPage,
    initialLoading,
    sortBy,
    sortDir,
  ]);

  const openAddDialog = () => {
    if (viewMode === 'org' && !canManageOrgInventory) {
      setCatalogError(
        'You do not have permission to add items to this organization.',
      );
      return;
    }
    setAddDialogOpen(true);
    setSelectedCatalogItem(null);
    setCatalogSearch('');
    setCatalogCategoryId('');
    setCatalogPage(0);
    setNewItemQuantity(1);
    setNewItemNotes('');
    setNewItemLocation(null);
    setNewItemQuality('');
    setCatalogError(null);
    setAddSubmitting(false);
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
    setNewItemLocation(null);
    setNewItemQuality('');
  };

  const handleCreateInventoryItem = async (options?: {
    stayOpen?: boolean;
  }) => {
    const isOrgView = viewMode === 'org' && selectedOrgId !== null;
    if (!selectedCatalogItem) {
      setCatalogError('Select an item to add.');
      return;
    }
    if (viewMode === 'org' && !selectedOrgId) {
      setCatalogError('Select an organization.');
      return;
    }
    if (viewMode === 'org' && !canManageOrgInventory) {
      setCatalogError(
        'You do not have permission to add items to this organization.',
      );
      return;
    }
    if (newItemQuantity < MIN_INVENTORY_QUANTITY) {
      setCatalogError('Quantity must be at least 0.000001.');
      return;
    }

    try {
      setAddSubmitting(true);
      setCatalogError(null);
      const existing = items.find(
        (item) => item.catalogEntryId === selectedCatalogItem.id,
      );

      if (existing) {
        const shouldMerge = window.confirm(
          isOrgView
            ? 'This org already has this item. Merge quantities?'
            : 'This item already exists in your inventory. Merge quantities?',
        );
        if (shouldMerge) {
          const newQuantity =
            (Number(existing.quantity) || 0) + Number(newItemQuantity);
          if (isOrgView && selectedOrgId !== null) {
            await inventoryService.updateOrgItem(selectedOrgId, existing.id, {
              quantity: newQuantity,
            });
          } else {
            await inventoryService.updateItem(existing.id, {
              quantity: newQuantity,
            });
          }
        } else if (!isOrgView) {
          await inventoryService.createItem({
            catalogEntryId: selectedCatalogItem.id,
            quantity: newItemQuantity,
            unitOfMeasureId: newItemUomId || defaultUomIdFor(selectedCatalogItem.catalogKind),
            notes: newItemNotes || null,
            locationId: newItemLocation?.id ?? null,
            quality: newItemQuality !== '' ? newItemQuality : null,
          });
        } else {
          setCatalogError('This item already exists in the org inventory.');
          return;
        }
      } else {
        const resolvedUomId = newItemUomId || defaultUomIdFor(selectedCatalogItem.catalogKind);
        if (isOrgView && selectedOrgId !== null) {
          await inventoryService.createOrgItem(selectedOrgId, {
            catalogEntryId: selectedCatalogItem.id,
            quantity: newItemQuantity,
            unitOfMeasureId: resolvedUomId,
            notes: newItemNotes || null,
            locationId: newItemLocation?.id ?? null,
            quality: newItemQuality !== '' ? newItemQuality : null,
          });
        } else {
          await inventoryService.createItem({
            catalogEntryId: selectedCatalogItem.id,
            quantity: newItemQuantity,
            unitOfMeasureId: resolvedUomId,
            notes: newItemNotes || null,
            locationId: newItemLocation?.id ?? null,
            quality: newItemQuality !== '' ? newItemQuality : null,
          });
        }
      }

      await fetchInventory();
      if (options?.stayOpen) {
        setNewItemQuantity(1);
        setNewItemNotes('');
        setNewItemLocation(null);
        setNewItemQuality('');
        setCatalogError(null);
      } else {
        closeAddDialog();
      }
    } catch (err) {
      console.error('Error adding inventory item', err);
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 403) {
        setCatalogError(
          'You do not have permission to add items to this organization.',
        );
      } else if (status === 409 && viewMode === 'org' && selectedOrgId) {
        let existing = items.find(
          (item) => item.catalogEntryId === selectedCatalogItem?.id,
        );
        if (!existing && selectedCatalogItem) {
          try {
            const lookupResult = await inventoryService.getOrgInventory(
              selectedOrgId,
              { limit: 1, page: 1 },
            );
            if (lookupResult.data.length > 0) {
              existing = lookupResult.data[0];
            }
          } catch (lookupErr) {
            console.error(
              'Error looking up conflicting org inventory item',
              lookupErr,
            );
          }
        }
        if (existing) {
          const shouldMerge = window.confirm(
            'This org already has this item. Merge quantities?',
          );
          if (shouldMerge) {
            const newQuantity =
              (Number(existing.quantity) || 0) + Number(newItemQuantity);
            await inventoryService.updateOrgItem(selectedOrgId, existing.id, {
              quantity: newQuantity,
            });
            await fetchInventory();
            if (options?.stayOpen) {
              setNewItemQuantity(1);
              setNewItemNotes('');
              setCatalogError(null);
            } else {
              closeAddDialog();
            }
            setAddSubmitting(false);
            return;
          }
        }
        setCatalogError('This item already exists in the org inventory.');
      } else {
        setCatalogError('Unable to add item right now.');
      }
    } finally {
      setAddSubmitting(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, [fetchProfile, fetchCategories]);

  useEffect(() => {
    if (user?.userId) {
      fetchOrganizations(user.userId);
    }
  }, [user, fetchOrganizations]);

  useEffect(() => {
    if (viewMode !== 'org' || !user?.userId || !selectedOrgId) {
      setOrgPermissions([]);
      setOrgPermissionsError(null);
      permissionsFetchedForOrgId.current = null;
      return;
    }
    let isMounted = true;
    permissionsFetchedForOrgId.current = null;
    setOrgPermissionsLoading(true);
    permissionsService
      .getUserPermissions(user.userId, selectedOrgId)
      .then((permissions) => {
        if (isMounted) {
          setOrgPermissions(permissions);
          setOrgPermissionsError(null);
          permissionsFetchedForOrgId.current = selectedOrgId;
        }
      })
      .catch((err) => {
        console.error('Failed to load org permissions', err);
        if (isMounted) {
          setOrgPermissions([]);
          setOrgPermissionsError('Unable to load organization permissions.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setOrgPermissionsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [viewMode, user?.userId, selectedOrgId]);

  useEffect(() => {
    if (user) {
      fetchInventory();
    }
  }, [user, fetchInventory]);

  useEffect(() => {
    setPage(0);
  }, [
    debouncedSearch,
    filters.categoryId,
    filters.valueRange,
    filters.qualityRange,
    viewMode,
    selectedOrgId,
    sortBy,
    sortDir,
  ]);

  useEffect(() => {
    setCatalogPage(0);
  }, [debouncedCatalogSearch, catalogCategoryId]);

  useEffect(() => {
    if (addDialogOpen) {
      fetchCatalog();
    }
  }, [addDialogOpen, fetchCatalog]);

  useEffect(() => {
    if (
      addDialogOpen &&
      viewMode === 'org' &&
      !orgPermissionsLoading &&
      !canManageOrgInventory
    ) {
      setAddDialogOpen(false);
    }
  }, [addDialogOpen, viewMode, orgPermissionsLoading, canManageOrgInventory]);

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
      if (actionMode === 'edit') {
        if (actionItem.locationId && actionItem.locationName) {
          setEditLocation({
            id: actionItem.locationId,
            name: actionItem.locationName,
            slug: '',
            sourceType: '',
            starSystemUexId: null,
            starSystemName: null,
          });
        } else {
          setEditLocation(null);
        }
        setEditQuality(actionItem.quality != null ? actionItem.quality : '');
        setEditUomId(actionItem.unitOfMeasureId ?? '');
      }
    }
  }, [actionMode, actionItem]);

  const maxQuantity = useMemo(
    () =>
      items.reduce((max, item) => {
        const qty = Number(item.quantity) || 0;
        return qty > max ? qty : max;
      }, 0),
    [items],
  );

  // Track the slider's "natural" max separately so the auto-expand effect
  // only grows the ceiling — never resets a filter the user has actively set.
  const [sliderMax, setSliderMax] = useState(SLIDER_QUANTITY_MAX);

  useEffect(() => {
    if (maxQuantity > sliderMax) {
      setSliderMax(Math.ceil(maxQuantity));
    }
  }, [maxQuantity, sliderMax]);

  const filteredItems = useMemo(() => items, [items]);

  const groupedByEntry = useMemo((): GroupedRow[] => {
    const map = new Map<string, InventoryRecord[]>();
    filteredItems.forEach((item) => {
      const key = item.catalogEntryId;
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    });
    return Array.from(map.entries()).map(([catalogEntryId, rows]) => {
      const sorted = [...rows].sort((a, b) => {
        const locA = a.locationName ?? '';
        const locB = b.locationName ?? '';
        if (locA !== locB) return locA.localeCompare(locB);
        return (b.quality ?? -1) - (a.quality ?? -1);
      });
      const totalQuantity = rows.reduce((s, r) => s + Number(r.quantity), 0);
      const qualities = rows.map((r) => r.quality).filter((q): q is number => q != null);
      const maxQuality = qualities.length > 0 ? Math.max(...qualities) : null;
      const maxQualityCount = maxQuality != null ? rows.filter((r) => r.quality === maxQuality).length : 0;
      const rep = sorted[0];
      return {
        catalogEntryId,
        itemName: rep.itemName || `Item #${catalogEntryId}`,
        catalogKind: rep.catalogKind,
        categoryName: rep.categoryName,
        totalQuantity,
        maxQuality,
        maxQualityCount,
        subRows: sorted,
        representative: rep,
      };
    });
  }, [filteredItems]);

  useEffect(() => {
    if (!items.length) {
      setInlineDrafts({});
      setInlineLocations({});
      return;
    }
    setInlineDrafts(
      items.reduce<Record<string, { quantity: number; quality: number | '' }>>((acc, item) => {
        acc[item.id] = {
          quantity: Number(item.quantity) || 0,
          quality: item.quality ?? '',
        };
        return acc;
      }, {}),
    );
    setInlineLocations(
      items.reduce<Record<string, LocationDto | null>>((acc, item) => {
        acc[item.id] = item.locationId && item.locationName
          ? { id: item.locationId, name: item.locationName, slug: '', sourceType: '', starSystemUexId: null, starSystemName: null }
          : null;
        return acc;
      }, {}),
    );
  }, [items, setInlineDrafts]);

  const groupedItems = useMemo(() => {
    if (groupBy === 'none') {
      return new Map<string, InventoryRecord[]>([['All items', filteredItems]]);
    }

    const groups = new Map<string, InventoryRecord[]>();
    filteredItems.forEach((item) => {
      let key = 'Other';
      if (groupBy === 'category') {
        key = item.categoryName || 'Uncategorized';
      }

      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    });

    return groups;
  }, [groupBy, filteredItems]);

  const toggleEntryExpanded = useCallback((catalogEntryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(catalogEntryId)) {
        next.delete(catalogEntryId);
      } else {
        next.add(catalogEntryId);
      }
      return next;
    });
  }, []);

  const newRowQuantityNumber = useMemo(
    () => (newRowDraft.quantity === '' ? NaN : Number(newRowDraft.quantity)),
    [newRowDraft.quantity],
  );

  const newRowDirty = useMemo(
    () =>
      Boolean(
        newRowSelectedItem ||
          newRowDraft.quantity !== '' ||
          newRowItemInput.trim(),
      ),
    [newRowDraft.quantity, newRowItemInput, newRowSelectedItem],
  );
  const isEditorMode = density === 'compact';
  const newRowOrgBlocked = viewMode === 'org' && !selectedOrgId;

  const resetNewRowDraft = () => {
    setNewRowDraft({
      itemId: '',
      quantity: '',
    });
    setNewRowSelectedItem(null);
    setNewRowSelectedLocation(null);
    setNewRowQuality('');
    setNewRowItemInput('');
    setNewRowErrors({});
  };

  const handleNewRowSave = async () => {
    if (newRowOrgBlocked) {
      setNewRowErrors((prev) => ({
        ...prev,
        org: 'Select an organization to add items in org view.',
      }));
      return;
    }
    const selectedItemId = newRowSelectedItem?.id ?? null;
    const parsedQuantity = Number(newRowDraft.quantity);
    const errors: typeof newRowErrors = {};

    if (!selectedItemId) {
      errors.item = 'Select an item';
    }
    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity < MIN_INVENTORY_QUANTITY
    ) {
      errors.quantity = 'Quantity must be at least 0.000001';
    }

    if (errors.item || errors.quantity) {
      setNewRowErrors((prev) => ({ ...prev, ...errors, api: null }));
      if (errors.item) {
        newRowFocusController.focus('new-row', 'item');
      } else if (errors.quantity) {
        newRowFocusController.focus('new-row', 'quantity');
      }
      return;
    }

    try {
      setNewRowSaving(true);
      setNewRowErrors({});
      const payload = {
        catalogEntryId: selectedItemId!,
        quantity: parsedQuantity,
        unitOfMeasureId: newRowUomId || defaultUomIdFor(newRowSelectedItem?.catalogKind ?? null),
        locationId: newRowSelectedLocation?.id ?? null,
        quality: newRowQuality !== '' ? newRowQuality : null,
      };
      if (viewMode === 'org' && selectedOrgId) {
        await inventoryService.createOrgItem(selectedOrgId, payload);
      } else {
        await inventoryService.createItem(payload);
      }
      await fetchInventory();
      setNewRowSelectedLocation(null);
      setNewRowQuality('');
      setNewRowUomId('');
      resetNewRowDraft();
      newRowFocusController.focus('new-row', 'item');
    } catch (err) {
      console.error('Failed to create inventory item from new row', err);
      setNewRowErrors({
        api: 'Unable to add item. Please try again.',
      });
      newRowFocusController.focus('new-row', 'save');
    } finally {
      setNewRowSaving(false);
    }
  };
  useEffect(() => {
    const unregisters: Array<() => void> = [];
    items.forEach((item) => {
      const key = item.id.toString();
      unregisters.push(
        focusController.register(key, 'quantity', () => {
          activateInlineField(key, 'quantity');
        }),
      );
      unregisters.push(
        focusController.register(key, 'quality', () => {
          activateInlineField(key, 'quality');
        }),
      );
      const saveRef = saveRefs.current[key];
      if (saveRef) {
        unregisters.push(
          focusController.register(key, 'save', () => {
            saveRef.focus();
          }),
        );
      }
    });
    return () => {
      unregisters.forEach((fn) => fn());
    };
  }, [items, focusController, activateInlineField]);

  useEffect(() => {
    if (!inlineActiveField) return;
    const { rowKey, field } = inlineActiveField;
    const ref = field === 'quality' ? qualityRefs.current[rowKey] : quantityRefs.current[rowKey];
    if (!ref) return;
    const handle = window.requestAnimationFrame(() => {
      ref.focus();
      ref.select?.();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [inlineActiveField]);

  useEffect(() => {
    const unregisters: Array<() => void> = [];
    const itemRef = newRowItemRef.current;
    const quantityRef = newRowQuantityRef.current;
    const saveRef = newRowSaveRef.current;

    if (itemRef) {
      unregisters.push(
        newRowFocusController.register('new-row', 'item', () => {
          itemRef.focus();
          itemRef.select?.();
        }),
      );
    }
    if (quantityRef) {
      unregisters.push(
        newRowFocusController.register('new-row', 'quantity', () => {
          quantityRef.focus();
          quantityRef.select?.();
        }),
      );
    }
    if (saveRef) {
      unregisters.push(
        newRowFocusController.register('new-row', 'save', () => {
          saveRef.focus();
        }),
      );
    }

    return () => {
      unregisters.forEach((fn) => fn());
    };
  }, [newRowFocusController, density]);

  useEffect(() => {
    if (!isEditorMode) return;
    const handle = window.requestAnimationFrame(() => {
      newRowFocusController.focus('new-row', 'item');
    });
    return () => window.cancelAnimationFrame(handle);
  }, [isEditorMode, newRowFocusController]);

  useEffect(() => {
    if (!isEditorMode) {
      resetNewRowDraft();
      setInlineActiveField(null);
    }
  }, [isEditorMode]);

  useEffect(() => {
    setNewRowErrors((prev) => ({
      ...prev,
      org: newRowOrgBlocked
        ? 'Select an organization to add items in org view.'
        : null,
    }));
  }, [newRowOrgBlocked]);

  useEffect(() => {
    if (pendingFocusAfterPageChange && items.length > 0) {
      focusController.focus(items[0].id.toString(), 'quantity');
      setPendingFocusAfterPageChange(false);
    }
  }, [pendingFocusAfterPageChange, items, focusController]);

  useEffect(() => {
    let isMounted = true;
    if (!isEditorMode) {
      setNewRowItemLoading(false);
      setNewRowItemOptions([]);
      return;
    }
    const searchKey = debouncedNewItemSearch.trim().toLowerCase();
    const cached = newRowItemCache.current.get(searchKey);
    if (cached) {
      setNewRowItemOptions(cached);
      setNewRowItemError(null);
      setNewRowItemLoading(false);
      return;
    }

    const loadItems = async () => {
      try {
        setNewRowItemError(null);
        setNewRowItemLoading(true);
        const data = await catalogService.getCatalogItems({
          search: debouncedNewItemSearch || undefined,
          limit: 20,
          page: 1,
        });
        if (!isMounted) return;
        newRowItemCache.current.set(searchKey, data.data);
        setNewRowItemOptions(data.data);
      } catch (err) {
        console.error('Failed to search catalog items for new row', err);
        if (isMounted) {
          setNewRowItemError('Unable to load items.');
          setNewRowItemOptions([]);
        }
      } finally {
        if (isMounted) {
          setNewRowItemLoading(false);
        }
      }
    };

    loadItems();
    return () => {
      isMounted = false;
    };
  }, [debouncedNewItemSearch, isEditorMode]);

  const getInlineDraft = useCallback(
    (item: InventoryRecord): InlineDraft => {
      const existingDraft = inlineDrafts[item.id];
      if (existingDraft) {
        return existingDraft;
      }

      const rowKey = item.id.toString();
      const nextFallback: InlineDraft = {
        quantity: Number(item.quantity) || 0,
        quality: item.quality ?? '',
      };
      const cachedFallback = inlineDraftFallbacks.current.get(rowKey);

      if (
        cachedFallback &&
        cachedFallback.quantity === nextFallback.quantity
      ) {
        return cachedFallback;
      }

      // Writing to a ref during render is intentional here. nextFallback is
      // derived deterministically from item data, so concurrent/aborted renders
      // always write the same value for a given key — no stale state is possible.
      // Stale entries for removed items are pruned by the [items] effect above.
      inlineDraftFallbacks.current.set(rowKey, nextFallback);
      return nextFallback;
    },
    [inlineDrafts],
  );

  const handleInlineSave = useCallback(
    async (item: InventoryRecord) => {
      const draft = getInlineDraft(item);
      const parsedQuantity = Number(draft.quantity);

      if (
        !Number.isFinite(parsedQuantity) ||
        parsedQuantity < MIN_INVENTORY_QUANTITY
      ) {
        setInlineError((prev) => ({
          ...prev,
          [item.id]: 'Quantity must be at least 0.000001',
        }));
        focusController.focus(item.id.toString(), 'quantity');
        return false;
      }

      const nextSaving = new Set(inlineSaving);
      nextSaving.add(item.id);
      setInlineSaving(nextSaving);
      const locationDraft = inlineLocations[item.id];
      const locationId = locationDraft !== undefined ? (locationDraft?.id ?? null) : (item.locationId ?? null);
      const prevItem =
        items.find((entry) => entry.id === item.id) ??
        ({
          ...item,
        } as InventoryRecord);
      const updatedItem: InventoryRecord = {
        ...item,
        quantity: parsedQuantity,
        locationId,
        locationName: locationDraft !== undefined ? (locationDraft?.name ?? null) : (item.locationName ?? null),
      };
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? updatedItem : entry)),
      );

      const draftQuality = draft.quality;
      const parsedQuality = draftQuality !== '' ? Number(draftQuality) : null;

      try {
        if (viewMode === 'org' && selectedOrgId) {
          await inventoryService.updateOrgItem(selectedOrgId, item.id, {
            quantity: parsedQuantity,
            locationId,
            quality: parsedQuality,
          });
        } else {
          await inventoryService.updateItem(item.id, {
            quantity: parsedQuantity,
            locationId,
            quality: parsedQuality,
          });
        }
        setInlineSaved((prev) => {
          const next = new Set(prev);
          next.add(item.id.toString());
          setTimeout(() => {
            setInlineSaved((current) => {
              const copy = new Set(current);
              copy.delete(item.id.toString());
              return copy;
            });
          }, 1200);
          return next;
        });
        return true;
      } catch (err) {
        console.error('Inline save failed', err);
        setItems((prev) =>
          prev.map((entry) => (entry.id === item.id ? prevItem : entry)),
        );
        setInlineError((prev) => ({
          ...prev,
          [item.id]: 'Unable to save. Please try again.',
        }));
        focusController.focus(item.id.toString(), 'save');
        return false;
      } finally {
        const updated = new Set(inlineSaving);
        updated.delete(item.id);
        setInlineSaving(updated);
      }
    },
    [focusController, getInlineDraft, inlineLocations, inlineSaving, items, selectedOrgId, viewMode],
  );

  const handleInlineSaveAndAdvance = useCallback(
    async (item: InventoryRecord) => {
      const saved = await handleInlineSave(item);
      if (saved) {
        const advanced = await focusController.focusNext(
          item.id.toString(),
          'save',
        );
        if (!advanced && items.length > 0) {
          focusController.focus(items[0].id.toString(), 'quantity');
        }
      }
    },
    [focusController, handleInlineSave, items],
  );

  const openActionDialog = (mode: ActionMode) => {
    setActionMode(mode);
    setActionAnchor(null);
  };

  const handleUpdateItem = async (payload: {
    quantity?: number;
    unitOfMeasureId?: string;
    notes?: string;
    locationId?: string | null;
    quality?: number | null;
  }) => {
    if (!actionItem) return;
    try {
      setActionWorking(true);
      setError(null);
      if (viewMode === 'org' && selectedOrgId) {
        await inventoryService.updateOrgItem(
          selectedOrgId,
          actionItem.id,
          payload,
        );
      } else {
        await inventoryService.updateItem(actionItem.id, payload);
      }
      closeActionMenu();
      await fetchInventory();
    } finally {
      setActionWorking(false);
    }
  };

  const handleSplit = async (quantity: number) => {
    if (!actionItem || quantity <= 0) return;
    try {
      setActionWorking(true);
      setError(null);
      if (quantity >= Number(actionItem.quantity)) {
        setError('Split quantity must be less than the current quantity.');
        throw new Error('Split quantity must be less than the current quantity');
      }

      setError('Split is not yet supported in this version.');
      setActionWorking(false);
      return;
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
          <Typography
            variant="h6"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            {actionMode === 'edit' && <EditIcon fontSize="small" />}
            {actionMode === 'split' && <CallSplitIcon fontSize="small" />}
            {actionMode === 'delete' && <DeleteForeverIcon fontSize="small" />}
            {actionMode === 'edit'
              ? 'Edit item'
              : actionMode === 'split'
                ? 'Split item'
                : 'Delete item'}
          </Typography>
          {actionMode === 'edit' && (
            <>
              <TextField
                label="Quantity"
                type="number"
                value={actionQuantity}
                fullWidth
                inputProps={{ min: 0, step: 0.000001 }}
                onChange={(e) => setActionQuantity(Number(e.target.value))}
              />
              {actionItem.catalogKind === 'commodity' ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Unit of Measure
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={editUomId}
                    onChange={(_e, v) => { if (v) setEditUomId(v); }}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    {commodityUoms.map((u) => (
                      <MuiTooltip key={u.id} title={`Scale factor: ${u.scaleFactor}`} placement="top">
                        <ToggleButton value={u.id} sx={{ px: 2, py: 0.5 }}>
                          {u.abbreviation}
                        </ToggleButton>
                      </MuiTooltip>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Unit of Measure: <strong>{actionItem.unitOfMeasureLabel || actionItem.unitOfMeasureCode}</strong>
                </Typography>
              )}
              <LocationPicker
                value={editLocation}
                onChange={setEditLocation}
              />
              <TextField
                label="Quality (0–1000)"
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 1000, step: 1 }}
                value={editQuality}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setEditQuality('');
                    return;
                  }
                  const num = parseFloat(raw);
                  if (!Number.isNaN(num)) {
                    setEditQuality(Math.min(1000, Math.max(0, num)));
                  }
                }}
              />
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
                      unitOfMeasureId: editUomId || undefined,
                      notes: actionItem.notes ?? undefined,
                      locationId: editLocation?.id ?? null,
                      quality: editQuality !== '' ? editQuality : null,
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
                Current quantity: {quantityValue.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </Typography>
              <TextField
                label="Quantity to split"
                type="number"
                fullWidth
                inputProps={{ min: 0.000001, max: quantityValue, step: 0.000001 }}
                value={actionQuantity}
                onChange={(e) => setActionQuantity(Number(e.target.value))}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="text" onClick={closeActionMenu}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={actionWorking}
                  onClick={() => handleSplit(actionQuantity)}
                >
                  Split
                </Button>
              </Stack>
            </>
          )}
          {actionMode === 'delete' && (
            <>
              <Typography variant="body2">
                Delete{' '}
                <strong>
                  {actionItem.itemName || `Item ${actionItem.catalogEntryId}`}
                </strong>
                ?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This removes the record from the inventory. You can recreate it
                later.
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

  const addReady = Boolean(selectedCatalogItem && newItemQuantity > 0);

  const handleAddKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && addReady) {
      event.preventDefault();
      handleCreateInventoryItem({ stayOpen: true });
    }
  };

  const handleCatalogSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      addQuantityRef.current?.focus();
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
    }
  };

  if (!user || initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--surface-page)' }}>
        <CircularProgress />
      </Box>
    );
  }

  const inventoryBusy = refreshing;
  const showEmptyState = filteredItems.length === 0 && !refreshing;
  const totalQty = items.reduce((s, x) => s + Number(x.quantity), 0);
  const catCount = new Set(items.map((x) => x.categoryName)).size;
  const uniqueItemCount = groupedByEntry.length;

  const renderInlineRow = (item: InventoryRecord) => {
    const rowKey = item.id.toString();
    const draft = getInlineDraft(item);
    const originalQuantity = Number(item.quantity) || 0;
    const draftQuantityNumber = Number(draft.quantity);
    const inlineLocation = inlineLocations[item.id] !== undefined ? inlineLocations[item.id] : (item.locationId && item.locationName ? { id: item.locationId, name: item.locationName, slug: '', sourceType: '', starSystemUexId: null, starSystemName: null } : null);
    const originalLocationId = item.locationId ?? null;
    const draftLocationId = inlineLocations[item.id] !== undefined ? (inlineLocations[item.id]?.id ?? null) : originalLocationId;
    const isDirty = draftQuantityNumber !== originalQuantity || draftLocationId !== originalLocationId;
    const isRowActive = inlineActiveField?.rowKey === rowKey;
    const isQuantityActive =
      isRowActive && inlineActiveField?.field === 'quantity';
    const isQualityActive =
      isRowActive && inlineActiveField?.field === 'quality';
    const isLocationActive =
      isRowActive && inlineActiveField?.field === 'location';
    const saving = inlineSaving.has(item.id);
    const errorText = inlineError[item.id];
    const saved = inlineSaved.has(item.id.toString());

    return (
      <InventoryInlineRow
        key={item.id}
        item={item}
        density={density}
        inlineDraft={draft}
        quantityEditing={isQuantityActive}
        qualityEditing={isQualityActive}
        locationEditing={isLocationActive}
        inlineLocation={inlineLocation}
        inlineSaving={saving}
        inlineSaved={saved}
        inlineError={errorText}
        isDirty={isDirty}
        isRowActive={isRowActive}
        focusController={focusController}
        rowKey={rowKey}
        onDraftChange={handleInlineDraftChange}
        onErrorChange={handleInlineErrorChange}
        onQuantityBlur={handleInlineQuantityBlur}
        onQualityBlur={handleInlineQualityBlur}
        onActivateField={activateInlineField}
        onLocationChange={handleInlineLocationChange}
        onLocationBlur={handleInlineLocationBlur}
        onSave={handleInlineSaveAndAdvance}
        onOpenActions={handleActionOpen}
        setQuantityRef={handleQuantityRef}
        setQualityRef={handleQualityRef}
        setSaveRef={handleSaveRef}
      />
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

  return (
    <AppShell
      active="inventory"
      userInitial={user?.username?.charAt(0).toUpperCase() || 'U'}
      searchPlaceholder="Search inventory…"
    >
      <div className="inv-page">

        {/* Page header */}
        <div className="page-head">
          <div>
            <div className="crumb">
              <InventoryTwoToneIcon style={{ width: 13, height: 13 }} /> Assets &rsaquo; Inventory
            </div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-sub">
              Track everything you own and what your org holds — refined ore, components,
              weapons, and trade goods. Edit quantities inline and split stacks.
            </p>
          </div>
          <div className="page-actions">
            {/* View toggle */}
            <div className="inv-seg" role="group" aria-label="Inventory view">
              <button
                aria-selected={viewMode === 'personal'}
                onClick={() => setViewMode('personal')}
              >
                <PersonIcon style={{ width: 15, height: 15 }} /> Personal
              </button>
              <button
                aria-selected={viewMode === 'org'}
                onClick={() => setViewMode('org')}
              >
                <GroupsIcon style={{ width: 15, height: 15 }} /> Organization
              </button>
            </div>
            {/* Org selector */}
            {isOrgMode && orgOptions.length > 0 && (
              <div className="inv-orgsel">
                <span className="badge">
                  {(orgOptions.find(o => o.id === selectedOrgId)?.name ?? 'Org').slice(0, 2).toUpperCase()}
                </span>
                <select
                  value={selectedOrgId ?? ''}
                  onChange={(e) => setSelectedOrgId(e.target.value || null)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-strong)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}
                  aria-label="Select organization"
                >
                  <option value="">Select org…</option>
                  {orgOptions.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
                <ExpandMoreIcon style={{ width: 15, height: 15, color: 'var(--text-faint)' }} />
              </div>
            )}
            {/* Add button */}
            {showAddButton && (
              <button className="btn btn-primary btn-sm" onClick={openAddDialog}>
                <AddIcon style={{ width: 15, height: 15 }} /> {addButtonLabel}
              </button>
            )}
          </div>
        </div>

        {/* Permissions banner (org mode) */}
        {isOrgMode && selectedOrgId && !orgPermissionsLoading && (
          <div className={'perm-bar ' + (canManageOrgInventory ? 'manage' : 'view')}>
            {canManageOrgInventory
              ? <VerifiedUserIcon style={{ width: 15, height: 15 }} />
              : <VisibilityIcon style={{ width: 15, height: 15 }} />}
            {canManageOrgInventory
              ? <span>You have <strong>manage</strong> access to {selectedOrgName} inventory — add, edit, split, and delete org stock.</span>
              : <span>You have <strong>view-only</strong> access to {selectedOrgName} inventory. Ask an admin for edit rights.</span>}
            <span className="grow" />
          </div>
        )}
        {orgPermissionsError && (
          <div className="inv-perms-warn">{orgPermissionsError}</div>
        )}

        {/* Stat strip */}
        <div className="statstrip" style={{ '--n': 3 } as React.CSSProperties}>
          <div className="statcard">
            <div className="k"><PackageIcon style={{ width: 13, height: 13 }} /> {isOrgMode ? 'Org items' : 'My items'}</div>
            <div className="v">{uniqueItemCount.toLocaleString()}</div>
            <div className="d">{items.length.toLocaleString()} record{items.length === 1 ? '' : 's'} · {catCount} categories</div>
          </div>
          <div className="statcard">
            <div className="k"><LayersIcon style={{ width: 13, height: 13 }} /> Total quantity</div>
            <div className="v">{totalQty > 9999 ? `${(totalQty / 1000).toFixed(1)}k` : totalQty.toLocaleString(undefined, { maximumFractionDigits: 3 })}</div>
            <div className="d">units on hand</div>
          </div>
          <div className="statcard">
            <div className="k"><LocalOfferIcon style={{ width: 13, height: 13 }} /> Categories</div>
            <div className="v">{catCount}</div>
            <div className="d">item families</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="inv-toolbar">
          <label className="inv-search">
            <SearchIcon style={{ width: 16, height: 16 }} />
            <input
              value={filters.search}
              placeholder="Search items, notes…"
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              aria-label="Search inventory"
            />
          </label>
          <span className="inv-select">
            <LocalOfferIcon className="lead" style={{ width: 15, height: 15 }} />
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
              aria-label="Category filter"
            >
              <option value="">All categories</option>
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ExpandMoreIcon className="chev" style={{ width: 15, height: 15 }} />
          </span>
          <span className="inv-select">
            <SortIcon className="lead" style={{ width: 15, height: 15 }} />
            <select
              value={sortBy + ':' + sortDir}
              onChange={(e) => {
                const [k, d] = e.target.value.split(':');
                setSortBy(k as 'name' | 'quantity' | 'date');
                setSortDir(() => d as 'asc' | 'desc');
              }}
              aria-label="Sort"
            >
              <option value="date:desc">Newest first</option>
              <option value="date:asc">Oldest first</option>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
              <option value="quantity:desc">Quantity high–low</option>
              <option value="quantity:asc">Quantity low–high</option>
            </select>
            <ExpandMoreIcon className="chev" style={{ width: 15, height: 15 }} />
          </span>
          <span className="inv-select">
            <GridViewIcon className="lead" style={{ width: 15, height: 15 }} />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'category')}
              aria-label="Group by"
            >
              <option value="none">No grouping</option>
              <option value="category">Group by category</option>
            </select>
            <ExpandMoreIcon className="chev" style={{ width: 15, height: 15 }} />
          </span>
          <span className="inv-spacer" />
          {(viewMode === 'personal' || canManageOrgInventory) && (
            <div className="density-toggle" role="group" aria-label="Density">
              <button
                aria-pressed={density === 'standard'}
                onClick={() => setDensity('standard')}
                title="Standard view"
              >
                <ViewListIcon style={{ width: 16, height: 16 }} />
              </button>
              <button
                aria-pressed={density === 'compact'}
                onClick={() => setDensity('compact')}
                title="Editor mode — inline editing"
              >
                <EditNoteIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
          )}
          {/* Layout toggle: table / card */}
          <div className="density-toggle" role="group" aria-label="Layout">
            <button
              aria-pressed={layoutMode === 'table'}
              onClick={() => setLayoutMode('table')}
              title="Table view"
            >
              <ViewAgendaIcon style={{ width: 16, height: 16 }} />
            </button>
            <button
              aria-pressed={layoutMode === 'card'}
              onClick={() => setLayoutMode('card')}
              title="Card view"
            >
              <GridViewIcon style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Card view */}
        {layoutMode === 'card' && (
          <div style={{ marginTop: 'var(--space-6)' }} aria-busy={inventoryBusy}>
            {refreshing && <LinearProgress sx={{ mb: 1 }} color="primary" />}
            {error && <div className="inv-error">{error}</div>}
            {initialLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
                <CircularProgress size={32} />
              </div>
            ) : groupedByEntry.length === 0 ? (
              <div className="inv-empty">No items match the current filters.</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 'var(--space-4)',
                }}
              >
                {groupedByEntry.map((group) => (
                  <InventoryCard
                    key={group.catalogEntryId}
                    group={group}
                    onClick={setSelectedDrawerGroup}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table content */}
        <div style={{ marginTop: 'var(--space-6)', position: 'relative', display: layoutMode === 'card' ? 'none' : undefined }} aria-busy={inventoryBusy}>
          {refreshing && <LinearProgress sx={{ mb: 1 }} color="primary" />}
          {error && <div className="inv-error">{error}</div>}

          {isEditorMode && (
            <>
              <div className="inv-editor-head">
                <span>Item</span>
                <span>Location</span>
                <span>Quality</span>
                <span>Quantity</span>
                <span>Updated</span>
                <span>Category</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>
              <InventoryNewRow
                isEditorMode={isEditorMode}
                itemOptions={newRowItemOptions}
                itemInput={newRowItemInput}
                selectedItem={newRowSelectedItem}
                itemLoading={newRowItemLoading}
                itemError={newRowItemError}
                draft={newRowDraft}
                errors={newRowErrors}
                dirty={newRowDirty}
                saving={newRowSaving}
                orgBlocked={newRowOrgBlocked}
                showQuantityWarning={
                  Number.isFinite(newRowQuantityNumber) &&
                  newRowQuantityNumber >= EDITOR_MODE_QUANTITY_MAX
                }
                onItemInputChange={(value, reason) => {
                  setNewRowItemInput(value);
                  if (reason === 'clear') {
                    setNewRowSelectedItem(null);
                    setNewRowDraft((prev) => ({ ...prev, itemId: '' }));
                  }
                  setNewRowErrors((prev) => ({ ...prev, item: null, api: null }));
                }}
                uomOptions={commodityUoms}
                uomId={newRowUomId}
                onUomChange={setNewRowUomId}
                selectedLocation={newRowSelectedLocation}
                onLocationChange={setNewRowSelectedLocation}
                quality={newRowQuality}
                onQualityChange={setNewRowQuality}
                onItemSelect={(value) => {
                  setNewRowSelectedItem(value);
                  setNewRowDraft((prev) => ({ ...prev, itemId: value ? value.id : '' }));
                  setNewRowItemInput(value?.name ?? newRowItemInput);
                  setNewRowErrors((prev) => ({ ...prev, item: null, api: null }));
                  if (value) newRowFocusController.focus('new-row', 'quantity');
                }}
                onQuantityChange={(value) => {
                  const raw = value.trim();
                  if (raw === '') {
                    setNewRowDraft((prev) => ({ ...prev, quantity: '' }));
                    setNewRowErrors((prev) => ({ ...prev, quantity: 'Quantity is required', api: null }));
                    return;
                  }
                  const numeric = Number(raw);
                  const nextQuantity = Number.isNaN(numeric) ? '' : Math.min(numeric, EDITOR_MODE_QUANTITY_MAX);
                  setNewRowDraft((prev) => ({ ...prev, quantity: nextQuantity }));
                  if (!Number.isFinite(numeric) || numeric < MIN_INVENTORY_QUANTITY) {
                    setNewRowErrors((prev) => ({ ...prev, quantity: 'Quantity must be at least 0.000001', api: null }));
                  } else {
                    setNewRowErrors((prev) => ({ ...prev, quantity: null, api: null }));
                  }
                }}
                onQuantityEnter={() => newRowFocusController.focus('new-row', 'save')}
                onSave={handleNewRowSave}
                onRetry={handleNewRowSave}
                itemRef={newRowItemRef}
                quantityRef={newRowQuantityRef}
                saveRef={newRowSaveRef}
              />
            </>
          )}

          {showEmptyState ? (
            <div className="dtable-wrap" style={{ marginTop: isEditorMode ? 'var(--space-3)' : undefined }}>
              <div className="inv-empty">
                <div className="e-ic"><InventoryIcon style={{ width: 26, height: 26 }} /></div>
                <h3>No inventory matches your filters</h3>
                <p>Adjust filters or {canManageOrgInventory || viewMode === 'personal' ? 'add a new item' : 'sync new items'} to get started.</p>
              </div>
            </div>
          ) : (
            <>
              {!showEmptyState && (
                <div className="inv-count-bar">
                  <ViewAgendaIcon style={{ width: 16, height: 16 }} />
                  <span>Showing {groupedByEntry.length.toLocaleString()} item type{groupedByEntry.length === 1 ? '' : 's'} ({items.length.toLocaleString()} record{items.length === 1 ? '' : 's'}) of {totalCount.toLocaleString()} total</span>
                </div>
              )}
              <div className={isEditorMode ? 'editor' : ''}>
                {Array.from(groupedItems.entries()).map(([group, groupItems]) => {
                  const groupEntries = groupedByEntry.filter((g) =>
                    groupItems.some((i) => i.catalogEntryId === g.catalogEntryId),
                  );
                  return (
                    <div
                      key={group}
                      className={'grp-section' + (groupBy === 'none' ? ' single' : '')}
                    >
                      {groupBy !== 'none' && (
                        <div className="grp-header">
                          <span className="gchip">{group}</span>
                          <span className="gcount">{groupEntries.length} item{groupEntries.length === 1 ? '' : 's'}</span>
                        </div>
                      )}
                      <div className="dtable-wrap">
                        <div className="inv-row-head" role="row">
                          <span></span>
                          <span>Item</span>
                          <span>Location</span>
                          <span>Quality</span>
                          <span>Qty</span>
                          <span>Updated</span>
                          <span>Category</span>
                          <span></span>
                        </div>
                        <div role="rowgroup">
                          {groupEntries.map((group) => {
                            const isExpanded = expandedEntries.has(group.catalogEntryId);
                            const hasSubs = group.subRows.length > 1;
                            return (
                              <div key={group.catalogEntryId} className="acc-entry">
                                {/* Parent row */}
                                <div
                                  className={'acc-parent' + (isExpanded ? ' expanded' : '')}
                                  role="row"
                                >
                                  <button
                                    className={'acc-chevron' + (hasSubs ? '' : ' invisible')}
                                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                    aria-expanded={isExpanded}
                                    onClick={() => hasSubs && toggleEntryExpanded(group.catalogEntryId)}
                                    tabIndex={hasSubs ? 0 : -1}
                                  >
                                    <ChevronRightIcon style={{ width: 16, height: 16, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease-out' }} />
                                  </button>
                                  <span className="acc-name" title={group.itemName}>
                                    {group.itemName}
                                    <span className="chip-badge neutral" style={{ marginLeft: 8 }}>Private</span>
                                  </span>
                                  <span className="acc-location">
                                    {group.subRows.length === 1
                                      ? (group.subRows[0].locationName ?? <>&mdash;</>)
                                      : <span className="acc-multi">{group.subRows.length} locations</span>}
                                  </span>
                                  <span className="acc-quality">
                                    {group.maxQuality != null ? (
                                      <span className="quality-pill">
                                        Q{group.maxQuality}
                                        {group.maxQualityCount > 1 && (
                                          <span className="quality-pill-count">&thinsp;&times;{group.maxQualityCount}</span>
                                        )}
                                      </span>
                                    ) : <>&mdash;</>}
                                  </span>
                                  <span className="acc-qty">
                                    {group.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                  </span>
                                  <span className="acc-date">
                                    {new Date(group.representative.updatedAt || group.representative.createdAt || '').toLocaleDateString()}
                                  </span>
                                  <span className="acc-cat">
                                    <span className="chip-badge neutral" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {group.categoryName || 'General'}
                                    </span>
                                  </span>
                                  <span className="acc-actions">
                                    <button
                                      className="row-act"
                                      onClick={(e) => handleActionOpen(e as unknown as React.MouseEvent<HTMLElement>, group.representative)}
                                      aria-label="Actions"
                                    >
                                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                                      </svg>
                                    </button>
                                  </span>
                                </div>
                                {/* Sub-rows */}
                                {isExpanded && hasSubs && (
                                  <div className="acc-subrows" role="rowgroup">
                                    {group.subRows.map((item) => renderInlineRow(item))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="inv-pager">
                <div className="rpp">
                  Rows per page
                  <select
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    aria-label="Rows per page"
                    disabled={inventoryBusy}
                  >
                    {[10, 25, 50, 100, 250].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <span>
                  {totalCount === 0 ? 0 : page * rowsPerPage + 1}–{Math.min(totalCount, (page + 1) * rowsPerPage)} of {totalCount.toLocaleString()}
                </span>
                <div className="pager">
                  <button
                    disabled={inventoryBusy || page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon style={{ width: 16, height: 16 }} />
                  </button>
                  <button
                    disabled={inventoryBusy || page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRightIcon style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Catalog add dialog — kept as MUI Dialog for form UX, DS classes applied inside */}
      <Dialog
        open={addDialogOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick') return;
          closeAddDialog();
        }}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-strong)', borderBottom: '1px solid var(--border-subtle)', pb: 2 }}>
          {viewMode === 'org' ? `Add org inventory item · ${selectedOrgName}` : 'Add inventory item'}
        </DialogTitle>
        <DialogContent dividers onKeyDown={handleAddKeyDown} sx={{ p: 0, display: 'flex', minHeight: 420 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,5fr) minmax(0,7fr)', width: '100%' }}>
            {/* Left: form */}
            <div style={{ padding: 'var(--space-5) var(--space-6)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
              {catalogError && <Alert severity="error">{catalogError}</Alert>}
              <div>
                <label className="field-lbl">Search catalog</label>
                <div className="inv-search" style={{ maxWidth: 'none' }}>
                  <SearchIcon style={{ width: 16, height: 16 }} />
                  <input
                    ref={addSearchRef}
                    value={catalogSearch}
                    autoFocus
                    placeholder="Search items…"
                    onChange={(e) => { setCatalogSearch(e.target.value); setCatalogPage(0); }}
                    onKeyDown={handleCatalogSearchKeyDown}
                    aria-label="Search catalog"
                  />
                </div>
              </div>
              <div>
                <label className="field-lbl">Category</label>
                <div className="inv-select" style={{ width: '100%', boxSizing: 'border-box' }}>
                  <LocalOfferIcon className="lead" style={{ width: 15, height: 15 }} />
                  <select
                    value={catalogCategoryId}
                    onChange={(e) => setCatalogCategoryId(e.target.value)}
                    style={{ flex: 1 }}
                    aria-label="Catalog category"
                  >
                    <option value="">All categories</option>
                    {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ExpandMoreIcon className="chev" style={{ width: 15, height: 15 }} />
                </div>
              </div>
              <div>
                <label className="field-lbl">Quantity</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <input
                    className="field-in mono"
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    ref={addQuantityRef}
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); addLocationRef.current?.focus(); }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => setNewItemQuantity((q) => Number(Math.max(0.000001, q - 10).toFixed(6)))}>−10</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setNewItemQuantity((q) => Number((q + 10).toFixed(6)))}>+10</button>
                </div>
              </div>
              {selectedCatalogItem?.catalogKind === 'commodity' && commodityUoms.length > 0 && (
                <div>
                  <label className="field-lbl">Unit of measure</label>
                  <ToggleButtonGroup size="small" exclusive value={newItemUomId} onChange={(_e, v) => { if (v) setNewItemUomId(v); }} sx={{ flexWrap: 'wrap' }}>
                    {commodityUoms.map((u) => (
                      <MuiTooltip key={u.id} title={`Scale factor: ${u.scaleFactor}`} placement="top">
                        <ToggleButton value={u.id} sx={{ px: 2, py: 0.5 }}>{u.abbreviation}</ToggleButton>
                      </MuiTooltip>
                    ))}
                  </ToggleButtonGroup>
                </div>
              )}
              <LocationPicker value={newItemLocation} onChange={(loc) => { setNewItemLocation(loc); if (loc) setTimeout(() => addQualityRef.current?.focus(), 0); }} inputRef={addLocationRef} />
              <div>
                <label className="field-lbl">Quality (0–1000)</label>
                <input
                  className="field-in mono"
                  type="number"
                  min="0" max="1000" step="1"
                  ref={addQualityRef}
                  value={newItemQuality}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setNewItemQuality(''); return; }
                    const num = parseFloat(raw);
                    if (!Number.isNaN(num)) setNewItemQuality(Math.min(1000, Math.max(0, num)));
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); addNotesRef.current?.focus(); } }}
                />
              </div>
              <div>
                <label className="field-lbl">Notes</label>
                <textarea
                  className="field-in"
                  ref={addNotesRef}
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && addReady) { e.preventDefault(); handleCreateInventoryItem({ stayOpen: true }); } }}
                  placeholder="Optional note…"
                />
              </div>
              <p className="act-note">Tip: Ctrl/Cmd + Enter to add and keep open for rapid entry.</p>
            </div>
            {/* Right: catalog list */}
            <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="catalog-right" style={{ padding: 0 }}>
                <div className="cr-head">
                  <span className="lbl">Catalog items</span>
                  {catalogLoading
                    ? <LinearProgress sx={{ flex: 1, height: 3, borderRadius: 1 }} />
                    : <span className="cnt">{catalogTotal.toLocaleString()} items</span>}
                </div>
                {catalogLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
                ) : catalogItems.length === 0 ? (
                  <p className="act-note">No catalog items found with these filters.</p>
                ) : (
                  <div className="cat-list" onKeyDown={handleCatalogListKeyDown}>
                    {catalogItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={'cat-opt' + (selectedCatalogItem?.id === item.id ? ' sel' : '')}
                        role="option"
                        aria-selected={selectedCatalogItem?.id === item.id}
                        tabIndex={0}
                        onClick={() => { setSelectedCatalogItem(item); setCatalogError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCatalogItem(item); setCatalogError(null); } }}
                        ref={(el) => { catalogItemRefs.current[index] = el; if (index === 0) firstCatalogItemRef.current = el; }}
                      >
                        <span className="radio" />
                        <div>
                          <div className="nm">{item.name}</div>
                          <div className="ct">{item.categoryPath || 'Uncategorized'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <TablePagination
                  component="div"
                  count={catalogTotal}
                  page={catalogPage}
                  onPageChange={(_, newPage) => setCatalogPage(newPage)}
                  rowsPerPage={catalogRowsPerPage}
                  onRowsPerPageChange={(event) => { setCatalogRowsPerPage(parseInt(event.target.value, 10)); setCatalogPage(0); }}
                  rowsPerPageOptions={[25, 50]}
                  sx={{ mt: 'auto' }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--border-subtle)', gap: 1, p: 2 }}>
          <button className="btn btn-ghost btn-sm" onClick={closeAddDialog} disabled={addSubmitting}>Cancel</button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleCreateInventoryItem({ stayOpen: true })} disabled={addSubmitting || !addReady}>Add &amp; stay</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleCreateInventoryItem()} disabled={addSubmitting || !addReady}>Add &amp; close</button>
        </DialogActions>
      </Dialog>

      {/* Row action menu */}
      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={closeActionMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        PaperProps={{ sx: { background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' } }}
      >
        <MenuItem onClick={() => openActionDialog('edit')}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openActionDialog('split')}>
          <ListItemIcon><CallSplitIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Split</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openActionDialog('delete')}>
          <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {renderActionDialog()}

      <InventoryItemDrawer
        open={selectedDrawerGroup !== null}
        group={selectedDrawerGroup}
        onClose={() => setSelectedDrawerGroup(null)}
        onMutated={fetchInventory}
      />
    </AppShell>
  );
};

export default InventoryPage;
