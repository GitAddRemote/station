import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import {
  Typography,
  Container,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  TablePagination,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../services/api.service';
import {
  inventoryService,
  InventoryCategory,
  OrgInventoryItemV2,
  OrgInventorySummary,
} from '../services/inventory.service';
import { permissionsService } from '../services/permissions.service';
import { useDebounce } from '../hooks/useDebounce';

interface OrgOption {
  id: string;
  name: string;
}

type OwnershipFilter = 'all' | 'org-owned' | 'member-contributed';

const ROWS_PER_PAGE = 50;

const OrgInventoryPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [items, setItems] = useState<OrgInventoryItemV2[]>([]);
  const [summary, setSummary] = useState<OrgInventorySummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [canManage, setCanManage] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const permFetchedForOrg = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser({ userId: response.data.userId, username: response.data.username });
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const fetchOrgs = useCallback(async (userId: string) => {
    try {
      const memberships = await inventoryService.getUserOrganizations(userId);
      const mapped: OrgOption[] = memberships
        .filter((m) => m.organization)
        .map((m) => ({
          id: m.organization!.id,
          name: m.organization!.name,
        }))
        .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);
      setOrgs(mapped);
      if (mapped.length > 0 && selectedOrgId === null) {
        setSelectedOrgId(mapped[0].id);
      }
    } catch (err) {
      console.error('Failed to load organizations', err);
    }
  }, [selectedOrgId]);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await inventoryService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    if (!selectedOrgId) {
      setItems([]);
      setTotal(0);
      setSummary(null);
      return;
    }

    try {
      setError(null);
      if (initialLoading) {
        setInitialLoading(true);
      } else {
        setLoading(true);
      }

      const baseParams = {
        orgId: selectedOrgId,
        ownerType: 'org' as const,
        ownerId: selectedOrgId,
        categoryId: categoryId || undefined,
        search: debouncedSearch || undefined,
        page: page + 1,
        limit: ROWS_PER_PAGE,
        includeSummary: true,
      };

      if (ownershipFilter === 'org-owned') {
        const result = await inventoryService.listOrgInventory({
          ...baseParams,
          ownerType: 'org',
          ownerId: selectedOrgId,
        });
        setItems(result.data);
        setTotal(result.total);
        setSummary(result.summary ?? null);
      } else if (ownershipFilter === 'member-contributed') {
        const result = await inventoryService.listOrgInventory({
          ownerType: 'user',
          orgId: selectedOrgId,
          orgAvailable: true,
          categoryId: categoryId || undefined,
          search: debouncedSearch || undefined,
          page: page + 1,
          limit: ROWS_PER_PAGE,
          includeSummary: true,
        });
        setItems(result.data);
        setTotal(result.total);
        setSummary(result.summary ?? null);
      } else {
        const [orgResult, memberResult] = await Promise.all([
          inventoryService.listOrgInventory({
            ownerType: 'org',
            ownerId: selectedOrgId,
            categoryId: categoryId || undefined,
            search: debouncedSearch || undefined,
            page: page + 1,
            limit: ROWS_PER_PAGE,
            includeSummary: true,
          }),
          inventoryService.listOrgInventory({
            ownerType: 'user',
            orgId: selectedOrgId,
            orgAvailable: true,
            categoryId: categoryId || undefined,
            search: debouncedSearch || undefined,
            page: 1,
            limit: ROWS_PER_PAGE,
          }),
        ]);
        setItems([...orgResult.data, ...memberResult.data]);
        setTotal(orgResult.total + memberResult.total);
        setSummary(orgResult.summary ?? null);
      }
    } catch (err) {
      console.error('Failed to load org inventory', err);
      setError('Unable to load org inventory right now.');
      setItems([]);
      setTotal(0);
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }, [
    selectedOrgId,
    ownershipFilter,
    categoryId,
    debouncedSearch,
    page,
    initialLoading,
  ]);

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, [fetchProfile, fetchCategories]);

  useEffect(() => {
    if (user?.userId) {
      fetchOrgs(user.userId);
    }
  }, [user, fetchOrgs]);

  useEffect(() => {
    if (!selectedOrgId || !user?.userId) {
      setCanManage(false);
      return;
    }
    if (permFetchedForOrg.current === selectedOrgId) return;
    let isMounted = true;
    setPermissionsLoading(true);
    permissionsService
      .getUserPermissions(user.userId, selectedOrgId)
      .then((perms) => {
        if (!isMounted) return;
        setCanManage(perms.includes('canManageInventory' as never));
        permFetchedForOrg.current = selectedOrgId;
      })
      .catch(() => {
        if (isMounted) setCanManage(false);
      })
      .finally(() => {
        if (isMounted) setPermissionsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedOrgId, user?.userId]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchInventory();
    }
  }, [selectedOrgId, fetchInventory]);

  useEffect(() => {
    setPage(0);
  }, [ownershipFilter, categoryId, debouncedSearch, selectedOrgId]);

  const orgOwned = useMemo(
    () => items.filter((i) => i.ownerType === 'org'),
    [items],
  );

  const memberContributed = useMemo(
    () => items.filter((i) => i.ownerType === 'user'),
    [items],
  );

  const handleOrgChange = (orgId: string) => {
    const org = orgs.find((o) => o.id === orgId);
    if (!org) return;
    setSelectedOrgId(org.id);
    permFetchedForOrg.current = null;
    setPage(0);
  };

  const renderItemTable = (rows: OrgInventoryItemV2[], label: string, color?: string) => (
    <Box mb={3}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>
          {label}
        </Typography>
        <Chip label={rows.length} size="small" variant="outlined" />
      </Stack>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No items.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((item) => {
                const isDiscrete = item.catalogKind === 'item' || item.catalogKind === 'vehicle';
                const qty = Number(item.quantity).toLocaleString(undefined, {
                  maximumFractionDigits: isDiscrete ? 0 : 6,
                });
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.itemName}
                      </Typography>
                      {item.alias && (
                        <Typography variant="caption" color="text.secondary">
                          {item.alias}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={item.categoryPath} placement="top">
                        <Typography variant="body2">{item.categoryName}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {qty}{' '}
                        <Typography component="span" variant="caption" color="text.secondary">
                          {item.unitOfMeasureCode}
                        </Typography>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={item.locationName ? 'text.primary' : 'text.secondary'}>
                        {item.locationName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  return (
    <AppShell
      active="inventory"
      userInitial={user?.username?.[0]?.toUpperCase() || 'U'}
      searchPlaceholder="Search org inventory…"
    >
      <Container maxWidth="xl" sx={{ py: 0 }}>
        {/* Org + filter controls */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} mb={3} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Organization</InputLabel>
            <Select
              label="Organization"
              value={selectedOrgId ?? ''}
              onChange={(e) => handleOrgChange(String(e.target.value))}
              data-testid="org-select"
            >
              {orgs.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Ownership</InputLabel>
            <Select
              label="Ownership"
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value as OwnershipFilter)}
              data-testid="ownership-filter"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="org-owned">Org-Owned</MenuItem>
              <MenuItem value="member-contributed">Member-Contributed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              data-testid="category-filter"
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {'  '.repeat((cat.depth ?? 0) > 0 ? (cat.depth ?? 0) - 1 : 0)}{cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            data-testid="search-input"
          />

          {!canManage && !permissionsLoading && selectedOrgId && (
            <Chip label="Read-only" size="small" variant="outlined" color="default" />
          )}
        </Stack>

        {/* Summary cards */}
        {summary && (
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Total Items</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{summary.totalItems.toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Total Quantity</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {Number(summary.totalQuantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {summary.byCategory.slice(0, 2).map((cat) => (
              <Grid key={cat.categoryId} item xs={6} sm={3}>
                <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary" noWrap>{cat.categoryName}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {Number(cat.totalQuantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Body */}
        {!selectedOrgId && !initialLoading && (
          <Alert severity="info">Select an organization to view its inventory.</Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {initialLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

            {ownershipFilter === 'all' ? (
              <>
                {renderItemTable(orgOwned, 'Org-Owned', '#f2a255')}
                <Divider sx={{ my: 2 }} />
                {renderItemTable(memberContributed, 'Member-Contributed', '#4A9EFF')}
              </>
            ) : ownershipFilter === 'org-owned' ? (
              renderItemTable(items, 'Org-Owned', '#f2a255')
            ) : (
              renderItemTable(items, 'Member-Contributed', '#4A9EFF')
            )}

            {total > ROWS_PER_PAGE && (
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={ROWS_PER_PAGE}
                rowsPerPageOptions={[ROWS_PER_PAGE]}
                sx={{ mt: 1 }}
              />
            )}

            {!loading && !initialLoading && items.length === 0 && selectedOrgId && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <InventoryIcon sx={{ fontSize: 42, color: '#4A9EFF', mb: 1 }} />
                <Typography variant="h6">No inventory found</Typography>
                <Typography color="text.secondary">
                  {ownershipFilter !== 'all'
                    ? 'Try changing the ownership filter or clearing search.'
                    : 'This organization has no inventory yet.'}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Container>
    </AppShell>
  );
};

export default OrgInventoryPage;
