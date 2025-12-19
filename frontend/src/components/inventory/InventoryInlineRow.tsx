import type { MouseEvent } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { InventoryItem, OrgInventoryItem } from '../../services/inventory.service';
import type { FocusController } from '../../utils/focusController';
import { useMemoizedLocations } from '../../hooks/useMemoizedLocations';

export type InventoryRecord = InventoryItem | OrgInventoryItem;

interface LocationOption {
  id: number;
  name: string;
}

interface InventoryInlineRowProps {
  item: InventoryRecord;
  density: 'standard' | 'compact';
  allLocations: LocationOption[];
  inlineDraft: { locationId: number | ''; quantity: number | '' };
  inlineLocationInput: string;
  locationEditing: boolean;
  inlineSaving: boolean;
  inlineError?: string | null;
  isDirty: boolean;
  focusController: FocusController<string, 'location' | 'quantity' | 'save'>;
  rowKey: string;
  onDraftChange: (changes: Partial<{ locationId: number | ''; quantity: number | '' }>) => void;
  onErrorChange: (message: string | null) => void;
  onLocationInputChange: (value: string) => void;
  onLocationFocus: () => void;
  onLocationBlur: (selectedName?: string) => void;
  onSave: () => void;
  onOpenActions?: (event: MouseEvent<HTMLButtonElement>) => void;
  setLocationRef: (ref: HTMLInputElement | null, key: string) => void;
  setQuantityRef: (ref: HTMLInputElement | null, key: string) => void;
  setSaveRef: (ref: HTMLButtonElement | null, key: string) => void;
}

