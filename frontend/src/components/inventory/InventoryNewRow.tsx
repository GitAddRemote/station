import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { RefObject } from 'react';
import type { CatalogItem } from '../../services/uex.service';

interface LocationOption {
  id: number;
  name: string;
}

interface InventoryNewRowProps {
  isEditorMode: boolean;
  itemOptions: CatalogItem[];
  itemInput: string;
  selectedItem: CatalogItem | null;
  itemLoading: boolean;
  itemError: string | null;
  locationInput: string;
  locationEditing: boolean;
  selectedLocation: LocationOption | null;
  filteredLocations: LocationOption[];
  draft: { itemId: number | ''; locationId: number | ''; quantity: number | '' };
  errors: {
    item?: string | null;
    location?: string | null;
    quantity?: string | null;
    org?: string | null;
    api?: string | null;
  };
  dirty: boolean;
  saving: boolean;
  orgBlocked: boolean;
  showQuantityWarning: boolean;
  onItemInputChange: (value: string, reason: string) => void;
  onItemSelect: (item: CatalogItem | null) => void;
  onLocationInputChange: (value: string) => void;
  onLocationSelect: (location: LocationOption | null) => void;
  onLocationEnter: (bestMatch: LocationOption | undefined) => void;
  onLocationFocus: () => void;
  onLocationBlur: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onQuantityEnter: () => void;
  onSave: () => void;
  onRetry: () => void;
  itemRef: RefObject<HTMLInputElement | null>;
  locationRef: RefObject<HTMLInputElement | null>;
  quantityRef: RefObject<HTMLInputElement | null>;
  saveRef: RefObject<HTMLButtonElement | null>;
}

export const InventoryNewRow = ({
  isEditorMode,
  itemOptions,
  itemInput,
  selectedItem,
  itemLoading,
  itemError,
  locationInput,
  locationEditing,
  selectedLocation,
  filteredLocations,
  draft,
  errors,
  dirty,
  saving,
  orgBlocked,
  showQuantityWarning,
  onItemInputChange,
  onItemSelect,
  onLocationInputChange,
  onLocationSelect,
  onLocationEnter,
  onLocationFocus,
  onLocationBlur,
  onQuantityChange,
  onQuantityEnter,
  onSave,
  onRetry,
  itemRef,
  locationRef,
  quantityRef,
  saveRef,
}: InventoryNewRowProps) => {
  if (!isEditorMode) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '2fr 1fr 1fr 1fr auto',
        },
        gap: 0.75,
        alignItems: 'flex-start',
        px: 1,
        py: 0.75,
        border: '1px dashed rgba(255,255,255,0.15)',
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.02)',
        mb: 1.5,
      }}
    >
      <Stack spacing={0.5}>
        <Autocomplete
          size="small"
          fullWidth
          options={itemOptions}
          value={selectedItem}
          inputValue={itemInput}
          loading={itemLoading}
          autoHighlight
          openOnFocus
          filterOptions={(options) => options}
          getOptionLabel={(option) => option?.name ?? ''}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value) => onItemSelect(value)}
          onInputChange={(_, value, reason) => onItemInputChange(value, reason)}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Stack spacing={0.25}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {option.name}
                </Typography>
                {option.categoryName && (
                  <Typography variant="caption" color="text.secondary">
                    {option.categoryName}
                  </Typography>
                )}
              </Stack>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="New item"
              data-testid="new-row-item-input"
              inputRef={itemRef as RefObject<HTMLInputElement>}
              error={Boolean(errors.item)}
              helperText={errors.item || itemError || undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSave();
                }
              }}
            />
          )}
        />
      </Stack>
      <Stack spacing={0.5}>
        <Autocomplete
          size="small"
          fullWidth
          options={filteredLocations}
          autoHighlight
          openOnFocus
          filterOptions={(options) => options}
          value={locationEditing ? null : selectedLocation}
          inputValue={
            locationEditing ? locationInput : selectedLocation?.name ?? locationInput
          }
          getOptionLabel={(option) => option?.name ?? ''}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value) => onLocationSelect(value)}
          onInputChange={(_, value) => onLocationInputChange(value)}
          onFocus={onLocationFocus}
          onBlur={() => onLocationBlur(selectedLocation?.name ?? '')}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              {option.name}
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Location"
              data-testid="new-row-location-input"
              inputRef={locationRef as RefObject<HTMLInputElement>}
              error={Boolean(errors.location)}
              helperText={errors.location || undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onLocationEnter(filteredLocations[0]);
                }
              }}
            />
          )}
        />
      </Stack>
      <Stack spacing={0.5}>
        <TextField
          type="text"
          size="small"
          label="Quantity"
          data-testid="new-row-quantity"
          value={draft.quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*',
          }}
          inputRef={quantityRef as RefObject<HTMLInputElement>}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onQuantityEnter();
            }
          }}
          error={Boolean(errors.quantity)}
          helperText={errors.quantity || undefined}
        />
        {showQuantityWarning && (
          <Typography variant="caption" sx={{ color: 'warning.main' }}>
            Large quantity entered - verify value.
          </Typography>
        )}
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          New entry
        </Typography>
        {errors.org && (
          <Typography variant="caption" color="error">
            {errors.org}
          </Typography>
        )}
        {errors.api && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="error">
              {errors.api}
            </Typography>
            <Button
              size="small"
              color="inherit"
              variant="text"
              onClick={onRetry}
              data-testid="new-row-retry"
            >
              Retry
            </Button>
          </Stack>
        )}
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        alignItems="center"
        sx={{ minWidth: 140 }}
      >
        {dirty && (
          <Chip
            label={saving ? 'Saving...' : 'Unsaved'}
            size="small"
            color={saving ? 'primary' : 'warning'}
            variant="outlined"
            sx={{ height: 22, fontSize: 12 }}
          />
        )}
        <Tooltip
          title={orgBlocked ? 'Select an organization to save items in org view.' : ''}
          disableHoverListener={!orgBlocked}
        >
          <span>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={onSave}
              disabled={saving || orgBlocked}
              data-testid="new-row-save"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSave();
                }
              }}
              ref={saveRef as RefObject<HTMLButtonElement>}
            >
              Save
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default InventoryNewRow;
