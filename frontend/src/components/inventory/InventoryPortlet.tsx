import { useState, useEffect, useCallback, useMemo } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import {
  inventoryService,
  InventoryItem,
  InventoryCategory,
} from '../../services/inventory.service';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function itemIcon(item: InventoryItem) {
  if (item.catalogKind === 'vehicle') return <DirectionsCarIcon />;
  const p = (item.categoryPath || '').toLowerCase();
  if (p.includes('weapon') || p.includes('arm')) return <ShieldOutlinedIcon />;
  return <Inventory2OutlinedIcon />;
}

interface GroupedRow {
  catalogEntryId: string;
  itemName: string;
  categoryName: string;
  totalQuantity: number;
  totalContracted: number;
  subRows: InventoryItem[];
}

function buildGroups(items: InventoryItem[]): GroupedRow[] {
  const map = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const bucket = map.get(item.catalogEntryId) ?? [];
    bucket.push(item);
    map.set(item.catalogEntryId, bucket);
  }
  return Array.from(map.values()).map((rows) => {
    const sorted = [...rows].sort((a, b) => (a.locationName ?? '').localeCompare(b.locationName ?? ''));
    const rep = sorted[0];
    return {
      catalogEntryId: rep.catalogEntryId,
      itemName: rep.itemName || `Item #${rep.catalogEntryId}`,
      categoryName: rep.categoryName,
      totalQuantity: rows.reduce((s, r) => s + Number(r.quantity), 0),
      totalContracted: rows.reduce((s, r) => s + (r.contractedQuantity ?? 0), 0),
      subRows: sorted,
    };
  });
}

const InventoryPortlet = () => {
  const [items, setItems]           = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    inventoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await inventoryService.getInventory({
        limit: 200,
        page: 1,
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
      });
      setItems(result.data);
      setTotalCount(result.total ?? result.data.length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => { setExpanded(new Set()); }, [debouncedSearch, categoryId]);

  const groups = useMemo(() => buildGroups(items), [items]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <>
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
      </div>

      {loading ? (
        <div className="p-empty"><p>Loading…</p></div>
      ) : groups.length === 0 ? (
        <div className="p-empty">
          <Inventory2OutlinedIcon />
          <p>{debouncedSearch || categoryId ? 'No items match your filters.' : 'No inventory items yet.'}</p>
        </div>
      ) : (
        <div className="pcard-scroll">
          <table className="inv-table inv-accordion">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Qty</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const isOpen = expanded.has(group.catalogEntryId);
                const multiLoc = group.subRows.length > 1;
                return (
                  <>
                    <tr
                      key={group.catalogEntryId}
                      className={'inv-group-row' + (isOpen ? ' open' : '') + (multiLoc ? ' expandable' : '')}
                      onClick={() => multiLoc && toggle(group.catalogEntryId)}
                      style={{ cursor: multiLoc ? 'pointer' : 'default' }}
                    >
                      <td>
                        <div className="inv-item">
                          {multiLoc && (
                            <span className="inv-toggle-ic" aria-hidden="true">
                              {isOpen ? <ExpandMoreIcon style={{ width: 14, height: 14 }} /> : <ChevronRightIcon style={{ width: 14, height: 14 }} />}
                            </span>
                          )}
                          {!multiLoc && <span className="inv-toggle-ic inv-toggle-spacer" />}
                          <span className="thumb">{itemIcon(group.subRows[0])}</span>
                          <div>
                            <div className="nm">{group.itemName}</div>
                            <div className="sku">{group.categoryName || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="cell-num">
                        {group.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        {group.totalContracted > 0 && (
                          <span className="chip-badge warm" style={{ marginLeft: 6, fontSize: '10px', padding: '1px 5px' }}>
                            {group.totalContracted.toLocaleString(undefined, { maximumFractionDigits: 6 })} ctr
                          </span>
                        )}
                      </td>
                      <td className="cell-muted">
                        {multiLoc
                          ? <span className="inv-multi-loc">{group.subRows.length} locations</span>
                          : (group.subRows[0].locationName ?? '—')}
                      </td>
                    </tr>
                    {isOpen && group.subRows.map((sub) => (
                      <tr key={sub.id} className="inv-sub-row">
                        <td>
                          <div className="inv-item inv-item--sub">
                            <span className="inv-toggle-ic inv-toggle-spacer" />
                            <span className="inv-sub-indent" />
                            <div className="nm inv-sub-name">{sub.locationName ?? '—'}</div>
                          </div>
                        </td>
                        <td className="cell-num">
                          {Number(sub.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          {(sub.contractedQuantity ?? 0) > 0 && (
                            <span className="chip-badge warm" style={{ marginLeft: 6, fontSize: '10px', padding: '1px 5px' }}>
                              {sub.contractedQuantity!.toLocaleString(undefined, { maximumFractionDigits: 6 })} ctr
                            </span>
                          )}
                        </td>
                        <td className="cell-muted">{sub.locationName ?? '—'}</td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-pagination">
        <span className="p-count">
          {groups.length} item type{groups.length === 1 ? '' : 's'}
          {totalCount > items.length ? ` · ${items.length} of ${totalCount.toLocaleString()} records` : ` · ${items.length} record${items.length === 1 ? '' : 's'}`}
        </span>
      </div>
    </>
  );
};

export default InventoryPortlet;
