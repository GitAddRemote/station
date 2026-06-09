import { useState, useEffect, useCallback, useRef } from 'react';
import { Autocomplete, Chip, Stack, TextField, Typography } from '@mui/material';
import { catalogService, LocationDto } from '../../services/catalog.service';

interface LocationPickerProps {
  value: LocationDto | null;
  onChange: (location: LocationDto | null) => void;
  error?: string | null;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

const SOURCE_LABELS: Record<string, string> = {
  space_station: 'Station',
  city: 'City',
  outpost: 'Outpost',
  poi: 'POI',
  system: 'System',
};

const LocationPicker = ({
  value,
  onChange,
  error,
  disabled,
  size = 'small',
}: LocationPickerProps) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<LocationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOptions = useCallback((search: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await catalogService.getLocations(search || undefined);
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    fetchOptions('');
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchOptions]);

  return (
    <Autocomplete
      size={size}
      fullWidth
      options={options}
      value={value}
      inputValue={inputValue}
      loading={loading}
      disabled={disabled}
      autoHighlight
      filterOptions={(opts) => opts}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      onChange={(_, newValue) => onChange(newValue)}
      onInputChange={(_, newInput, reason) => {
        setInputValue(newInput);
        if (reason === 'input') fetchOptions(newInput);
      }}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Stack spacing={0}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {option.name}
              </Typography>
              {option.starSystemName && (
                <Typography variant="caption" color="text.secondary">
                  {option.starSystemName}
                </Typography>
              )}
            </Stack>
            <Chip
              label={SOURCE_LABELS[option.sourceType] ?? option.sourceType}
              size="small"
              variant="outlined"
              sx={{ ml: 'auto', height: 18, fontSize: 10 }}
            />
          </Stack>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Location"
          error={Boolean(error)}
          helperText={error ?? undefined}
          placeholder="Search locations..."
        />
      )}
    />
  );
};

export default LocationPicker;
