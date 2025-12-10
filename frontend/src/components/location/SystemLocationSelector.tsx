import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { locationService, LocationRecord } from '../../services/location.service';
import { StarSystem, uexService } from '../../services/uex.service';
import { useDebounce } from '../../hooks/useDebounce';

export interface SystemLocationValue {
  systemId: number | '';
  locationId: number | '';
}

interface SystemLocationSelectorProps {
  gameId?: number;
  value: SystemLocationValue;
  onChange: (value: SystemLocationValue) => void;
  disabled?: boolean;
}

const SystemLocationSelector = ({
  gameId = 1,
  value,
  onChange,
  disabled,
}: SystemLocationSelectorProps) => {
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(locationSearch, 300);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        setLoading(true);
        const [systemData, locationData] = await Promise.all([
          uexService.getStarSystems(),
          locationService.searchLocations({ gameId, limit: 1000 }),
        ]);
        setSystems(systemData);
        setLocations(locationData);

        if (!value.systemId && systemData.length > 0) {
          onChange({ systemId: systemData[0].id, locationId: '' });
        }
      } catch (err) {
        console.error('Failed to load systems or locations', err);
        setError('Unable to load systems or locations.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [gameId, onChange]);

  const handleSystemChange = (systemId: number) => {
    setLocationSearch('');
    onChange({ systemId, locationId: '' });
  };

  const handleLocationChange = (locationId: number | '') => {
    onChange({ systemId: value.systemId, locationId });
  };

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === value.systemId),
    [systems, value.systemId],
  );

  const filteredLocations = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const selectedName = selectedSystem?.name?.toLowerCase() || '';

    const matching = locations
      .filter((location) => location.locationType !== 'star_system')
      .filter((location) => {
        const hierarchy = location.hierarchyPath as Record<string, string> | undefined;
        const systemName = hierarchy?.system?.toLowerCase() || '';
        if (!selectedName) {
          return false;
        }
        if (systemName !== selectedName) {
          return false;
        }
        if (!term) {
          return true;
        }
        const display = location.displayName.toLowerCase();
        const shortName = location.shortName.toLowerCase();
        return display.includes(term) || shortName.includes(term);
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return matching;
  }, [locations, selectedSystem, debouncedSearch]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading systems and locations...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2" sx={{ py: 1 }}>
        {error}
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth disabled={disabled}>
          <InputLabel id="system-select-label">Star system</InputLabel>
          <Select
            labelId="system-select-label"
            label="Star system"
            value={value.systemId ?? ''}
            onChange={(e) => handleSystemChange(Number(e.target.value))}
          >
            {systems.map((system) => (
              <MenuItem key={system.id} value={system.id}>
                {system.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={6}>
        <Stack spacing={1}>
          <TextField
            label="Filter locations"
            placeholder="Type to filter by name"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            disabled={disabled || !selectedSystem}
          />
          <FormControl fullWidth disabled={disabled || !selectedSystem}>
            <InputLabel id="location-select-label">Location</InputLabel>
            <Select
              labelId="location-select-label"
              label="Location"
            value={value.locationId ?? ''}
            onChange={(e) =>
              handleLocationChange(
                e.target.value === '' ? '' : Number(e.target.value),
              )
            }
            renderValue={(val) => {
                if (val === undefined || val === null) {
                  return 'Select a location';
                }
                const target = String(val);
                if (target === '') {
                  return 'Select a location';
                }
                const match = filteredLocations.find(
                  (loc) => String(loc.id) === target,
                );
                return match ? match.displayName : 'Select a location';
              }}
              MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
            >
              {filteredLocations.length === 0 && (
                <MenuItem disabled>No locations found</MenuItem>
              )}
              {filteredLocations.map((location) => (
                  <MenuItem key={location.id} value={Number(location.id)}>
                    <Stack spacing={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {location.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {location.hierarchyPath?.planet ||
                          location.hierarchyPath?.moon ||
                          location.hierarchyPath?.city ||
                          location.shortName}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Stack>
      </Grid>
    </Grid>
  );
};

export default SystemLocationSelector;
