import { memo } from 'react';
import type { MouseEvent } from 'react';
import {
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import type {
  InventoryItem,
  OrgInventoryItem,
} from '../../services/inventory.service';
import type { LocationDto } from '../../services/catalog.service';
import type { FocusController } from '../../utils/focusController';
import LocationPicker from './LocationPicker';

const EDITOR_MODE_QUANTITY_MAX = 999999.999999;
const MIN_INVENTORY_QUANTITY = 0.000001;

export type InventoryRecord = InventoryItem | OrgInventoryItem;

interface InventoryInlineRowProps {
  item: InventoryRecord;
  density: 'standard' | 'compact';
  inlineDraft: { quantity: number | ''; quality: number | '' };
  quantityEditing: boolean;
  qualityEditing: boolean;
  locationEditing: boolean;
  inlineLocation: LocationDto | null;
  inlineSaving: boolean;
  inlineSaved?: boolean;
  inlineError?: string | null;
  isDirty: boolean;
  isRowActive: boolean;
  focusController: FocusController<string, 'quantity' | 'quality' | 'save'>;
  rowKey: string;
  onDraftChange: (
    itemId: string,
    changes: Partial<{ quantity: number | ''; quality: number | '' }>,
  ) => void;
  onErrorChange: (itemId: string, message: string | null) => void;
  onQuantityBlur: (rowKey: string) => void;
  onQualityBlur: (rowKey: string) => void;
  onActivateField: (
    rowKey: string,
    field: 'quantity' | 'quality' | 'location',
    initialInput?: string,
  ) => void;
  onLocationChange: (itemId: string, location: LocationDto | null) => void;
  onLocationBlur: (rowKey: string) => void;
  onSave: (item: InventoryRecord) => void;
  onOpenActions?: (
    event: MouseEvent<HTMLElement>,
    item: InventoryRecord,
  ) => void;
  setQuantityRef: (ref: HTMLInputElement | null, key: string) => void;
  setQualityRef: (ref: HTMLInputElement | null, key: string) => void;
  setSaveRef: (ref: HTMLButtonElement | null, key: string) => void;
}

const InventoryInlineRow = ({
  item,
  density,
  inlineDraft,
  quantityEditing,
  qualityEditing,
  locationEditing,
  inlineLocation,
  inlineSaving,
  inlineSaved,
  inlineError,
  isDirty,
  isRowActive,
  focusController,
  rowKey,
  onDraftChange,
  onErrorChange,
  onQuantityBlur,
  onQualityBlur,
  onActivateField,
  onLocationChange,
  onLocationBlur,
  onSave,
  onOpenActions,
  setQuantityRef,
  setQualityRef,
  setSaveRef,
}: InventoryInlineRowProps) => {
  const draftQuantityNumber = Number(inlineDraft.quantity);
  const displayQuantity = Number.isFinite(draftQuantityNumber)
    ? draftQuantityNumber
    : Number(item.quantity);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: density === 'compact'
            ? '2fr 1fr 1.5fr 0.8fr 1fr 1fr 1fr auto'
            : '2fr 1fr 1.5fr 0.8fr 1fr 1fr 1fr auto',
        },
        gap: density === 'compact' ? 0.75 : 2,
        alignItems: 'center',
        px: density === 'compact' ? 1 : 2,
        py: density === 'compact' ? 0.45 : 1.5,
        backgroundColor: isRowActive ? 'var(--brand-subtle)' : 'transparent',
        transition: 'background 120ms ease-out',
        '&:hover': {
          backgroundColor: isRowActive ? 'var(--brand-subtle)' : 'var(--surface-sunken)',
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
            title={item.itemName || `Item #${item.catalogEntryId}`}
          >
            {item.itemName || `Item #${item.catalogEntryId}`}
          </Typography>
          {(item.contractedQuantity ?? 0) > 0 && (
            <span className="chip-badge warm">Contracted | {(item.contractedQuantity!).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
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
              {item.locationName ?? <>&mdash;</>}
            </Typography>
          </>
        ) : locationEditing ? (
          <LocationPicker
            value={inlineLocation}
            onChange={(loc) => onLocationChange(item.id, loc)}
            size="small"
            onBlur={() => onLocationBlur(rowKey)}
          />
        ) : (
          <Box
            role="button"
            tabIndex={0}
            onClick={() => onActivateField(rowKey, 'location')}
            onFocus={() => onActivateField(rowKey, 'location')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onActivateField(rowKey, 'location');
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
              '&:hover .inline-edit-icon': { opacity: 0.75 },
              '&:focus-visible': {
                outline: '1px solid rgba(74, 158, 255, 0.6)',
                borderRadius: 1,
                outlineOffset: 2,
              },
            }}
            aria-label={`Edit location for ${item.itemName ?? `Item ${item.catalogEntryId}`}`}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {inlineLocation?.name ?? item.locationName ?? '—'}
            </Typography>
            <EditIcon
              className="inline-edit-icon"
              fontSize="inherit"
              sx={{ opacity: 0, transition: 'opacity 0.2s ease', flexShrink: 0 }}
            />
          </Box>
        )}
      </Stack>
      {/* Quality column */}
      <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
        {density !== 'compact' ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Quality
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {item.quality != null ? item.quality : <>&mdash;</>}
            </Typography>
          </>
        ) : qualityEditing ? (
          <TextField
            type="text"
            size="small"
            label="Quality"
            value={inlineDraft.quality}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === '') {
                onDraftChange(item.id, { quality: '' });
                return;
              }
              const num = Number(raw);
              if (!Number.isNaN(num)) {
                onDraftChange(item.id, { quality: Math.min(1000, Math.max(0, num)) });
              }
            }}
            onBlur={() => onQualityBlur(rowKey)}
            inputProps={{ inputMode: 'numeric' }}
            inputRef={(el) => setQualityRef(el, rowKey)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                focusController.focus(rowKey, 'save');
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onDraftChange(item.id, { quality: item.quality ?? '' });
                onQualityBlur(rowKey);
              }
            }}
            sx={{ maxWidth: 90 }}
          />
        ) : (
          <Box
            role="button"
            tabIndex={0}
            onClick={() => onActivateField(rowKey, 'quality')}
            onFocus={() => onActivateField(rowKey, 'quality')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onActivateField(rowKey, 'quality');
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
              '&:hover .inline-edit-icon': { opacity: 0.75 },
              '&:focus-visible': {
                outline: '1px solid rgba(74, 158, 255, 0.6)',
                borderRadius: 1,
                outlineOffset: 2,
              },
            }}
            aria-label={`Edit quality for ${item.itemName ?? `Item ${item.catalogEntryId}`}`}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {inlineDraft.quality !== '' ? inlineDraft.quality : (item.quality != null ? item.quality : '—')}
            </Typography>
            <EditIcon
              className="inline-edit-icon"
              fontSize="inherit"
              sx={{ opacity: 0, transition: 'opacity 0.2s ease', flexShrink: 0 }}
            />
          </Box>
        )}
      </Stack>
      <Stack spacing={density === 'compact' ? 0.25 : 0.5}>
        {density !== 'compact' ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Quantity
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, letterSpacing: 0.1 }}
            >
              {Number(item.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}
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
                  if (
                    !Number.isFinite(numeric) ||
                    numeric < MIN_INVENTORY_QUANTITY
                  ) {
                    onErrorChange(item.id, 'Quantity must be at least 0.000001');
                  } else {
                    onErrorChange(item.id, null);
                  }
                }}
                onBlur={() => onQuantityBlur(rowKey)}
                inputProps={{
                  inputMode: 'decimal',
                  pattern: '[0-9]*\\.?[0-9]*',
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
                    onDraftChange(item.id, {
                      quantity: Number(item.quantity) || 0,
                    });
                    onErrorChange(item.id, null);
                    onQuantityBlur(rowKey);
                  }
                }}
                sx={{
                  maxWidth: 120,
                  '& input': {
                    MozAppearance: 'textfield',
                  },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button':
                    {
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
                aria-label={`Edit quantity for ${item.itemName ?? `Item ${item.catalogEntryId}`}`}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, letterSpacing: 0.1 }}
                >
                  {displayQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
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
          {new Date(item.updatedAt || item.createdAt || '').toLocaleDateString()}
        </Typography>
        {Number.isFinite(draftQuantityNumber) &&
          draftQuantityNumber >= EDITOR_MODE_QUANTITY_MAX && (
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              Large quantity entered - verify value.
            </Typography>
          )}
      </Stack>
      {/* Category column */}
      <Stack spacing={density === 'compact' ? 0.25 : 0.5} justifyContent="center">
        <span className="chip-badge neutral" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.categoryName || 'General'}
        </span>
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
            <span className="chip-badge warm">{inlineError}</span>
          )}
          {!inlineError && inlineSaved && (
            <span className="chip-badge success">Saved</span>
          )}
        </Box>
        {density === 'compact' && isDirty && !inlineSaved && !inlineError && (
          <span className="chip-badge neutral" style={{ flexShrink: 0 }}>Unsaved</span>
        )}
        {density === 'compact' ? (
          <>
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
            <Tooltip title="Actions">
              <IconButton size="small" onClick={(event) => onOpenActions?.(event, item)}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
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

const areEqual = (
  prev: InventoryInlineRowProps,
  next: InventoryInlineRowProps,
) =>
  prev.item === next.item &&
  prev.density === next.density &&
  prev.inlineDraft === next.inlineDraft &&
  prev.quantityEditing === next.quantityEditing &&
  prev.qualityEditing === next.qualityEditing &&
  prev.locationEditing === next.locationEditing &&
  prev.inlineLocation === next.inlineLocation &&
  prev.inlineSaving === next.inlineSaving &&
  prev.inlineSaved === next.inlineSaved &&
  prev.inlineError === next.inlineError &&
  prev.isDirty === next.isDirty &&
  prev.isRowActive === next.isRowActive &&
  prev.focusController === next.focusController &&
  prev.rowKey === next.rowKey &&
  prev.onDraftChange === next.onDraftChange &&
  prev.onErrorChange === next.onErrorChange &&
  prev.onQuantityBlur === next.onQuantityBlur &&
  prev.onQualityBlur === next.onQualityBlur &&
  prev.onActivateField === next.onActivateField &&
  prev.onLocationChange === next.onLocationChange &&
  prev.onLocationBlur === next.onLocationBlur &&
  prev.onSave === next.onSave &&
  prev.onOpenActions === next.onOpenActions &&
  prev.setQuantityRef === next.setQuantityRef &&
  prev.setQualityRef === next.setQualityRef &&
  prev.setSaveRef === next.setSaveRef;

export { InventoryInlineRow };
export default memo(InventoryInlineRow, areEqual);
