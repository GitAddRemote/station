import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LocationRecord } from '../../services/location.service';
import type { StarSystem } from '../../services/uex.service';
import { useDebounce } from '../../hooks/useDebounce';
import { locationCache } from '../../services/locationCache';

export interface SystemLocationValue {
  systemId: number | '';
  locationId: number | '';
}

interface SystemLocationSelectorProps {
  gameId?: number;
  value: SystemLocationValue;
  onChange: (value: SystemLocationValue) => void;
  disabled?: boolean;
  systemSelectRef?: RefObject<HTMLInputElement | null>;
}

const SystemLocationSelector = ({
  gameId = 1,
  value,
  onChange,
  disabled,
  systemSelectRef,
}: SystemLocationSelectorProps) => {
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [systemSearch, setSystemSearch] = useState('');
  const [systemsLoading, setSystemsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(locationSearch, 300);
  const debouncedSystemSearch = useDebounce(systemSearch, 250);

  useEffect(() => {
    let isMounted = true;
    const loadSystems = async () => {
      try {
        setError(null);
        setSystemsLoading(true);
        const systemData = await locationCache.getActiveSystems(gameId);
        if (!isMounted) return;
        setSystems(systemData);
      } catch (err) {
        console.error('Failed to load star systems', err);
        if (isMounted) {
          setError('Unable to load star systems.');
        }
      } finally {
        if (isMounted) {
          setSystemsLoading(false);
        }
      }
    };

    loadSystems();
    return () => {
      isMounted = false;
    };
  }, [gameId, onChange, value.systemId]);

  useEffect(() => {
    if (!value.systemId) {
      setLocations([]);
      return;
    }

    let isMounted = true;
    const loadLocations = async () => {
      try {
        setLocationsLoading(true);
        setError(null);
        const data = await locationCache.getAllLocations(gameId);
        if (isMounted) {
          setLocations(data);
          setLocationSearch('');
        }
      } catch (err) {
        console.error('Failed to load locations', err);
        if (isMounted) {
          setError('Unable to load locations.');
          setLocations([]);
        }
      } finally {
        if (isMounted) {
          setLocationsLoading(false);
        }
      }
    };

    loadLocations();
    return () => {
      isMounted = false;
    };
  }, [gameId, value.systemId]);

  useEffect(() => {
    if (!value.systemId || systems.length === 0) {
      setSystemSearch('');
      return;
    }
    const match = systems.find((system) => system.id === value.systemId);
    setSystemSearch(match?.name ?? '');
  }, [systems, value.systemId]);

  const handleSystemChange = (systemId: number | '') => {
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
    const systemName = selectedSystem?.name?.toLowerCase();

    const matching = locations
      .filter((location) => location.locationType !== 'star_system')
      .filter((location) => {
        const hierarchy = location.hierarchyPath as Record<string, string> | undefined;
        const system = hierarchy?.system?.toLowerCase() || '';
        if (systemName && system !== systemName) {
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
  }, [locations, debouncedSearch, selectedSystem]);

  const filteredSystems = useMemo(() => {
    const term = debouncedSystemSearch.trim().toLowerCase();
    if (!term) {
      return systems;
    }
    return systems.filter((system) => {
      const name = system.name.toLowerCase();
      const code = system.code.toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [systems, debouncedSystemSearch]);

  if (systemsLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading star systems...</Typography>
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
        <Autocomplete
          fullWidth
          options={filteredSystems}
          value={
            systems.find((system) => system.id === value.systemId) || null
          }
          getOptionLabel={(option) => option.name}
          onChange={(_, option) => {
            const systemId = option ? option.id : '';
            handleSystemChange(systemId);
            setSystemSearch(option?.name || '');
          }}
          inputValue={systemSearch}
          onInputChange={(_, newValue) => {
            setSystemSearch(newValue);
          }}
          isOptionEqualToValue={(option, val) => option.id === val.id}
          loading={systemsLoading}
          disabled={disabled}
          filterOptions={(options) => options}
          loadingText="Loading star systems..."
          noOptionsText={
            systemsLoading ? 'Loading star systems...' : 'No star systems found'
          }
          renderOption={(props, option) => (
            <MenuItem {...props} key={option.id} value={option.id}>
              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  {option.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.code}
                </Typography>
              </Stack>
            </MenuItem>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Star system"
              placeholder="Type to search"
              inputRef={systemSelectRef}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Autocomplete
          fullWidth
          options={filteredLocations}
          value={
            filteredLocations.find(
              (loc) => Number(loc.id) === Number(value.locationId),
            ) || null
          }
          getOptionLabel={(option) => option.displayName}
          onChange={(_, option) =>
            handleLocationChange(option ? Number(option.id) : '')
          }
          inputValue={locationSearch}
          onInputChange={(_, newValue, reason) => {
            setLocationSearch(newValue);
          }}
          loading={locationsLoading}
          disabled={disabled || !selectedSystem}
          isOptionEqualToValue={(option, val) =>
            Number(option.id) === Number(val.id)
          }
          filterOptions={(options) => options}
          loadingText="Loading locations..."
          noOptionsText={
            locationsLoading ? 'Loading locations...' : 'No locations found'
          }
          ListboxProps={{ style: { maxHeight: 320 } }}
          renderOption={(props, option) => (
            <MenuItem {...props} key={option.id} value={Number(option.id)}>
              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  {option.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.hierarchyPath?.planet ||
                    option.hierarchyPath?.moon ||
                    option.hierarchyPath?.city ||
                    option.shortName}
                </Typography>
              </Stack>
            </MenuItem>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Location"
              placeholder="Type to search and select a location"
            />
          )}
        />
      </Grid>
    </Grid>
  );
};

export default SystemLocationSelector;
