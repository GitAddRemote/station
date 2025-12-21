import { memo, useMemo } from 'react';
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
import EditIcon from '@mui/icons-material/Edit';
import type { InventoryItem, OrgInventoryItem } from '../../services/inventory.service';
import type { FocusController } from '../../utils/focusController';
import { useMemoizedLocations } from '../../hooks/useMemoizedLocations';

const EDITOR_MODE_QUANTITY_MAX = 100000;

export type InventoryRecord = InventoryItem | OrgInventoryItem;

interface LocationOption {
  id: number;
  name: string;
}

interface InventoryInlineRowProps {
  item: InventoryRecord;
  density: 'standard' | 'compact';
  allLocations: LocationOption[];
  locationNameById: Map<number, string>;
  inlineDraft: { locationId: number | ''; quantity: number | '' };
  inlineLocationInput: string;
  locationEditing: boolean;
  quantityEditing: boolean;
  inlineSaving: boolean;
  inlineSaved?: boolean;
  inlineError?: string | null;
  isDirty: boolean;
  isRowActive: boolean;
  focusController: FocusController<string, 'location' | 'quantity' | 'save'>;
  rowKey: string;
  onDraftChange: (
    itemId: string,
    changes: Partial<{ locationId: number | ''; quantity: number | '' }>,
  ) => void;
  onErrorChange: (itemId: string, message: string | null) => void;
  onLocationInputChange: (rowKey: string, value: string) => void;
  onLocationFocus: (itemId: string) => void;
  onLocationBlur: (
    rowKey: string,
    itemId: string,
    draftLocationId: number | '',
    selectedName?: string,
  ) => void;
  onQuantityBlur: (rowKey: string) => void;
  onActivateField: (rowKey: string, field: 'location' | 'quantity', initialInput?: string) => void;
  onSave: (item: InventoryRecord) => void;
  onOpenActions?: (event: MouseEvent<HTMLElement>, item: InventoryRecord) => void;
  setLocationRef: (ref: HTMLInputElement | null, key: string) => void;
  setQuantityRef: (ref: HTMLInputElement | null, key: string) => void;
  setSaveRef: (ref: HTMLButtonElement | null, key: string) => void;
}

