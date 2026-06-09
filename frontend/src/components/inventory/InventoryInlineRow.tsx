import { memo } from 'react';
import type { MouseEvent } from 'react';
import {
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
import type {
  InventoryItem,
  OrgInventoryItem,
} from '../../services/inventory.service';
import type { FocusController } from '../../utils/focusController';

const EDITOR_MODE_QUANTITY_MAX = 999999.999999;
const MIN_INVENTORY_QUANTITY = 0.000001;

export type InventoryRecord = InventoryItem | OrgInventoryItem;

interface InventoryInlineRowProps {
  item: InventoryRecord;
  density: 'standard' | 'compact';
  inlineDraft: { quantity: number | '' };
  quantityEditing: boolean;
  inlineSaving: boolean;
  inlineSaved?: boolean;
  inlineError?: string | null;
  isDirty: boolean;
  isRowActive: boolean;
  focusController: FocusController<string, 'quantity' | 'save'>;
  rowKey: string;
  onDraftChange: (
    itemId: string,
    changes: Partial<{ quantity: number | '' }>,
  ) => void;
  onErrorChange: (itemId: string, message: string | null) => void;
  onQuantityBlur: (rowKey: string) => void;
  onActivateField: (
    rowKey: string,
    field: 'quantity',
    initialInput?: string,
  ) => void;
  onSave: (item: InventoryRecord) => void;
  onOpenActions?: (
    event: MouseEvent<HTMLElement>,
    item: InventoryRecord,
  ) => void;
  setQuantityRef: (ref: HTMLInputElement | null, key: string) => void;
  setSaveRef: (ref: HTMLButtonElement | null, key: string) => void;
}

const InventoryInlineRow = ({
  item,
  density,
  inlineDraft,
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
  onQuantityBlur,
  onActivateField,
  onSave,
  onOpenActions,
  setQuantityRef,
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
          md:
            density === 'compact'
              ? '2fr 1fr 1fr 1fr auto'
              : '2fr 1fr 1fr 1fr auto',
        },
        gap: density === 'compact' ? 0.75 : 2,
        alignItems: 'center',
        px: density === 'compact' ? 1 : 2,
        py: density === 'compact' ? 0.45 : 1.5,
        backgroundColor: isRowActive
          ? 'rgba(74, 158, 255, 0.08)'
          : 'transparent',
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
            title={item.itemName || `Item #${item.catalogEntryId}`}
          >
            {item.itemName || `Item #${item.catalogEntryId}`}
          </Typography>
          <Chip
            label={item.categoryName || 'General'}
            size={density === 'compact' ? 'small' : 'medium'}
            variant="outlined"
          />
          {item.isOrgAvailable && (
            <Chip
              size={density === 'compact' ? 'small' : 'medium'}
              color="primary"
              variant="outlined"
              label="Shared"
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
              &mdash;
            </Typography>
          </>
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            &mdash;
          </Typography>
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

const areEqual = (
  prev: InventoryInlineRowProps,
  next: InventoryInlineRowProps,
) =>
  prev.item === next.item &&
  prev.density === next.density &&
  prev.inlineDraft === next.inlineDraft &&
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
  prev.onQuantityBlur === next.onQuantityBlur &&
  prev.onActivateField === next.onActivateField &&
  prev.onSave === next.onSave &&
  prev.onOpenActions === next.onOpenActions &&
  prev.setQuantityRef === next.setQuantityRef &&
  prev.setSaveRef === next.setSaveRef;

export { InventoryInlineRow };
export default memo(InventoryInlineRow, areEqual);
