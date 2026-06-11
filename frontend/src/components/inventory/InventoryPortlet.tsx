import { useState, useEffect, useCallback } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import IosShareIcon from '@mui/icons-material/IosShare';
import PersonIcon from '@mui/icons-material/Person';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  inventoryService,
  InventoryItem,
  InventoryCategory,
} from '../../services/inventory.service';

interface InventoryPortletProps {
  onExpand?: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function categoryIcon(categoryPath: string) {
  const p = (categoryPath || '').toLowerCase();
  if (p.includes('weapon') || p.includes('arm'))  return <ShieldOutlinedIcon />;
  if (p.includes('vehicle') || p.includes('ship')) return <Inventory2OutlinedIcon />;
  return <Inventory2OutlinedIcon />;
}

const InventoryPortlet = ({ onExpand: _onExpand }: InventoryPortletProps) => {
  const [items, setItems]         = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [page, setPage]           = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount]   = useState(0);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    inventoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
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
  }, [debouncedSearch, categoryId, sharedOnly, page, rowsPerPage]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { setPage(0); }, [debouncedSearch, categoryId, sharedOnly]);

  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const start = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const end   = Math.min(totalCount, (page + 1) * rowsPerPage);

  return (
    <>
      {/* Controls toolbar */}
      <div className="portlet-controls">
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className="p-select">
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
          <ExpandMoreIcon />
        </div>

        <div
          className={'p-toggle' + (sharedOnly ? ' on' : '')}
          role="switch"
          aria-checked={sharedOnly}
          tabIndex={0}
          onClick={() => setSharedOnly((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? setSharedOnly((v) => !v) : undefined}
        >
          <span className="p-switch" />
          <span>Shared only</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-empty">
          <p>Loading…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-empty">
          <Inventory2OutlinedIcon />
          <p>{debouncedSearch || categoryId || sharedOnly ? 'No items match your filters.' : 'No inventory items yet.'}</p>
        </div>
      ) : (
        <table className="inv-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th className="num">Quantity</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="inv-item">
                    <span className="thumb">
                      {categoryIcon(item.categoryPath)}
                    </span>
                    <div>
                      <div className="nm">{item.itemName || `Item #${item.catalogEntryId}`}</div>
                      <div className="sku">{item.categoryPath || item.categoryName || '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="cell-muted">{item.categoryName || '—'}</td>
                <td className="cell-num">
                  {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </td>
                <td className="cell-muted">{item.locationName ?? '—'}</td>
                <td>
                  {item.ownerType === 'user' && item.sharedByUsername
                    ? <span className="chip-badge brand"><PersonIcon style={{ width: 11, height: 11 }} /> {item.sharedByUsername}</span>
                    : item.isOrgAvailable
                      ? <span className="chip-badge success"><IosShareIcon /> Shared</span>
                      : <span className="chip-badge neutral"><LockOutlinedIcon /> Private</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="p-pagination">
        <span className="p-count">{start}–{end} of {totalCount.toLocaleString()}</span>
        <div className="rpp">
          Rows per page:
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
          >
            {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
            <ChevronLeftIcon style={{ width: 16, height: 16 }} />
          </button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
            <ChevronRightIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </>
  );
};

export default InventoryPortlet;
