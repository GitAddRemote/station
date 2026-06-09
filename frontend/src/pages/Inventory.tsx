import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  LinearProgress,
  Alert,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InventoryIcon from '@mui/icons-material/Inventory';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ShareIcon from '@mui/icons-material/Share';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import BusinessIcon from '@mui/icons-material/Business';
import {
  inventoryService,
  InventoryCategory,
  InventoryItem,
  OrgInventoryItem,
} from '../services/inventory.service';
import { catalogService, CatalogEntryDto, LocationDto } from '../services/catalog.service';
import LocationPicker from '../components/inventory/LocationPicker';
import { useDebounce } from '../hooks/useDebounce';
import { useFocusController } from '../hooks/useFocusController';
import InventoryInlineRow from '../components/inventory/InventoryInlineRow';
import InventoryNewRow from '../components/inventory/InventoryNewRow';
import InventoryFiltersPanel from '../components/inventory/InventoryFiltersPanel';
import {
  OrgPermission,
  permissionsService,
} from '../services/permissions.service';
import { API_URL } from '../config/api';

type InventoryRecord = InventoryItem | OrgInventoryItem;
type ActionMode = 'edit' | 'split' | 'share' | 'delete' | null;
type InlineDraft = { quantity: number | '' };

const EDITOR_MODE_QUANTITY_MAX = 999999.999999;
const MIN_INVENTORY_QUANTITY = 0.000001;
const ORG_ACCENT = '#f2a255';
const VIEW_MODE_STORAGE_KEY = 'inventory:viewMode';
const ORG_ID_STORAGE_KEY = 'inventory:selectedOrgId';
const DENSITY_STORAGE_KEY = 'inventory:density';

const readStoredViewMode = (): 'personal' | 'org' => {
  if (typeof window === 'undefined') return 'personal';
  const stored = window.sessionStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === 'org' ? 'org' : 'personal';
};

