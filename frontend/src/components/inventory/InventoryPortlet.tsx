import { useState, useEffect, useCallback } from 'react';
import { CircularProgress } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import {
  inventoryService,
  InventoryItem,
} from '../../services/inventory.service';

interface InventoryPortletProps {
  onExpand?: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const InventoryPortlet = ({ onExpand: _onExpand }: InventoryPortletProps) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const rowsPerPage = 8;

  const debouncedSearch = useDebounce(search, 300);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const result = await inventoryService.getInventory({
        limit: rowsPerPage,
        page: page + 1,
        search: debouncedSearch || undefined,
      });
      setItems(result.data);
      setTotalCount(result.total ?? result.data.length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-3)' }}>
      {/* Search */}
      <input
        type="search"
        placeholder="Search items…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--surface-sunken)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', padding: '7px 11px',
          color: 'var(--text-body)', fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)', outline: 'none',
        }}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <CircularProgress size={24} />
        </div>
      ) : items.length === 0 ? (
        <div className="pstub" style={{ flex: 1 }}>
          <InventoryIcon style={{ width: 28, height: 28, opacity: 0.4 }} />
          <span className="pstub-label">
            {debouncedSearch ? 'No items match your search' : 'No inventory items yet'}
          </span>
        </div>
      ) : (
        <>
          {/* Column header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '3fr 1.5fr 1fr 1.5fr',
            gap: 'var(--space-3)',
            padding: '0 var(--space-1)',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
            textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)',
            color: 'var(--text-faint)',
          }}>
            <span>Item</span>
            <span>Category</span>
            <span style={{ textAlign: 'right' }}>Qty</span>
            <span>Location</span>
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1.5fr 1fr 1.5fr',
                  gap: 'var(--space-3)',
                  padding: '7px var(--space-1)',
                  borderBottom: '1px solid var(--border-subtle)',
                  alignItems: 'center',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-strong)', fontWeight: 500 }}>
                  {item.itemName || `Item #${item.catalogEntryId}`}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {item.categoryName || '—'}
                </span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>
                  {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {item.locationName ?? '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalCount > rowsPerPage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              <span>{page * rowsPerPage + 1}–{Math.min(totalCount, (page + 1) * rowsPerPage)} of {totalCount.toLocaleString()}</span>
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                <button className="pcard-act" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous">‹</button>
                <button className="pcard-act" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next">›</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryPortlet;
