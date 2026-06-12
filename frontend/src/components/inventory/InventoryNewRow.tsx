import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import type { RefObject } from 'react';
import type { CatalogEntryDto, LocationDto } from '../../services/catalog.service';
import type { UnitOfMeasure } from '../../services/inventory.service';
import LocationPicker from './LocationPicker';

const ALIAS_ELIGIBLE_KINDS = new Set<string>(['item', 'vehicle']);

interface InventoryNewRowProps {
  isEditorMode: boolean;
  itemOptions: CatalogEntryDto[];
  itemInput: string;
  selectedItem: CatalogEntryDto | null;
  itemLoading: boolean;
  itemError: string | null;
  draft: {
    itemId: string | '';
    quantity: number | '';
  };
  errors: {
    item?: string | null;
    quantity?: string | null;
    org?: string | null;
    api?: string | null;
  };
  dirty: boolean;
  saving: boolean;
  orgBlocked: boolean;
  showQuantityWarning: boolean;
  selectedLocation: LocationDto | null;
  quality: number | '';
  alias: string;
  onItemInputChange: (value: string, reason: string) => void;
  onItemSelect: (item: CatalogEntryDto | null) => void;
  uomOptions: UnitOfMeasure[];
  uomId: string;
  onUomChange: (id: string) => void;
  onLocationChange: (location: LocationDto | null) => void;
  onQualityChange: (value: number | '') => void;
  onAliasChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onQuantityEnter: () => void;
  onSave: () => void;
  onRetry: () => void;
  itemRef: RefObject<HTMLInputElement | null>;
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
  draft,
  errors,
  dirty,
  saving,
  orgBlocked,
  showQuantityWarning,
  selectedLocation,
  quality,
  alias,
  uomOptions,
  uomId,
  onUomChange,
  onItemInputChange,
  onItemSelect,
  onLocationChange,
  onQualityChange,
  onAliasChange,
  onQuantityChange,
  onQuantityEnter,
  onSave,
  onRetry,
  itemRef,
  quantityRef,
  saveRef,
}: InventoryNewRowProps) => {
  const isCommodity = selectedItem?.catalogKind === 'commodity';
  const isAliasEligible = selectedItem !== null && ALIAS_ELIGIBLE_KINDS.has(selectedItem.catalogKind);
  if (!isEditorMode) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: isCommodity ? '2fr 1fr auto 1.5fr 0.8fr 0.8fr 1fr auto' : '2fr 1fr auto 1.5fr 0.8fr 1fr auto',
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
                {option.categoryPath && (
                  <Typography variant="caption" color="text.secondary">
                    {option.categoryPath}
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
        <TextField
          type="text"
          size="small"
          label="Quantity"
          data-testid="new-row-quantity"
          value={draft.quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          inputProps={{
            inputMode: 'decimal',
            pattern: '[0-9]*\\.?[0-9]*',
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
      <Stack spacing={0.5} justifyContent="flex-start" sx={{ pt: 0.5 }}>
        {isCommodity ? (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={uomId}
            onChange={(_e, v) => { if (v) onUomChange(v); }}
            orientation="vertical"
            sx={{ alignSelf: 'flex-start' }}
          >
            {uomOptions.map((u) => (
              <Tooltip key={u.id} title={`scale ×${u.scaleFactor}`} placement="right">
                <ToggleButton value={u.id} sx={{ px: 1.5, py: 0.25, fontSize: '0.7rem' }}>
                  {u.abbreviation}
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ pt: 0.75 }}>
            Unit
          </Typography>
        )}
      </Stack>
      <Stack spacing={0.5}>
        <LocationPicker
          value={selectedLocation}
          onChange={onLocationChange}
          size="small"
        />
      </Stack>
      <Stack spacing={0.5}>
        <TextField
          type="number"
          size="small"
          label="Quality"
          value={quality}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onQualityChange('');
              return;
            }
            const num = parseFloat(raw);
            if (!Number.isNaN(num)) {
              onQualityChange(Math.min(1000, Math.max(0, num)));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onQuantityEnter();
            }
          }}
          inputProps={{ min: 0, max: 1000, step: 1 }}
        />
      </Stack>
      {isAliasEligible && (
        <Stack spacing={0.5}>
          <TextField
            size="small"
            label="Nickname (optional)"
            value={alias}
            onChange={(e) => onAliasChange(e.target.value)}
            inputProps={{ maxLength: 64 }}
            placeholder="Add a nickname…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSave();
              }
            }}
          />
        </Stack>
      )}
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
      <Box sx={{ display: { xs: 'none', md: 'block' } }} />
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
          title={
            orgBlocked
              ? 'Select an organization to save items in org view.'
              : ''
          }
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
