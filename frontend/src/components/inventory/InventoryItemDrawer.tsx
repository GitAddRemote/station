import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LayersIcon from '@mui/icons-material/Layers';
import { inventoryService, InventoryItem } from '../../services/inventory.service';

interface SubRow {
  id: string;
  locationName: string | null;
  quality: number | null;
  quantity: number;
  unitOfMeasureCode: string;
  batchId: string | null;
}

interface GroupedRowShape {
  catalogEntryId: string;
  itemName: string;
  catalogKind: 'item' | 'commodity' | 'vehicle';
  categoryName: string;
  totalQuantity: number;
  maxQuality: number | null;
  maxQualityCount: number;
  subRows: InventoryItem[];
  representative: InventoryItem;
}

interface InventoryItemDrawerProps {
  open: boolean;
  group: GroupedRowShape | null;
  onClose: () => void;
  onMutated: () => void;
  onAddToBatch?: (item: InventoryItem) => void;
}

const KIND_LABEL: Record<string, string> = {
  item: 'Item',
  commodity: 'Commodity',
  vehicle: 'Vehicle',
};

export default function InventoryItemDrawer({
  open,
  group,
  onClose,
  onMutated,
  onAddToBatch,
}: InventoryItemDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number | ''>('');
  const [editQuality, setEditQuality] = useState<number | ''>('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = useCallback((row: SubRow & { notes?: string | null }) => {
    setEditingId(row.id);
    setEditQty(row.quantity);
    setEditQuality(row.quality ?? '');
    setEditNotes(row.notes ?? '');
    setSaveError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setSaveError(null);
  }, []);

  const handleSave = async (id: string) => {
    setSaving(true);
    setSaveError(null);
    try {
      await inventoryService.updateItem(id, {
        quantity: editQty === '' ? undefined : Number(editQty),
        quality: editQuality === '' ? null : Number(editQuality),
        notes: editNotes.trim() || null,
      });
      setEditingId(null);
      onMutated();
    } catch {
      setSaveError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (!group) return null;

  const subRows = group.subRows as (InventoryItem & { notes?: string | null })[];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 460,
          bgcolor: 'var(--surface-raised)',
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }} noWrap>
            {group.itemName}
          </Typography>
          <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
            <Chip label={KIND_LABEL[group.catalogKind] ?? group.catalogKind} size="small" />
            <Chip label={group.categoryName} size="small" variant="outlined" />
          </Stack>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close drawer" sx={{ mt: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Summary bar */}
      <Box sx={{ px: 3, py: 1.5, bgcolor: 'var(--surface-overlay)', display: 'flex', gap: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Total qty</Typography>
          <Typography variant="body2" fontWeight={600}>
            {group.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </Typography>
        </Box>
        {group.maxQuality != null && (
          <Box>
            <Typography variant="caption" color="text.secondary">Top quality</Typography>
            <Typography variant="body2" fontWeight={600}>
              {group.maxQuality}
              {group.maxQualityCount > 1 && (
                <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
                  ×{group.maxQualityCount}
                </Typography>
              )}
            </Typography>
          </Box>
        )}
        <Box>
          <Typography variant="caption" color="text.secondary">Stacks</Typography>
          <Typography variant="body2" fontWeight={600}>{subRows.length}</Typography>
        </Box>
      </Box>

      <Divider />

      {/* Sub-rows */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
          Locations &amp; Quality
        </Typography>

        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

        <Stack spacing={1.5}>
          {subRows.map((row) => {
            const isEditing = editingId === row.id;
            return (
              <Box
                key={row.id}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid var(--border-default)',
                  bgcolor: isEditing ? 'var(--surface-overlay)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {isEditing ? (
                  <Stack spacing={1.5}>
                    <Typography variant="caption" color="text.secondary">
                      {row.locationName ?? 'No location'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Quantity"
                        type="number"
                        size="small"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value === '' ? '' : Number(e.target.value))}
                        inputProps={{ min: 0.000001, step: 0.000001 }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Quality (0–1000)"
                        type="number"
                        size="small"
                        value={editQuality}
                        onChange={(e) => setEditQuality(e.target.value === '' ? '' : Number(e.target.value))}
                        inputProps={{ min: 0, max: 1000, step: 1 }}
                        sx={{ flex: 1 }}
                      />
                    </Stack>
                    <TextField
                      label="Notes"
                      size="small"
                      multiline
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      fullWidth
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="text" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSave(row.id)}
                        disabled={saving || editQty === '' || Number(editQty) <= 0}
                        startIcon={saving ? <CircularProgress size={12} /> : undefined}
                      >
                        Save
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {row.locationName ?? 'No location'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Qty: {Number(row.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        {row.quality != null && ` · Quality: ${row.quality}`}
                        {row.batchId && (
                          <> · <LayersIcon sx={{ fontSize: 10, verticalAlign: 'middle', ml: 0.3 }} /> Batched</>
                        )}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {onAddToBatch && !row.batchId && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => onAddToBatch(row)}
                          sx={{ fontSize: '0.7rem', px: 1, minWidth: 0 }}
                        >
                          + Batch
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => startEdit(row)}
                        sx={{ fontSize: '0.7rem', px: 1, minWidth: 0 }}
                      >
                        Edit
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Drawer>
  );
}
