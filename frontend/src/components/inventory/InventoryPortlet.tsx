import { useState, useEffect, useCallback } from 'react';
import { CircularProgress } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LayersIcon from '@mui/icons-material/Layers';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import {
  inventoryService,
  InventoryItem,
  InventoryCategory,
} from '../../services/inventory.service';
import '../../pages/Inventory.css';

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
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const rowsPerPage = 8;

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    inventoryService.getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const result = await inventoryService.getInventory({
        limit: rowsPerPage,
        page: page + 1,
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        orgAvailable: sharedOnly || undefined,
      });
      setItems(result.data);
      setTotalCount(result.total ?? result.data.length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId, sharedOnly, page]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { setPage(0); }, [debouncedSearch, categoryId, sharedOnly]);

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-3)' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div className="inv-search" style={{ flex: '1 1 180px', minWidth: 180 }}>
          <Inventory2OutlinedIcon style={{ width: 15, height: 15 }} />
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="inv-select">
          <LocalOfferIcon className="lead" />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Shared toggle */}
        <button
          className="fchip"
          aria-pressed={sharedOnly}
          onClick={() => setSharedOnly((v) => !v)}
          style={{ height: 36 }}
        >
          <LayersIcon style={{ width: 14, height: 14 }} />
          Shared only
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5)', flex: 1 }}>
          <CircularProgress size={22} />
        </div>
      ) : items.length === 0 ? (
        <div className="pstub" style={{ flex: 1 }}>
          <Inventory2OutlinedIcon style={{ width: 28, height: 28, opacity: 0.4 }} />
          <span className="pstub-label">
            {debouncedSearch || categoryId || sharedOnly ? 'No items match your filters' : 'No inventory items yet'}
          </span>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.2fr 1fr 1.4fr 80px',
            gap: 'var(--space-3)',
            padding: '6px var(--space-4)',
            background: 'var(--surface-sunken)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
            textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)',
            color: 'var(--text-faint)',
          }}>
            <span>Item</span>
            <span>Category</span>
            <span style={{ textAlign: 'right' }}>Qty</span>
            <span><PlaceOutlinedIcon style={{ width: 11, height: 11, verticalAlign: 'middle' }} /> Location</span>
            <span>Status</span>
          </div>

          {/* Rows */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr 1.4fr 80px',
                  gap: 'var(--space-3)',
                  padding: '8px var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  alignItems: 'center',
                  transition: `background ${150}ms ease`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {/* Item name + icon */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
                  <span className="inv-thumb" style={{ width: 26, height: 26, flexShrink: 0 }}>
                    <Inventory2OutlinedIcon style={{ width: 13, height: 13 }} />
                  </span>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: 'var(--text-strong)', fontWeight: 500, fontSize: 'var(--text-sm)',
                  }}>
                    {item.itemName || `Item #${item.catalogEntryId}`}
                  </span>
                </span>

                {/* Category */}
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--text-muted)', fontSize: 'var(--text-xs)',
                }}>
                  {item.categoryName || '—'}
                </span>

                {/* Qty */}
                <span style={{
                  textAlign: 'right',
                  fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-sm)',
                  color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>

                {/* Location */}
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--text-muted)', fontSize: 'var(--text-xs)',
                }}>
                  {item.locationName ?? '—'}
                </span>

                {/* Status dot */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)' }}>
                  <span className="pdots">
                    <i className={item.isOrgAvailable ? 'ok' : 'off'} />
                  </span>
                  <span style={{ color: item.isOrgAvailable ? 'var(--success-500)' : 'var(--text-faint)' }}>
                    {item.isOrgAvailable ? 'Shared' : 'Private'}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* Footer: count + pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            <span>
              {page * rowsPerPage + 1}–{Math.min(totalCount, (page + 1) * rowsPerPage)} of {totalCount.toLocaleString()} items
            </span>
            {totalCount > rowsPerPage && (
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                <button className="pcard-act" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">‹</button>
                <button className="pcard-act" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page">›</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryPortlet;