export const InventoryInlineRow = ({
  item,
  density,
  allLocations,
  inlineDraft,
  inlineLocationInput,
  locationEditing,
  inlineSaving,
  inlineError,
  isDirty,
  focusController,
  rowKey,
  onDraftChange,
  onErrorChange,
  onLocationInputChange,
  onLocationFocus,
  onLocationBlur,
  onSave,
  onOpenActions,
  setLocationRef,
  setQuantityRef,
  setSaveRef,
}: InventoryInlineRowProps) => {
  const draftLocationId =
    typeof inlineDraft.locationId === 'string'
      ? Number(inlineDraft.locationId)
      : inlineDraft.locationId;

  const { filtered: filteredOptions, getSelected } = useMemoizedLocations(
    allLocations,
    inlineLocationInput,
  );
  const selectedLocation =
    typeof draftLocationId === 'number'
      ? getSelected(draftLocationId) ||
        (item.locationName
          ? { id: draftLocationId, name: item.locationName }
          : null)
      : null;

  const draftQuantityNumber = Number(inlineDraft.quantity);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: density === 'compact' ? '2fr 1fr 1fr 1fr auto' : '2fr 1fr 1fr 1fr auto',
        },
        gap: density === 'compact' ? 0.75 : 2,
        alignItems: 'center',
        px: density === 'compact' ? 1 : 2,
        py: density === 'compact' ? 0.45 : 1.5,
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.02)',
        },
      }}
    >
      <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
        <Stack
          direction="row"
          spacing={density === 'compact' ? 0.5 : 1}
          alignItems="center"
          flexWrap="wrap"
          columnGap={density === 'compact' ? 0.75 : 1}
          rowGap={density === 'compact' ? 0.25 : 0.5}
        >
          <Typography
            variant={density === 'compact' ? 'body2' : 'subtitle1'}
            sx={{ fontWeight: 600 }}
            noWrap
            title={item.itemName || `Item #${item.uexItemId}`}
          >
            {item.itemName || `Item #${item.uexItemId}`}
          </Typography>
          <Chip
            label={item.categoryName || 'General'}
            size={density === 'compact' ? 'small' : 'medium'}
            variant="outlined"
          />
          {item.sharedOrgId && (
            <Chip
              size={density === 'compact' ? 'small' : 'medium'}
              color="primary"
              variant="outlined"
              label={item.sharedOrgName || 'Shared'}
            />
          )}
        </Stack>
      </Stack>
      <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
        {density !== 'compact' ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Location
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {item.locationName || 'Unknown'}
            </Typography>
          </>
        ) : (
          <Autocomplete
            size="small"
            fullWidth
            options={filteredOptions}
            autoHighlight
            openOnFocus
            filterOptions={(options) => options}
            value={locationEditing ? null : selectedLocation}
            inputValue={inlineLocationInput}
            getOptionLabel={(option) => option?.name ?? ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, value) => {
              onDraftChange({ locationId: value ? value.id : '' });
              onLocationInputChange(value?.name ?? '');
              onLocationBlur(value?.name ?? '');
              onErrorChange(null);
            }}
            onInputChange={(_, value) => {
              onLocationInputChange(value);
            }}
            onFocus={() => {
              onLocationFocus();
              onLocationInputChange('');
            }}
            onBlur={() => {
              onLocationBlur(selectedLocation?.name ?? '');
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                {option.name}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Location"
                data-testid={`inline-location-${item.id}`}
                inputRef={(el) => {
                  setLocationRef(el, rowKey);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const bestMatch = filteredOptions[0];
                    if (bestMatch) {
                      onDraftChange({ locationId: bestMatch.id });
                      onLocationInputChange(bestMatch.name);
                      onLocationBlur(bestMatch.name);
                      onErrorChange(null);
                      focusController.focus(rowKey, 'quantity');
                    } else {
                      onErrorChange('No matches found');
                    }
                  }
                }}
              />
            )}
          />
        )}
      </Stack>
      <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
        {density !== 'compact' ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Quantity
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: 0.1 }}>
              {Number(item.quantity).toLocaleString()}
            </Typography>
          </>
        ) : (
          <TextField
            type="text"
            size="small"
            data-testid={`inline-quantity-${item.id}`}
            value={inlineDraft.quantity}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === '') {
                onDraftChange({ quantity: '' });
                onErrorChange('Quantity is required');
                return;
              }
              const numeric = Number(raw);
              onDraftChange({ quantity: Number.isNaN(numeric) ? '' : numeric });
              if (!Number.isInteger(numeric) || numeric <= 0) {
                onErrorChange('Quantity must be an integer greater than 0');
              } else {
                onErrorChange(null);
              }
            }}
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
            inputRef={(el) => {
              setQuantityRef(el, rowKey);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                focusController.focus(rowKey, 'save');
              }
            }}
            sx={{
              maxWidth: 120,
              '& input': {
                MozAppearance: 'textfield',
              },
              '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
            }}
          />
        )}
      </Stack>
      <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
        {density !== 'compact' && (
          <Typography variant="body2" color="text.secondary">
            Updated
          </Typography>
        )}
        <Typography variant="body2">
          {new Date(item.dateModified || item.dateAdded || '').toLocaleDateString()}
        </Typography>
        {Number.isFinite(draftQuantityNumber) && draftQuantityNumber > 100000 && (
          <Typography variant="caption" sx={{ color: 'warning.main' }}>
            Large quantity entered - verify value.
          </Typography>
        )}
        {inlineError && (
          <Typography variant="caption" color="error">
            {inlineError}
          </Typography>
        )}
      </Stack>
      <Stack
        direction="row"
        spacing={density === 'compact' ? 0.5 : 1}
        justifyContent="flex-end"
        alignItems="center"
        sx={{
          minWidth: density === 'compact' ? 140 : undefined,
          flexWrap: 'nowrap',
        }}
      >
        {density === 'compact' && isDirty && (
          <Chip
            label="Unsaved"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ height: 22, fontSize: 12, flexShrink: 0 }}
          />
        )}
        {density === 'compact' ? (
          <IconButton
            color="primary"
            size="small"
            onClick={onSave}
            disabled={inlineSaving}
            data-testid={`inline-save-${item.id}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSave();
              }
            }}
            ref={(el: HTMLButtonElement | null) => {
              setSaveRef(el, rowKey);
            }}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
        ) : (
          <Tooltip title="Actions">
            <IconButton onClick={onOpenActions}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

export default InventoryInlineRow;
