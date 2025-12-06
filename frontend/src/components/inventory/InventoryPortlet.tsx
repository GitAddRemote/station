import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  TextField,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Typography,
  Chip,
} from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import InventoryIcon from '@mui/icons-material/Inventory';
import {
  inventoryService,
  InventoryItem,
  InventoryCategory,
  InventorySearchParams,
} from '../../services/inventory.service';

interface InventoryPortletProps {
  gameId?: number;
  onExpand?: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const InventoryPortlet = ({ gameId = 1, onExpand }: InventoryPortletProps) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await inventoryService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories', error);
      }
    };

    loadCategories();
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const params: InventorySearchParams = {
        gameId,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: debouncedSearch || undefined,
        sharedOnly,
        categoryId: typeof categoryId === 'number' ? categoryId : undefined,
      };

      const { items: fetchedItems, total } = await inventoryService.getInventory(
        params,
      );

      setItems(fetchedItems);
      setTotalCount(total ?? fetchedItems.length);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [gameId, debouncedSearch, sharedOnly, page, rowsPerPage, categoryId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, sharedOnly, categoryId]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.5,
              borderRadius: '8px',
              background: 'rgba(74, 158, 255, 0.1)',
            }}
          >
            <InventoryIcon sx={{ fontSize: 24, color: '#4A9EFF' }} />
          </Box>
        }
        title={
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            My Inventory
          </Typography>
        }
        action={
          onExpand && (
            <IconButton onClick={onExpand} size="small">
              <OpenInFullIcon />
            </IconButton>
          )
        }
      />
      <CardContent sx={{ flexGrow: 1, pt: 0 }}>
        {/* Search and Filters */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="inventory-category-label">Category</InputLabel>
            <Select
              labelId="inventory-category-label"
              label="Category"
              value={categoryId}
              onChange={(e) =>
                setCategoryId(
                  e.target.value === '' ? '' : Number(e.target.value),
                )
              }
            >
              <MenuItem value="">
                <em>All categories</em>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={sharedOnly}
                onChange={(e) => setSharedOnly(e.target.checked)}
                size="small"
              />
            }
            label="Shared only"
          />
        </Box>

        {/* Items Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {search
                ? 'No items found matching your search'
                : 'No inventory items yet'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.itemName || `Item #${item.uexItemId}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.categoryName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.quantity.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.locationName || `Location #${item.locationId}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.sharedOrgId ? (
                          <Chip
                            label={item.sharedOrgName || 'Shared'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Chip label="Private" size="small" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryPortlet;