const InventoryInlineRow = ({
  item,
  density,
  allLocations,
  locationNameById,
  inlineDraft,
  inlineLocationInput,
  locationEditing,
  quantityEditing,
  inlineSaving,
  inlineSaved,
  inlineError,
  isDirty,
  isRowActive,
  focusController,
  rowKey,
  onDraftChange,
  onErrorChange,
  onLocationInputChange,
  onLocationFocus,
  onLocationBlur,
  onQuantityBlur,
  onActivateField,
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

  const { filtered: filteredOptions } = useMemoizedLocations(
    allLocations,
    inlineLocationInput,
    locationEditing,
  );
  const selectedLocation = useMemo(() => {
    if (typeof draftLocationId !== 'number') return null;
    const name = locationNameById.get(draftLocationId) ?? item.locationName;
    return name ? { id: draftLocationId, name } : null;
  }, [draftLocationId, locationNameById, item.locationName]);

  const draftQuantityNumber = Number(inlineDraft.quantity);
  const displayQuantity =
    Number.isFinite(draftQuantityNumber) && draftQuantityNumber > 0
      ? draftQuantityNumber
      : Number(item.quantity);

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
        backgroundColor: isRowActive ? 'rgba(74, 158, 255, 0.08)' : 'transparent',
        '&:hover': {
          backgroundColor: isRowActive
            ? 'rgba(74, 158, 255, 0.12)'
            : 'rgba(255,255,255,0.02)',
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
          <>
            {locationEditing ? (
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
                  onDraftChange(item.id, { locationId: value ? value.id : '' });
                  onLocationInputChange(rowKey, value?.name ?? '');
                  onLocationBlur(rowKey, item.id, draftLocationId, value?.name ?? '');
                  onErrorChange(item.id, null);
                }}
                onInputChange={(_, value) => {
                  onLocationInputChange(rowKey, value);
                }}
                onFocus={() => {
                  onLocationFocus(item.id);
                }}
                onBlur={() => {
                  onLocationBlur(rowKey, item.id, draftLocationId, selectedLocation?.name ?? '');
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
                          onDraftChange(item.id, { locationId: bestMatch.id });
                          onLocationInputChange(rowKey, bestMatch.name);
                          onLocationBlur(rowKey, item.id, draftLocationId, bestMatch.name);
                          onErrorChange(item.id, null);
                          focusController.focus(rowKey, 'quantity');
                        } else {
                          onErrorChange(item.id, 'No matches found');
                        }
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        onLocationInputChange(rowKey, selectedLocation?.name ?? '');
                        onLocationBlur(
                          rowKey,
                          item.id,
                          draftLocationId,
                          selectedLocation?.name ?? '',
                        );
                      }
                    }}
                  />
                )}
              />
            ) : (
              <Box
                role="button"
                tabIndex={0}
                onClick={() =>
                  onActivateField(
                    rowKey,
                    'location',
                    selectedLocation?.name ?? item.locationName ?? '',
                  )
                }
                onFocus={() =>
                  onActivateField(
                    rowKey,
                    'location',
                    selectedLocation?.name ?? item.locationName ?? '',
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onActivateField(
                      rowKey,
                      'location',
                      selectedLocation?.name ?? item.locationName ?? '',
                    );
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  cursor: 'text',
                  color: 'text.primary',
                  textDecoration: 'underline dotted',
                  textUnderlineOffset: '4px',
                  textDecorationColor: 'rgba(255,255,255,0.35)',
                  '&:hover .inline-edit-icon': {
                    opacity: 0.75,
                  },
                  '&:focus-visible': {
                    outline: '1px solid rgba(74, 158, 255, 0.6)',
                    borderRadius: 1,
                    outlineOffset: 2,
                  },
                }}
                aria-label={`Edit location for ${item.itemName ?? `Item ${item.uexItemId}`}`}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedLocation?.name || item.locationName || 'Select location'}
                </Typography>
                <EditIcon
                  className="inline-edit-icon"
                  fontSize="inherit"
                  sx={{ opacity: 0, transition: 'opacity 0.2s ease' }}
                />
              </Box>
            )}
          </>
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
          <>
            {quantityEditing ? (
              <TextField
                type="text"
                size="small"
                data-testid={`inline-quantity-${item.id}`}
                value={inlineDraft.quantity}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (raw === '') {
                    onDraftChange(item.id, { quantity: '' });
                    onErrorChange(item.id, 'Quantity is required');
                    return;
                  }
                  const numeric = Number(raw);
                  if (Number.isNaN(numeric)) {
                    onDraftChange(item.id, { quantity: '' });
                  } else {
                    onDraftChange(item.id, {
                      quantity: Math.min(numeric, EDITOR_MODE_QUANTITY_MAX),
                    });
                  }
                  if (!Number.isInteger(numeric) || numeric <= 0) {
                    onErrorChange(item.id, 'Quantity must be an integer greater than 0');
                  } else {
                    onErrorChange(item.id, null);
                  }
                }}
                onBlur={() => onQuantityBlur(rowKey)}
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
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    onDraftChange(item.id, { quantity: Number(item.quantity) || 0 });
                    onErrorChange(item.id, null);
                    onQuantityBlur(rowKey);
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
            ) : (
              <Box
                role="button"
                tabIndex={0}
                onClick={() => onActivateField(rowKey, 'quantity')}
                onFocus={() => onActivateField(rowKey, 'quantity')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onActivateField(rowKey, 'quantity');
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  cursor: 'text',
                  color: 'text.primary',
                  textDecoration: 'underline dotted',
                  textUnderlineOffset: '4px',
                  textDecorationColor: 'rgba(255,255,255,0.35)',
                  '&:hover .inline-edit-icon': {
                    opacity: 0.75,
                  },
                  '&:focus-visible': {
                    outline: '1px solid rgba(74, 158, 255, 0.6)',
                    borderRadius: 1,
                    outlineOffset: 2,
                  },
                }}
                aria-label={`Edit quantity for ${item.itemName ?? `Item ${item.uexItemId}`}`}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: 0.1 }}>
                  {displayQuantity.toLocaleString()}
                </Typography>
                <EditIcon
                  className="inline-edit-icon"
                  fontSize="inherit"
                  sx={{ opacity: 0, transition: 'opacity 0.2s ease' }}
                />
              </Box>
            )}
          </>
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
        {Number.isFinite(draftQuantityNumber) && draftQuantityNumber >= EDITOR_MODE_QUANTITY_MAX && (
          <Typography variant="caption" sx={{ color: 'warning.main' }}>
            Large quantity entered - verify value.
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
        <Box sx={{ minHeight: 18, display: 'flex', alignItems: 'center' }}>
          {inlineError && (
            <Typography variant="caption" color="error">
              {inlineError}
            </Typography>
          )}
          {!inlineError && inlineSaved && (
            <Chip
              label="Saved"
              size="small"
              color="success"
              variant="outlined"
              sx={{ height: 18, fontSize: 11 }}
            />
          )}
        </Box>
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
            onClick={() => onSave(item)}
            disabled={inlineSaving}
            data-testid={`inline-save-${item.id}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSave(item);
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
            <IconButton onClick={(event) => onOpenActions?.(event, item)}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

const areEqual = (prev: InventoryInlineRowProps, next: InventoryInlineRowProps) =>
  prev.item === next.item &&
  prev.density === next.density &&
  prev.allLocations === next.allLocations &&
  prev.locationNameById === next.locationNameById &&
  prev.inlineDraft === next.inlineDraft &&
  prev.inlineLocationInput === next.inlineLocationInput &&
  prev.locationEditing === next.locationEditing &&
  prev.quantityEditing === next.quantityEditing &&
  prev.inlineSaving === next.inlineSaving &&
  prev.inlineSaved === next.inlineSaved &&
  prev.inlineError === next.inlineError &&
  prev.isDirty === next.isDirty &&
  prev.isRowActive === next.isRowActive &&
  prev.focusController === next.focusController &&
  prev.rowKey === next.rowKey &&
  prev.onDraftChange === next.onDraftChange &&
  prev.onErrorChange === next.onErrorChange &&
  prev.onLocationInputChange === next.onLocationInputChange &&
  prev.onLocationFocus === next.onLocationFocus &&
  prev.onLocationBlur === next.onLocationBlur &&
  prev.onQuantityBlur === next.onQuantityBlur &&
  prev.onActivateField === next.onActivateField &&
  prev.onSave === next.onSave &&
  prev.onOpenActions === next.onOpenActions &&
  prev.setLocationRef === next.setLocationRef &&
  prev.setQuantityRef === next.setQuantityRef &&
  prev.setSaveRef === next.setSaveRef;

export { InventoryInlineRow };
export default memo(InventoryInlineRow, areEqual);