const readStoredOrgId = (): number | null => {
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(ORG_ID_STORAGE_KEY);
  if (!stored) return null;
  const parsed = Number.parseInt(stored, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const readStoredDensity = (): 'standard' | 'compact' => {
  if (typeof window === 'undefined') return 'standard';
  const stored = window.sessionStorage.getItem(DENSITY_STORAGE_KEY);
  return stored === 'compact' ? 'compact' : 'standard';
};

const valueText = (value: number) =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} qty`;


const InventoryPage = () => {
  const navigate = useNavigate();
  const addSearchRef = useRef<HTMLInputElement | null>(null);
  const firstCatalogItemRef = useRef<HTMLDivElement | null>(null);
  const catalogItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [user, setUser] = useState<{ userId: number; username: string } | null>(
    null,
  );
  const [orgOptions, setOrgOptions] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [allOrgOptions, setAllOrgOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const orgsLoaded = useRef(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(() =>
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
  const [shareOrgId, setShareOrgId] = useState<number | ''>('');
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
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemLocation, setNewItemLocation] = useState<LocationDto | null>(null);
  const [newItemQuality, setNewItemQuality] = useState<number | ''>('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [orgPermissions, setOrgPermissions] = useState<OrgPermission[]>([]);
  const [orgPermissionsLoading, setOrgPermissionsLoading] = useState(false);
  const [orgPermissionsError, setOrgPermissionsError] = useState<string | null>(
    null,
  );
  const permissionsFetchedForOrgId = useRef<number | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    categoryId: '' as string | '',
    sharedOnly: false,
    valueRange: [0, 999999.999999] as [number, number],
  });
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'share'>(
    'none',
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [density, setDensity] = useState<'standard' | 'compact'>(() =>
    readStoredDensity(),
  );
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
    field: 'quantity';
  } | null>(null);
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
    if (!orgsLoaded.current || selectedOrgId === null) return;
    const isValidOrg = orgOptions.some((org) => org.id === selectedOrgId);
    if (!isValidOrg) {
      setSelectedOrgId(null);
      if (viewMode === 'org') {
        setViewMode('personal');
      }
    }
  }, [orgOptions, selectedOrgId, viewMode]);

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
  const focusController = useFocusController<string, 'quantity' | 'save'>({
    fieldOrder: useMemo(() => ['quantity', 'save'] as const, []),
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
  const saveRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const newRowItemRef = useRef<HTMLInputElement | null>(null);
  const newRowQuantityRef = useRef<HTMLInputElement | null>(null);
  const newRowSaveRef = useRef<HTMLButtonElement | null>(null);
  const newRowItemCache = useRef<Map<string, CatalogEntryDto[]>>(new Map());

  const activateInlineField = useCallback(
    (rowKey: string, field: 'quantity') => {
      setInlineActiveField({ rowKey, field });
      setInlineError((prev) => ({ ...prev, [rowKey]: null }));
    },
    [],
  );
  const handleInlineDraftChange = useCallback(
    (itemId: string, changes: Partial<{ quantity: number | '' }>) => {
      setInlineDrafts((prev) => ({
        ...prev,
        [itemId]: {
          quantity:
            changes.quantity === undefined
              ? (prev[itemId]?.quantity ?? 0)
              : (changes.quantity as number | ''),
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
  const handleQuantityRef = useCallback(
    (ref: HTMLInputElement | null, key: string) => {
      quantityRefs.current[key] = ref;
    },
    [],
  );
  const handleSaveRef = useCallback(
    (ref: HTMLButtonElement | null, key: string) => {
      saveRefs.current[key] = ref;
    },
    [],
  );

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      navigate('/login');
    }
  };

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
      const response = await fetch(`${API_URL}/users/profile`, {
        credentials: 'include',
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

  const fetchOrganizations = useCallback(async (userId: number) => {
    try {
      const orgs = await inventoryService.getUserOrganizations(userId);
      const mapped = orgs.map((entry) => ({
        id: entry.organization?.id ?? entry.organizationId,
        name: entry.organization?.name ?? `Org #${entry.organizationId}`,
      }));
      setAllOrgOptions(mapped);
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
      ).filter((org): org is { id: number; name: string } => org !== null);
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
          orgAvailable: filters.sharedOnly || undefined,
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
    filters.sharedOnly,
    debouncedSearch,
    page,
    rowsPerPage,
    initialLoading,
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
          const uoms = await inventoryService.getUnitsOfMeasure();
          const defaultUom = uoms.find((u) => u.code === 'unit') ?? uoms[0];
          await inventoryService.createItem({
            catalogEntryId: selectedCatalogItem.id,
            quantity: newItemQuantity,
            unitOfMeasureId: defaultUom.id,
            notes: newItemNotes || null,
            locationId: newItemLocation?.id ?? null,
            quality: newItemQuality !== '' ? newItemQuality : null,
          });
        } else {
          setCatalogError('This item already exists in the org inventory.');
          return;
        }
      } else {
        const uoms = await inventoryService.getUnitsOfMeasure();
        const defaultUom = uoms.find((u) => u.code === 'unit') ?? uoms[0];
        if (isOrgView && selectedOrgId !== null) {
          await inventoryService.createOrgItem(selectedOrgId, {
            catalogEntryId: selectedCatalogItem.id,
            quantity: newItemQuantity,
            unitOfMeasureId: defaultUom.id,
            notes: newItemNotes || null,
            locationId: newItemLocation?.id ?? null,
            quality: newItemQuality !== '' ? newItemQuality : null,
          });
        } else {
          await inventoryService.createItem({
            catalogEntryId: selectedCatalogItem.id,
            quantity: newItemQuantity,
            unitOfMeasureId: defaultUom.id,
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
    filters.sharedOnly,
    filters.valueRange,
    viewMode,
    selectedOrgId,
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

  useEffect(() => {
    if (!items.length) {
      setInlineDrafts({});
      return;
    }
    setInlineDrafts(
      items.reduce<Record<string, { quantity: number }>>((acc, item) => {
        acc[item.id] = {
          quantity: Number(item.quantity) || 0,
        };
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
      } else if (groupBy === 'share') {
        key = item.isOrgAvailable ? 'Shared' : 'Private';
      }

      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    });

    return groups;
  }, [groupBy, filteredItems]);

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
      const uoms = await inventoryService.getUnitsOfMeasure();
      const defaultUom = uoms.find((u) => u.code === 'unit') ?? uoms[0];
      const payload = {
        catalogEntryId: selectedItemId!,
        quantity: parsedQuantity,
        unitOfMeasureId: defaultUom.id,
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
    const { rowKey } = inlineActiveField;
    const ref = quantityRefs.current[rowKey];
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
      const prevItem =
        items.find((entry) => entry.id === item.id) ??
        ({
          ...item,
        } as InventoryRecord);
      const updatedItem: InventoryRecord = {
        ...item,
        quantity: parsedQuantity,
      };
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? updatedItem : entry)),
      );

      try {
        if (viewMode === 'org' && selectedOrgId) {
          await inventoryService.updateOrgItem(selectedOrgId, item.id, {
            quantity: parsedQuantity,
          });
        } else {
          await inventoryService.updateItem(item.id, {
            quantity: parsedQuantity,
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
    [focusController, getInlineDraft, inlineSaving, items, selectedOrgId, viewMode],
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
    if (mode === 'share') {
      setShareOrgId('');
    }
  };

  const handleUpdateItem = async (payload: {
    quantity?: number;
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

  const handleShare = async () => {
    setError('Sharing is not yet supported in this version.');
  };

  const handleUnshare = async () => {
    setError('Unshare is not yet supported in this version.');
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
                inputProps={{ min: 0, step: 0.000001 }}
                onChange={(e) => setActionQuantity(Number(e.target.value))}
              />
              <LocationPicker
                value={editLocation}
                onChange={setEditLocation}
              />
              {actionItem.catalogKind === 'commodity' && (
                <TextField
                  label="Quality"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                  value={editQuality}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setEditQuality('');
                      return;
                    }
                    const num = parseFloat(raw);
                    if (!Number.isNaN(num)) {
                      setEditQuality(Math.min(10, Math.max(0, num)));
                    }
                  }}
                />
              )}
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
                  {allOrgOptions.map((org) => (
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
                  disabled={actionWorking || shareOrgId === ''}
                  onClick={() =>
                    typeof shareOrgId === 'number' &&
                    handleShare()
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

  const inventoryBusy = refreshing;
  const showEmptyState = filteredItems.length === 0 && !refreshing;
  const renderInlineRow = (item: InventoryRecord) => {
    const rowKey = item.id.toString();
    const draft = getInlineDraft(item);
    const originalQuantity = Number(item.quantity) || 0;
    const draftQuantityNumber = Number(draft.quantity);
    const isDirty = draftQuantityNumber !== originalQuantity;
    const isRowActive = inlineActiveField?.rowKey === rowKey;
    const isQuantityActive =
      isRowActive && inlineActiveField?.field === 'quantity';
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
        onActivateField={activateInlineField}
        onSave={handleInlineSaveAndAdvance}
        onOpenActions={handleActionOpen}
        setQuantityRef={handleQuantityRef}
        setSaveRef={handleSaveRef}
      />
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#0b1118' }}>
      <AppBar
        position="sticky"
        color="transparent"
        sx={{
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
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

      {isOrgMode && (
        <Box
          sx={{
            background: 'rgba(242, 162, 85, 0.12)',
            borderBottom: '1px solid rgba(242, 162, 85, 0.35)',
            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.2)',
          }}
        >
          <Container maxWidth="xl" sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <BusinessIcon sx={{ color: ORG_ACCENT }} fontSize="small" />
              <Typography
                variant="subtitle2"
                sx={{ color: '#f7f1e8', fontWeight: 600 }}
              >
                Organization mode
              </Typography>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: 'rgba(242, 162, 85, 0.35)' }}
              />
              <Typography variant="body2" sx={{ color: '#f0d9c0' }}>
                {selectedOrgId
                  ? `Working in ${selectedOrgName}`
                  : 'Select an organization to continue.'}
              </Typography>
            </Stack>
          </Container>
        </Box>
      )}

      <Container
        maxWidth="xl"
        sx={{
          py: 4,
          mt: isOrgMode ? 2 : 0,
          outline: isOrgMode ? '1px solid rgba(242, 162, 85, 0.35)' : 'none',
          outlineOffset: isOrgMode ? 0 : undefined,
          borderRadius: isOrgMode ? 3 : undefined,
          boxShadow: isOrgMode
            ? '0 0 0 1px rgba(242, 162, 85, 0.08), 0 0 24px rgba(242, 162, 85, 0.08)'
            : 'none',
          position: 'relative',
        }}
        aria-busy={inventoryBusy}
      >
        {inventoryBusy && (
          <Box
            role="status"
            aria-live="polite"
            aria-atomic="true"
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(11, 17, 24, 0.65)',
              backdropFilter: 'blur(2px)',
              borderRadius: isOrgMode ? 3 : 0,
            }}
          >
            <Stack spacing={1} alignItems="center">
              <CircularProgress color="inherit" size={28} />
              <Typography variant="body2" color="text.secondary">
                Loading inventory...
              </Typography>
            </Stack>
          </Box>
        )}
        <Box sx={{ pointerEvents: inventoryBusy ? 'none' : 'auto' }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card
                sx={{
                  background:
                    'linear-gradient(120deg, #0f1724 0%, #0f1b2c 50%, #0c1220 100%)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <CardContent>
                  <InventoryFiltersPanel
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                    valueText={valueText}
                    maxQuantity={maxQuantity}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    setSortBy={(value) => setSortBy(value)}
                    setSortDir={(updater) => setSortDir(updater)}
                    groupBy={groupBy}
                    setGroupBy={(value) => setGroupBy(value)}
                    density={density}
                    setDensity={(value) => setDensity(value)}
                    viewMode={viewMode}
                    setViewMode={(mode) => setViewMode(mode)}
                    selectedOrgId={selectedOrgId}
                    setSelectedOrgId={(value) => setSelectedOrgId(value)}
                    orgOptions={orgOptions}
                    userInitial={user?.username?.charAt(0).toUpperCase() || 'U'}
                    onOpenAddDialog={openAddDialog}
                    showAddButton={showAddButton}
                    addButtonLabel={addButtonLabel}
                    totalCount={totalCount}
                    itemCount={items.length}
                    autoFocusSearch
                    disabled={inventoryBusy}
                  />
                  {orgPermissionsError && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      {orgPermissionsError}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card
                sx={{
                  backgroundColor: '#0e1520',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
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
                  {!showEmptyState && (
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
                  )}
                  {isEditorMode && (
                    <>
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
                            gridTemplateColumns: {
                              xs: '1fr',
                              md: '2fr 1fr 1.5fr 1fr 1fr auto',
                            },
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
                          setNewRowErrors((prev) => ({
                            ...prev,
                            item: null,
                            api: null,
                          }));
                        }}
                        selectedLocation={newRowSelectedLocation}
                        onLocationChange={setNewRowSelectedLocation}
                        quality={newRowQuality}
                        onQualityChange={setNewRowQuality}
                        onItemSelect={(value) => {
                          setNewRowSelectedItem(value);
                          setNewRowDraft((prev) => ({
                            ...prev,
                            itemId: value ? value.id : '',
                          }));
                          setNewRowItemInput(value?.name ?? newRowItemInput);
                          setNewRowErrors((prev) => ({
                            ...prev,
                            item: null,
                            api: null,
                          }));
                          if (value) {
                            newRowFocusController.focus('new-row', 'quantity');
                          }
                        }}
                        onQuantityChange={(value) => {
                          const raw = value.trim();
                          if (raw === '') {
                            setNewRowDraft((prev) => ({
                              ...prev,
                              quantity: '',
                            }));
                            setNewRowErrors((prev) => ({
                              ...prev,
                              quantity: 'Quantity is required',
                              api: null,
                            }));
                            return;
                          }
                          const numeric = Number(raw);
                          const nextQuantity = Number.isNaN(numeric)
                            ? ''
                            : Math.min(numeric, EDITOR_MODE_QUANTITY_MAX);
                          setNewRowDraft((prev) => ({
                            ...prev,
                            quantity: nextQuantity,
                          }));
                          if (
                            !Number.isFinite(numeric) ||
                            numeric < MIN_INVENTORY_QUANTITY
                          ) {
                            setNewRowErrors((prev) => ({
                              ...prev,
                              quantity: 'Quantity must be at least 0.000001',
                              api: null,
                            }));
                          } else {
                            setNewRowErrors((prev) => ({
                              ...prev,
                              quantity: null,
                              api: null,
                            }));
                          }
                        }}
                        onQuantityEnter={() =>
                          newRowFocusController.focus('new-row', 'save')
                        }
                        onSave={handleNewRowSave}
                        onRetry={handleNewRowSave}
                        itemRef={newRowItemRef}
                        quantityRef={newRowQuantityRef}
                        saveRef={newRowSaveRef}
                      />
                    </>
                  )}
                  {showEmptyState ? (
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
                      <Stack spacing={2}>
                        {Array.from(groupedItems.entries()).map(
                          ([group, groupItems]) => (
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
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  <Chip
                                    size="small"
                                    label={group}
                                    color="primary"
                                    variant="outlined"
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {groupItems.length} item
                                    {groupItems.length === 1 ? '' : 's'}
                                  </Typography>
                                </Stack>
                              </Box>
                              <Divider
                                sx={{ borderColor: 'rgba(255,255,255,0.04)' }}
                              />
                              <Stack
                                divider={
                                  <Divider
                                    flexItem
                                    sx={{
                                      borderColor: 'rgba(255,255,255,0.04)',
                                    }}
                                  />
                                }
                              >
                                {groupItems.map((item) =>
                                  renderInlineRow(item),
                                )}
                              </Stack>
                            </Box>
                          ),
                        )}
                      </Stack>
                      <TablePagination
                        component="div"
                        count={totalCount}
                        page={page}
                        onPageChange={(_, newPage) => {
                          if (inventoryBusy) return;
                          setPage(newPage);
                        }}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(event) => {
                          if (inventoryBusy) return;
                          setRowsPerPage(parseInt(event.target.value, 10));
                          setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50, 100, 250]}
                        backIconButtonProps={{ disabled: inventoryBusy }}
                        nextIconButtonProps={{ disabled: inventoryBusy }}
                        SelectProps={{ disabled: inventoryBusy }}
                        sx={{ mt: 2 }}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>

      <Dialog
        open={addDialogOpen}
        onClose={closeAddDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {viewMode === 'org'
            ? `Add org inventory item · ${selectedOrgName}`
            : 'Quick add inventory item'}
        </DialogTitle>
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
                      <InputLabel id="catalog-category-label">
                        Category
                      </InputLabel>
                      <Select
                        labelId="catalog-category-label"
                        label="Category"
                        value={catalogCategoryId}
                        onChange={(e) =>
                          setCatalogCategoryId(e.target.value as string)
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
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          fullWidth
                          label="Quantity"
                          type="number"
                          inputProps={{ min: 0.000001, step: 0.000001 }}
                          value={newItemQuantity}
                          onChange={(e) =>
                            setNewItemQuantity(Number(e.target.value))
                          }
                        />
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setNewItemQuantity((qty) =>
                                Number(Math.max(0.000001, qty - 1).toFixed(6)),
                              )
                            }
                          >
                            -1
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setNewItemQuantity((qty) =>
                                Number(Math.max(0.000001, qty + 1).toFixed(6)),
                              )
                            }
                          >
                            +1
                          </Button>
                        </Stack>
                      </Stack>
                      <LocationPicker
                        value={newItemLocation}
                        onChange={setNewItemLocation}
                      />
                      {selectedCatalogItem?.catalogKind === 'commodity' && (
                        <TextField
                          fullWidth
                          label="Quality"
                          type="number"
                          inputProps={{ min: 0, max: 10, step: 0.1 }}
                          value={newItemQuality}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setNewItemQuality('');
                              return;
                            }
                            const num = parseFloat(raw);
                            if (!Number.isNaN(num)) {
                              setNewItemQuality(Math.min(10, Math.max(0, num)));
                            }
                          }}
                        />
                      )}
                      <TextField
                        fullWidth
                        label="Notes"
                        value={newItemNotes}
                        onChange={(e) => setNewItemNotes(e.target.value)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Tip: Ctrl/Cmd + Enter to add and keep this dialog open
                        for rapid entry.
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
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Catalog results
                    </Typography>
                    {catalogLoading ? (
                      <LinearProgress
                        sx={{ flex: 1, height: 4, borderRadius: 1 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {catalogTotal.toLocaleString()} items
                      </Typography>
                    )}
                  </Stack>
                  {catalogLoading ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
                    >
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
                            <Radio
                              checked={selectedCatalogItem?.id === item.id}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={item.name}
                            secondary={item.categoryPath || 'Uncategorized'}
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
                    rowsPerPageOptions={[25, 50]}
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
        {viewMode === 'personal' && actionItem?.isOrgAvailable && (
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
