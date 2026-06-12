import { memo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import { InventoryItem } from '../../services/inventory.service';

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

interface InventoryCardProps {
  group: GroupedRowShape;
  onClick: (group: GroupedRowShape) => void;
}

const KIND_COLOR: Record<string, string> = {
  commodity: 'var(--amber-500)',
  vehicle: 'var(--blue-400)',
  item: 'var(--green-400)',
};

const InventoryCard = memo(function InventoryCard({ group, onClick }: InventoryCardProps) {
  const hasBatchedItem = group.subRows.some((r) => r.batchId);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onClick(group)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(group)}
      className="inv-card"
      sx={{
        p: 2.5,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        bgcolor: 'var(--surface-raised)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'border-color 0.15s, background 0.15s',
        outline: 'none',
        '&:hover, &:focus-visible': {
          borderColor: 'var(--border-focus)',
          bgcolor: 'var(--surface-overlay)',
        },
      }}
    >
      {/* Top row: kind badge + batch indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={group.catalogKind}
          size="small"
          sx={{
            fontSize: '0.65rem',
            height: 18,
            bgcolor: KIND_COLOR[group.catalogKind] + '22',
            color: KIND_COLOR[group.catalogKind],
            border: `1px solid ${KIND_COLOR[group.catalogKind]}44`,
          }}
        />
        {hasBatchedItem && (
          <Box
            title="Has items in a batch"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: 'var(--text-muted)', ml: 'auto' }}
          >
            <LayersIcon sx={{ fontSize: 13 }} />
          </Box>
        )}
      </Box>

      {/* Item name */}
      <Typography
        variant="body1"
        fontWeight={700}
        sx={{
          lineHeight: 1.3,
          color: 'var(--text-strong)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {group.itemName}
      </Typography>

      {/* Category */}
      <Typography variant="caption" color="text.secondary" noWrap>
        {group.categoryName}
      </Typography>

      {/* Footer: quantity + quality pill */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 'auto' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Total qty</Typography>
          <Typography variant="body2" fontWeight={700}>
            {group.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </Typography>
        </Box>
        {group.maxQuality != null && (
          <Box
            className="quality-pill"
            sx={{ fontSize: '0.72rem', px: 1, py: 0.25, borderRadius: 'var(--radius-pill)', display: 'flex', gap: 0.5 }}
          >
            <span>{group.maxQuality}</span>
            {group.maxQualityCount > 1 && (
              <span className="quality-pill-count">×{group.maxQualityCount}</span>
            )}
          </Box>
        )}
      </Box>

      {/* Stack count */}
      <Typography variant="caption" color="text.secondary">
        {group.subRows.length} stack{group.subRows.length !== 1 ? 's' : ''}
        {group.subRows.length > 1 && ` across ${new Set(group.subRows.map((r) => r.locationId)).size} location${new Set(group.subRows.map((r) => r.locationId)).size !== 1 ? 's' : ''}`}
      </Typography>
    </Box>
  );
});

export default InventoryCard;
