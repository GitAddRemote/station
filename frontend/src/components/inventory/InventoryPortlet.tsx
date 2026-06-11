import { useState, useEffect, useCallback } from 'react';
import { CircularProgress } from '@mui/material';
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: 'var(--space-6)' }}>
        <CircularProgress size={24} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pstub">
        <span className="pstub-label">
          {debouncedSearch ? 'No items match your search' : 'No inventory items yet'}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
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
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        {items.map((item) => (
          <div key={item.id} className="prow">
            <span className="l" style={{ maxWidth: '55%' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.itemName || `Item #${item.catalogEntryId}`}
              </span>
            </span>
            <span className="v">
              {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination + count */}
      {totalCount > rowsPerPage && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
          <span>{page * rowsPerPage + 1}–{Math.min(totalCount, (page + 1) * rowsPerPage)} of {totalCount}</span>
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <button
              className="pcard-act"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous"
            >‹</button>
            <button
              className="pcard-act"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next"
            >›</button>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryPortlet;
