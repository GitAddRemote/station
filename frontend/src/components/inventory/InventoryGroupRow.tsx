import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface InventoryGroupRowProps {
  catalogEntryId: string;
  itemName: string;
  subtypeBadge: string;
  totalQuantity: number;
  filteredQuantity: number;
  isFiltered: boolean;
  childCount: number;
  activeContractCount: number;
  isExpanded: boolean;
  density: 'standard' | 'compact';
  onToggle: (catalogEntryId: string) => void;
}

const InventoryGroupRow = ({
  catalogEntryId,
  itemName,
  subtypeBadge,
  totalQuantity,
  filteredQuantity,
  isFiltered,
  childCount,
  activeContractCount,
  isExpanded,
  density,
  onToggle,
}: InventoryGroupRowProps) => {
  return (
    <Box
      role="row"
      aria-expanded={isExpanded}
      tabIndex={0}
      onClick={() => onToggle(catalogEntryId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(catalogEntryId);
        }
      }}
      sx={{
        display: 'grid',
        gridTemplateColumns: density === 'compact'
          ? '24px 2fr 1fr 1.5fr 0.8fr 1fr 1fr 1fr auto'
          : '24px 2fr 1fr 1.5fr 0.8fr 1fr 1fr 1fr auto',
        gap: density === 'compact' ? 0.75 : 2,
        alignItems: 'center',
        px: density === 'compact' ? 1 : 2,
        py: density === 'compact' ? 0.6 : 1.5,
        cursor: 'pointer',
        background: 'var(--surface-sunken)',
        borderBottom: '1px solid var(--border-subtle)',
        '&:hover': { background: 'color-mix(in srgb, var(--brand) 5%, var(--surface-sunken))' },
        '&:focus-visible': {
          outline: '2px solid var(--brand)',
          outlineOffset: -2,
        },
      }}
    >
      {/* Expand chevron */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRightIcon
          fontSize="small"
          sx={{
            color: 'var(--text-faint)',
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 150ms ease',
          }}
        />
      </Box>

      {/* Item name + badges */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
        <Typography
          variant={density === 'compact' ? 'body2' : 'subtitle1'}
          sx={{ fontWeight: 600 }}
          noWrap
          title={itemName}
        >
          {itemName}
        </Typography>
        <span className="chip-badge neutral" style={{ flexShrink: 0 }}>{subtypeBadge}</span>
        {activeContractCount > 0 && (
          <span className="chip-badge warn" style={{ flexShrink: 0 }}>
            {activeContractCount} transfer active
          </span>
        )}
      </Box>

      {/* Location — empty for group row */}
      <Box />

      {/* Quality — empty for group row */}
      <Box />

      {/* Quantity */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {isFiltered && filteredQuantity !== totalQuantity ? (
          <Typography variant="body2" sx={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            <strong>{filteredQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</strong>
            {' '}
            <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>
              / {totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
          </Typography>
        ) : (
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
          >
            {totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </Typography>
        )}
      </Box>

      {/* Updated — empty for group row */}
      <Box />

      {/* Category — empty for group row */}
      <Box />

      {/* Child count */}
      <Typography variant="caption" sx={{ color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
        {childCount} item{childCount === 1 ? '' : 's'}
      </Typography>

      {/* Actions placeholder */}
      <Box />
    </Box>
  );
};

export default memo(InventoryGroupRow);
