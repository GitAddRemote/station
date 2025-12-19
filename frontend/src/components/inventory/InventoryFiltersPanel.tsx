import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import SortIcon from '@mui/icons-material/Sort';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ApartmentIcon from '@mui/icons-material/Apartment';
import type { InventoryCategory } from '../../services/inventory.service';

interface FiltersPanelProps {
  filters: {
    search: string;
    categoryId: number | '';
    locationId: number | '';
    sharedOnly: boolean;
    valueRange: [number, number];
  };
  setFilters: (
    updater:
      | FiltersPanelProps['filters']
      | ((prev: FiltersPanelProps['filters']) => FiltersPanelProps['filters']),
  ) => void;
  categories: InventoryCategory[];
  locationOptions: { id: number; name: string }[];
  valueText: (value: number) => string;
  maxQuantity: number;
  sortBy: 'name' | 'quantity' | 'location' | 'date';
  sortDir: 'asc' | 'desc';
  setSortBy: (value: 'name' | 'quantity' | 'location' | 'date') => void;
  setSortDir: (updater: (prev: 'asc' | 'desc') => 'asc' | 'desc') => void;
  groupBy: 'none' | 'category' | 'location' | 'share';
  setGroupBy: (value: 'none' | 'category' | 'location' | 'share') => void;
  density: 'standard' | 'compact';
  setDensity: (value: 'standard' | 'compact') => void;
  viewMode: 'personal' | 'org';
  setViewMode: (mode: 'personal' | 'org') => void;
  selectedOrgId: number | null;
  setSelectedOrgId: (value: number | null) => void;
  orgOptions: { id: number; name: string }[];
  userInitial: string;
  onOpenAddDialog: () => void;
  showAddButton: boolean;
  totalCount: number;
  itemCount: number;
}

export const InventoryFiltersPanel = ({
  filters,
  setFilters,
  categories,
  locationOptions,
  valueText,
  maxQuantity,
  sortBy,
  sortDir,
  setSortBy,
  setSortDir,
  groupBy,
  setGroupBy,
  density,
  setDensity,
  viewMode,
  setViewMode,
  selectedOrgId,
  setSelectedOrgId,
  orgOptions,
  userInitial,
  onOpenAddDialog,
  showAddButton,
  totalCount,
  itemCount,
}: FiltersPanelProps) => {
  return (
    <>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4} lg={3}>
          <TextField
            fullWidth
            label="Search by name, note, or location"
            placeholder="Prospector, Lorville, armors..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
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
                  categoryId: e.target.value === '' ? '' : Number(e.target.value),
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
                  locationId: e.target.value === '' ? '' : Number(e.target.value),
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
                  <Avatar sx={{ width: 24, height: 24 }}>{userInitial}</Avatar>
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

      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 1, color: '#9aa0a6' }}>
        <ViewAgendaIcon fontSize="small" />
        Showing {itemCount.toLocaleString()} of {totalCount.toLocaleString()} items
      </Typography>

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
            onClick={() => setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))}
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
              onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'location' | 'date')}
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
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'category' | 'location' | 'share')}
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
              onChange={(e) => setDensity(e.target.value as 'standard' | 'compact')}
            >
              <MenuItem value="standard">Standard</MenuItem>
              <MenuItem value="compact">Editor Mode</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {showAddButton && (
          <Grid item>
            <Button variant="contained" onClick={onOpenAddDialog}>
              Add item
            </Button>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default InventoryFiltersPanel;
