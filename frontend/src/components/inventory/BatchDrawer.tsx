import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LayersIcon from '@mui/icons-material/Layers';
import LocationPicker from './LocationPicker';
import { batchService, BatchDto, BatchLocationConflictItem } from '../../services/batch.service';
import { LocationDto } from '../../services/catalog.service';
import { InventoryItem } from '../../services/inventory.service';
import { api } from '../../services/api.service';

export type BatchDrawerMode =
  | { kind: 'create' }
  | { kind: 'add-to-batch'; item: InventoryItem }
  | { kind: 'detail'; batchId: string };

interface BatchDrawerProps {
  open: boolean;
  mode: BatchDrawerMode | null;
  onClose: () => void;
  onMutated: () => void;
}

interface ConflictState {
  batchId: string;
  itemIds: string[];
  conflictingItems: BatchLocationConflictItem[];
  force: boolean;
}

const DRAWER_WIDTH = 440;

export default function BatchDrawer({ open, mode, onClose, onMutated }: BatchDrawerProps) {
  const [createName, setCreateName] = useState('');
  const [createLocation, setCreateLocation] = useState<LocationDto | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createWorking, setCreateWorking] = useState(false);

  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [addWorking, setAddWorking] = useState<string | null>(null);

  const [detail, setDetail] = useState<BatchDto | null>(null);
  const [detailItems, setDetailItems] = useState<InventoryItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState<LocationDto | null>(null);
  const [editWorking, setEditWorking] = useState(false);
  const [removeWorking, setRemoveWorking] = useState<string | null>(null);

  const [conflict, setConflict] = useState<ConflictState | null>(null);

  const reset = useCallback(() => {
    setCreateName('');
    setCreateLocation(null);
    setCreateError(null);
    setCreateWorking(false);
    setBatches([]);
    setBatchesLoading(false);
    setBatchesError(null);
    setAddWorking(null);
    setDetail(null);
    setDetailItems([]);
    setDetailLoading(false);
    setDetailError(null);
    setEditName('');
    setEditLocation(null);
    setEditWorking(false);
    setRemoveWorking(null);
    setConflict(null);
  }, []);

  useEffect(() => {
    if (!open) { reset(); return; }
    if (!mode) return;

    if (mode.kind === 'add-to-batch') {
      setBatchesLoading(true);
      setBatchesError(null);
      batchService.list().then((r) => {
        setBatches(r.data);
        setBatchesLoading(false);
      }).catch(() => {
        setBatchesError('Failed to load batches.');
        setBatchesLoading(false);
      });
    }

    if (mode.kind === 'detail') {
      setDetailLoading(true);
      setDetailError(null);
      Promise.all([
        api.get<BatchDto>(`/api/inventory/batches/${mode.batchId}`).then((r) => r.data),
        api.get<{ data: InventoryItem[] }>('/api/inventory/items', {
          params: { batchId: mode.batchId, limit: 200 },
        }).then((r) => r.data.data).catch(() => [] as InventoryItem[]),
      ]).then(([b, items]) => {
        setDetail(b);
        setDetailItems(items);
        setEditName(b.name);
        setEditLocation(b.locationId ? { id: b.locationId, name: b.locationName ?? '' } as LocationDto : null);
        setDetailLoading(false);
      }).catch(() => {
        setDetailError('Failed to load batch.');
        setDetailLoading(false);
      });
    }
  }, [open, mode, reset]);

  const handleCreate = async () => {
    if (!createName.trim() || !createLocation) return;
    setCreateWorking(true);
    setCreateError(null);
    try {
      await batchService.create(createName.trim(), createLocation.id);
      onMutated();
      onClose();
    } catch {
      setCreateError('Failed to create batch.');
    } finally {
      setCreateWorking(false);
    }
  };

  const handleAddToBatch = async (batch: BatchDto, item: InventoryItem, force = false) => {
    setAddWorking(batch.id);
    try {
      await batchService.addItems(batch.id, [item.id], force);
      onMutated();
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: unknown } })?.response?.status;
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      if (status === 409 && data && typeof data === 'object' && 'conflictingItems' in data) {
        setConflict({
          batchId: batch.id,
          itemIds: [item.id],
          conflictingItems: (data as { conflictingItems: BatchLocationConflictItem[] }).conflictingItems,
          force: false,
        });
      } else {
        setBatchesError('Failed to add item to batch.');
      }
    } finally {
      setAddWorking(null);
    }
  };

  const handleApproveConflict = async () => {
    if (!conflict || !mode) return;
    if (mode.kind === 'add-to-batch') {
      await handleAddToBatch(
        batches.find((b) => b.id === conflict.batchId)!,
        mode.item,
        true,
      );
    } else if (mode.kind === 'detail') {
      await handleDetailSave(true);
    }
    setConflict(null);
  };

  const handleDetailSave = async (force = false) => {
    if (!detail) return;
    const patch: { name?: string; locationId?: string } = {};
    if (editName.trim() && editName.trim() !== detail.name) patch.name = editName.trim();
    if (editLocation && editLocation.id !== detail.locationId) patch.locationId = editLocation.id;
    if (Object.keys(patch).length === 0) return;

    setEditWorking(true);
    try {
      const updated = await batchService.update(detail.id, patch, force);
      setDetail(updated);
      setEditName(updated.name);
      setEditLocation({ id: updated.locationId, name: updated.locationName ?? '' } as LocationDto);
      onMutated();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: unknown } })?.response?.status;
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      if (status === 409 && data && typeof data === 'object' && 'conflictingItems' in data) {
        setConflict({
          batchId: detail.id,
          itemIds: [],
          conflictingItems: (data as { conflictingItems: BatchLocationConflictItem[] }).conflictingItems,
          force: false,
        });
      } else {
        setDetailError('Failed to update batch.');
      }
    } finally {
      setEditWorking(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!detail) return;
    setRemoveWorking(itemId);
    try {
      await batchService.removeItem(detail.id, itemId);
      setDetailItems((prev) => prev.filter((i) => i.id !== itemId));
      setDetail((prev) => prev ? { ...prev, itemCount: prev.itemCount - 1 } : prev);
      onMutated();
    } catch {
      setDetailError('Failed to remove item.');
    } finally {
      setRemoveWorking(null);
    }
  };

  const title =
    mode?.kind === 'create' ? 'New batch'
    : mode?.kind === 'add-to-batch' ? 'Add to batch'
    : detail?.name ?? 'Batch';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: DRAWER_WIDTH,
          bgcolor: 'var(--surface-raised)',
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid var(--border-subtle)' }}>
        <LayersIcon fontSize="small" sx={{ color: 'var(--text-muted)' }} />
        <Typography variant="h6" sx={{ flex: 1, fontSize: '1rem', fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close drawer">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Conflict warning step */}
      {conflict && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
              <WarningAmberIcon />
              <Typography fontWeight={600}>Location mismatch</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              The following items will be moved to <strong>{conflict.conflictingItems[0]?.targetLocationName}</strong>:
            </Typography>
            <List dense disablePadding sx={{ bgcolor: 'var(--surface-overlay)', borderRadius: 1, overflow: 'hidden' }}>
              {conflict.conflictingItems.map((ci) => (
                <ListItem key={ci.id} divider sx={{ px: 2 }}>
                  <ListItemText
                    primary={ci.name}
                    secondary={`Currently at: ${ci.currentLocationName ?? 'No location'}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="text" onClick={() => setConflict(null)}>Cancel</Button>
              <Button variant="contained" color="warning" onClick={handleApproveConflict}>
                Approve &amp; relocate
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Create batch */}
      {!conflict && mode?.kind === 'create' && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Stack spacing={2}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              label="Batch name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              inputProps={{ maxLength: 255 }}
              fullWidth
              autoFocus
              size="small"
            />
            <LocationPicker
              value={createLocation}
              onChange={setCreateLocation}
              size="small"
            />
            <Button
              variant="contained"
              disabled={!createName.trim() || !createLocation || createWorking}
              onClick={handleCreate}
              startIcon={createWorking ? <CircularProgress size={14} /> : undefined}
            >
              Create batch
            </Button>
          </Stack>
        </Box>
      )}

      {/* Add to batch — pick from list */}
      {!conflict && mode?.kind === 'add-to-batch' && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Stack spacing={1.5}>
            {batchesError && <Alert severity="error">{batchesError}</Alert>}
            {batchesLoading && <CircularProgress size={24} sx={{ mx: 'auto' }} />}
            {!batchesLoading && batches.length === 0 && (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                No batches yet. Create one first.
              </Typography>
            )}
            {batches.map((batch) => (
              <Box
                key={batch.id}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid var(--border-default)',
                  bgcolor: 'var(--surface-overlay)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{batch.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {batch.locationName ?? 'No location'} · {batch.itemCount} items
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={addWorking === batch.id}
                  onClick={() => handleAddToBatch(batch, mode.item)}
                  startIcon={addWorking === batch.id ? <CircularProgress size={12} /> : undefined}
                >
                  Add
                </Button>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Batch detail */}
      {!conflict && mode?.kind === 'detail' && (
        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {detailLoading && <CircularProgress size={24} sx={{ m: 'auto' }} />}
          {detailError && <Alert severity="error" sx={{ m: 2 }}>{detailError}</Alert>}
          {!detailLoading && detail && (
            <>
              {/* Edit fields */}
              <Box sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <TextField
                    label="Batch name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    inputProps={{ maxLength: 255 }}
                    fullWidth
                    size="small"
                  />
                  <LocationPicker
                    value={editLocation}
                    onChange={setEditLocation}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={
                      editWorking ||
                      (!editName.trim() || editName.trim() === detail.name) &&
                      (editLocation?.id === detail.locationId)
                    }
                    onClick={() => handleDetailSave(false)}
                    startIcon={editWorking ? <CircularProgress size={14} /> : undefined}
                  >
                    Save changes
                  </Button>
                </Stack>
              </Box>

              <Divider />

              {/* Items list */}
              <Box sx={{ px: 3, pt: 2, pb: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" color="text.secondary">
                    Items
                  </Typography>
                  <Chip label={detail.itemCount} size="small" />
                </Stack>
              </Box>

              {detailItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4} px={3}>
                  No items in this batch yet.
                </Typography>
              ) : (
                <List dense disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
                  {detailItems.map((item) => (
                    <ListItem
                      key={item.id}
                      divider
                      sx={{ px: 3 }}
                      secondaryAction={
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          disabled={removeWorking === item.id}
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          {removeWorking === item.id ? <CircularProgress size={12} /> : 'Remove'}
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={item.alias ?? item.itemName}
                        secondary={`${item.locationName ?? 'No location'} · qty ${item.quantity}`}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </Box>
      )}
    </Drawer>
  );
}
