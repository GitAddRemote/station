// ============================================================
// Station — Inventory page (main)
// ============================================================

const II = window.StationIcon;
const SInv = window.StationInv;

function InventoryPage() {
  const toast = window.__toast || (() => {});
  const { qfmt, abbr } = window._invHelpers;

  const [view, setView] = React.useState('personal'); // personal | org
  const [orgId, setOrgId] = React.useState(1);
  const orgMode = view === 'org';
  const org = SInv.INV_ORGS.find((o) => o.id === orgId);
  const canManage = orgMode
    ? org && (org.perms.includes('edit') || org.perms.includes('admin'))
    : true;

  const [personal, setPersonal] = React.useState(SInv.PERSONAL_ITEMS);
  const [orgItems, setOrgItems] = React.useState(SInv.ORG_ITEMS);
  const source = orgMode ? orgItems : personal;
  const setSource = orgMode ? setOrgItems : setPersonal;

  // filters / sort / group / density
  const [search, setSearch] = React.useState('');
  const [catId, setCatId] = React.useState('');
  const [sharedOnly, setSharedOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState('date');
  const [sortDir, setSortDir] = React.useState('desc');
  const [groupBy, setGroupBy] = React.useState('none');
  const [density, setDensity] = React.useState('standard'); // standard | compact(editor)
  const editing = density === 'compact' && canManage;
  const [page, setPage] = React.useState(0);
  const [rpp, setRpp] = React.useState(25);

  // inline edit state
  const [drafts, setDrafts] = React.useState({});
  const [qtyState, setQtyState] = React.useState({}); // id -> saving|saved
  const [qtyErr, setQtyErr] = React.useState({});
  const [activeId, setActiveId] = React.useState(null);

  // action popover + catalog
  const [action, setAction] = React.useState(null); // {mode, item, anchorRect}
  const [catalogOpen, setCatalogOpen] = React.useState(false);

  React.useEffect(() => {
    setPage(0);
  }, [search, catId, sharedOnly, view, orgId]);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  // filtered + sorted
  const filtered = React.useMemo(() => {
    let r = source.filter((it) => {
      if (
        search &&
        !it.itemName.toLowerCase().includes(search.toLowerCase()) &&
        !(it.notes || '').toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (catId && it.categoryName !== SInv.catById(catId).name) return false;
      if (!orgMode && sharedOnly && !it.sharedOrgId) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    r = [...r].sort((a, b) => {
      if (sortBy === 'name') return a.itemName.localeCompare(b.itemName) * dir;
      if (sortBy === 'quantity') return (a.quantity - b.quantity) * dir;
      return (a.id - b.id) * dir; // date proxy
    });
    return r;
  }, [source, search, catId, sharedOnly, orgMode, sortBy, sortDir]);

  // group
  const groups = React.useMemo(() => {
    if (groupBy === 'none') return [['All items', filtered]];
    const m = new Map();
    filtered.forEach((it) => {
      const key =
        groupBy === 'category'
          ? it.categoryName
          : it.sharedOrgId
            ? 'Shared'
            : 'Private';
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(it);
    });
    return [...m.entries()];
  }, [filtered, groupBy]);

  // pagination applies only when ungrouped
  const paged =
    groupBy === 'none'
      ? filtered.slice(page * rpp, page * rpp + rpp)
      : filtered;
  const pageGroups = groupBy === 'none' ? [['All items', paged]] : groups;
  const totalPages = Math.max(1, Math.ceil(filtered.length / rpp));

  // stats
  const totalQty = source.reduce((s, x) => s + Number(x.quantity), 0);
  const sharedCount = source.filter((x) => x.sharedOrgId).length;
  const catCount = new Set(source.map((x) => x.categoryName)).size;

  // ---- inline qty ----
  const onQtyChange = (it, v) => {
    setDrafts((d) => ({ ...d, [it.id]: v }));
    setQtyErr((e) => ({ ...e, [it.id]: null }));
  };
  const onQtyCommit = (it, advance) => {
    const raw = drafts[it.id];
    if (raw == null) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      setQtyErr((e) => ({ ...e, [it.id]: 'Must be greater than 0' }));
      return;
    }
    if (n === Number(it.quantity)) {
      setDrafts((d) => {
        const c = { ...d };
        delete c[it.id];
        return c;
      });
      return;
    }
    setQtyState((s) => ({ ...s, [it.id]: 'saving' }));
    setTimeout(() => {
      setSource((arr) =>
        arr.map((x) =>
          x.id === it.id ? { ...x, quantity: n, modified: 'just now' } : x,
        ),
      );
      setQtyState((s) => ({ ...s, [it.id]: 'saved' }));
      setDrafts((d) => {
        const c = { ...d };
        delete c[it.id];
        return c;
      });
      setTimeout(
        () =>
          setQtyState((s) => {
            const c = { ...s };
            delete c[it.id];
            return c;
          }),
        1200,
      );
    }, 420);
  };

  // ---- add from catalog / new row ----
  const addItem = (catItem, quantity, notes) => {
    const cat = SInv.INV_CATEGORIES.find((c) => c.id === catItem.categoryId);
    const existing = source.find((x) => x.uexItemId === catItem.uexId);
    if (existing) {
      setSource((arr) =>
        arr.map((x) =>
          x.id === existing.id
            ? {
                ...x,
                quantity: Number(x.quantity) + Number(quantity),
                modified: 'just now',
              }
            : x,
        ),
      );
      toast('Merged into ' + catItem.name, 'git-merge');
    } else {
      const nid = Math.max(0, ...source.map((x) => x.id)) + 1;
      setSource((arr) => [
        {
          id: nid,
          uexItemId: catItem.uexId,
          itemName: catItem.name,
          categoryName: cat.name,
          quantity: Number(quantity),
          notes: notes || '',
          sharedOrgId: null,
          location: orgMode ? 'Org vault' : 'Personal hangar',
          modified: 'just now',
        },
        ...arr,
      ]);
      toast('Added ' + catItem.name, 'check');
    }
  };

  // ---- row actions ----
  const openAction = (anchor, item) => {
    const r = anchor.getBoundingClientRect();
    setAction({ mode: 'menu', item, rect: r });
  };
  const doEdit = (item, quantity, notes) => {
    setSource((arr) =>
      arr.map((x) =>
        x.id === item.id
          ? { ...x, quantity: Number(quantity), notes, modified: 'just now' }
          : x,
      ),
    );
    toast('Updated ' + item.itemName, 'check');
    setAction(null);
  };
  const doSplit = (item, amount) => {
    const a = Number(amount);
    if (a <= 0 || a >= Number(item.quantity)) {
      toast('Split must be less than current qty', 'triangle-alert');
      return;
    }
    const nid = Math.max(0, ...source.map((x) => x.id)) + 1;
    setSource((arr) =>
      arr.flatMap((x) =>
        x.id === item.id
          ? [
              { ...x, quantity: Number(x.quantity) - a, modified: 'just now' },
              {
                ...x,
                id: nid,
                quantity: a,
                sharedOrgId: null,
                notes: '',
                modified: 'just now',
              },
            ]
          : [x],
      ),
    );
    toast('Split ' + qfmt(a) + ' off ' + item.itemName, 'split');
    setAction(null);
  };
  const doShare = (item, shareOrgId) => {
    setSource((arr) =>
      arr.map((x) =>
        x.id === item.id
          ? { ...x, sharedOrgId: Number(shareOrgId), modified: 'just now' }
          : x,
      ),
    );
    toast('Shared ' + item.itemName, 'share-2');
    setAction(null);
  };
  const doUnshare = (item) => {
    setSource((arr) =>
      arr.map((x) =>
        x.id === item.id
          ? { ...x, sharedOrgId: null, modified: 'just now' }
          : x,
      ),
    );
    toast('Unshared ' + item.itemName, 'lock');
    setAction(null);
  };
  const doDelete = (item) => {
    setSource((arr) => arr.filter((x) => x.id !== item.id));
    toast('Deleted ' + item.itemName, 'trash-2');
    setAction(null);
  };

  const InvRow = window.InvRow,
    NewRow = window.NewRow;
  const cycleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            <II n="archive" /> Assets <II n="chevron-right" /> Inventory
          </div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-sub">
            Track everything you own and what your org holds — refined ore,
            components, weapons, and trade goods. Edit quantities inline, split
            stacks, and share with your org.
          </p>
        </div>
        <div className="page-actions">
          <Segmented
            options={[
              { value: 'personal', label: 'Personal', icon: 'user-round' },
              { value: 'org', label: 'Organization', icon: 'building-2' },
            ]}
            value={view}
            onChange={setView}
            ariaLabel="Inventory view"
          />
          {orgMode && (
            <span
              className="inv-orgsel"
              role="button"
              tabIndex="0"
              onClick={() => setOrgId((id) => (id === 1 ? 2 : 1))}
              aria-label="Switch organization"
            >
              <span className="badge">{org.badge}</span>
              {org.name}
              <II n="chevrons-up-down" />
            </span>
          )}
          {(!orgMode || canManage) && (
            <button
              className="btn btn-primary btn-sm"
              id="inv-new"
              onClick={() => setCatalogOpen(true)}
            >
              <II n="plus" /> {orgMode ? 'Add org item' : 'Add item'}{' '}
              <span className="kbd" style={{ marginLeft: 6 }}>
                <kbd>n</kbd>
              </span>
            </button>
          )}
        </div>
      </div>

      {orgMode && (
        <div className={'perm-bar ' + (canManage ? 'manage' : 'view')}>
          <II n={canManage ? 'shield-check' : 'eye'} />
          {canManage ? (
            <span>
              You have <strong>manage</strong> access to {org.name} inventory —
              add, edit, split, and delete org stock.
            </span>
          ) : (
            <span>
              You have <strong>view-only</strong> access to {org.name}{' '}
              inventory. Ask an admin for edit rights to make changes.
            </span>
          )}
          <span className="grow"></span>
          <span
            className="t-mono"
            style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}
          >
            {org.perms.join(' · ').toUpperCase()}
          </span>
        </div>
      )}

      <StatStrip
        items={[
          {
            k: orgMode ? 'Org records' : 'My records',
            icon: 'package',
            v: source.length,
            d: catCount + ' categories',
          },
          {
            k: 'Total quantity',
            icon: 'layers',
            v: abbr(totalQty),
            d: 'units on hand',
          },
          {
            k: orgMode ? 'Org stock' : 'Shared items',
            icon: orgMode ? 'building-2' : 'share-2',
            v: orgMode ? source.length : sharedCount,
            d: orgMode ? 'visible to members' : 'shared to orgs',
            tone: 'up',
          },
          { k: 'Categories', icon: 'tag', v: catCount, d: 'item families' },
        ]}
      />

      <div className="inv-toolbar">
        <label className="inv-search">
          <II n="search" />
          <input
            value={search}
            placeholder="Search items, notes…"
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search inventory"
          />
        </label>
        <span className="inv-select">
          <II n="tag" className="lead" />
          <select
            value={catId}
            onChange={(e) =>
              setCatId(e.target.value ? Number(e.target.value) : '')
            }
            aria-label="Category filter"
          >
            <option value="">All categories</option>
            {SInv.INV_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <II n="chevron-down" className="chev" />
        </span>
        {!orgMode && (
          <button
            className="fchip"
            aria-pressed={sharedOnly}
            onClick={() => setSharedOnly((v) => !v)}
          >
            <II n="share-2" /> Shared only
          </button>
        )}
        <span className="inv-select">
          <II n="arrow-down-up" className="lead" />
          <select
            value={sortBy + ':' + sortDir}
            onChange={(e) => {
              const [k, d] = e.target.value.split(':');
              setSortBy(k);
              setSortDir(d);
            }}
            aria-label="Sort"
          >
            <option value="date:desc">Newest first</option>
            <option value="date:asc">Oldest first</option>
            <option value="name:asc">Name A–Z</option>
            <option value="name:desc">Name Z–A</option>
            <option value="quantity:desc">Quantity high–low</option>
            <option value="quantity:asc">Quantity low–high</option>
          </select>
          <II n="chevron-down" className="chev" />
        </span>
        <span className="inv-select">
          <II n="group" className="lead" />
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            aria-label="Group by"
          >
            <option value="none">No grouping</option>
            <option value="category">Group by category</option>
            <option value="share">Group by share status</option>
          </select>
          <II n="chevron-down" className="chev" />
        </span>
        <span className="inv-spacer"></span>
        {canManage && (
          <div className="density-toggle" role="group" aria-label="Density">
            <button
              aria-pressed={density === 'standard'}
              onClick={() => setDensity('standard')}
              title="Standard view"
              aria-label="Standard view"
            >
              <II n="rows-3" />
            </button>
            <button
              aria-pressed={density === 'compact'}
              onClick={() => setDensity('compact')}
              title="Editor mode — inline editing"
              aria-label="Editor mode"
            >
              <II n="pencil-ruler" />
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="dtable-wrap" style={{ marginTop: 'var(--space-6)' }}>
          <div className="inv-empty">
            <div className="e-ic">
              <II n="package-open" />
            </div>
            <h3>No inventory matches your filters</h3>
            <p>
              Adjust filters or{' '}
              {canManage ? 'add a new item' : 'sync new items'} to get started.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{ marginTop: 'var(--space-6)' }}
          className={editing ? 'editor' : ''}
        >
          {pageGroups.map(([gname, gitems], gi) => (
            <div
              className={'grp-section' + (groupBy === 'none' ? ' single' : '')}
              key={gname}
            >
              {groupBy !== 'none' && (
                <div className="grp-header">
                  <span className="gchip">{gname}</span>
                  <span className="gcount">
                    {gitems.length} item{gitems.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}
              <div className="dtable-wrap">
                <table
                  className="dtable inv-table"
                  aria-label={'Inventory — ' + gname}
                >
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th className="num">Quantity</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editing && gi === 0 && groupBy === 'none' && (
                      <NewRow orgMode={orgMode} onAdd={addItem} />
                    )}
                    {gitems.map((it) => (
                      <InvRow
                        key={it.id}
                        it={it}
                        editing={editing}
                        orgMode={orgMode}
                        draft={drafts[it.id]}
                        qtyState={qtyState[it.id]}
                        qtyErr={qtyErr[it.id]}
                        isActive={activeId === it.id}
                        onSelect={() => setActiveId(it.id)}
                        onQtyFocus={() => setActiveId(it.id)}
                        onQtyChange={(v) => onQtyChange(it, v)}
                        onQtyCommit={(adv) => onQtyCommit(it, adv)}
                        onAction={openAction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {groupBy === 'none' && (
            <div className="inv-pager">
              <div className="rpp">
                Rows per page
                <select
                  value={rpp}
                  onChange={(e) => {
                    setRpp(Number(e.target.value));
                    setPage(0);
                  }}
                  aria-label="Rows per page"
                >
                  {[10, 25, 50, 100, 250].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <span>
                {filtered.length === 0 ? 0 : page * rpp + 1}–
                {Math.min(filtered.length, (page + 1) * rpp)} of{' '}
                {filtered.length}
              </span>
              <div className="pager">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label="Previous page"
                >
                  <II n="chevron-left" />
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  aria-label="Next page"
                >
                  <II n="chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {action && action.mode === 'menu' && (
        <ActionMenu
          action={action}
          orgMode={orgMode}
          onClose={() => setAction(null)}
          onPick={(mode) => setAction({ ...action, mode })}
          onUnshare={() => doUnshare(action.item)}
        />
      )}
      {action && action.mode && action.mode !== 'menu' && (
        <ActionDialog
          action={action}
          orgs={SInv.INV_ORGS}
          onClose={() => setAction(null)}
          onEdit={doEdit}
          onSplit={doSplit}
          onShare={doShare}
          onDelete={doDelete}
        />
      )}

      {catalogOpen && (
        <CatalogDialog
          orgMode={orgMode}
          orgName={org && org.name}
          onClose={() => setCatalogOpen(false)}
          onAdd={addItem}
        />
      )}
    </>
  );
}

// ---- row action menu (popover) ----
function ActionMenu({ action, orgMode, onClose, onPick, onUnshare }) {
  const { item, rect } = action;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  const style = {
    position: 'fixed',
    top: Math.min(rect.bottom + 6, window.innerHeight - 230),
    left: Math.max(12, rect.right - 200),
    width: 196,
    zIndex: 160,
  };
  const items = [
    { mode: 'edit', icon: 'pencil', label: 'Edit' },
    { mode: 'split', icon: 'split', label: 'Split' },
    ...(!orgMode ? [{ mode: 'share', icon: 'share-2', label: 'Share' }] : []),
    ...(!orgMode && item.sharedOrgId
      ? [{ unshare: true, icon: 'lock', label: 'Unshare' }]
      : []),
    { mode: 'delete', icon: 'trash-2', label: 'Delete', danger: true },
  ];
  return (
    <div
      className="scrim"
      style={{ background: 'transparent', backdropFilter: 'none' }}
      onMouseDown={onClose}
    >
      <div
        className="act-pop"
        style={style}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 6 }}>
          {items.map((m, i) => (
            <button
              key={i}
              className="cmdk-item"
              style={{
                width: '100%',
                color: m.danger ? 'var(--coral-400)' : undefined,
              }}
              onClick={() => {
                if (m.unshare) onUnshare();
                else onPick(m.mode);
              }}
            >
              <span
                className="ic"
                style={
                  m.danger
                    ? {
                        background:
                          'color-mix(in srgb, var(--coral-500) 16%, transparent)',
                        color: 'var(--coral-400)',
                      }
                    : undefined
                }
              >
                <II n={m.icon} />
              </span>
              <span className="lbl">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- action dialogs (edit/split/share/delete) ----
function ActionDialog({
  action,
  orgs,
  onClose,
  onEdit,
  onSplit,
  onShare,
  onDelete,
}) {
  const { mode, item } = action;
  const [qty, setQty] = React.useState(String(item.quantity));
  const [notes, setNotes] = React.useState(item.notes || '');
  const [splitAmt, setSplitAmt] = React.useState('');
  const [shareOrg, setShareOrg] = React.useState('');
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [mode]);
  const titles = {
    edit: 'Edit item',
    split: 'Split stack',
    share: 'Share with org',
    delete: 'Delete item',
  };
  const icons = {
    edit: 'pencil',
    split: 'split',
    share: 'share-2',
    delete: 'trash-2',
  };
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="act-pop"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ marginTop: '14vh' }}
        role="dialog"
        aria-label={titles[mode]}
      >
        <div className="act-pop-head">
          <span className={'ic' + (mode === 'delete' ? ' danger' : '')}>
            <II n={icons[mode]} />
          </span>
          <span className="t">{titles[mode]}</span>
          <button className="ibtn" onClick={onClose} aria-label="Close">
            <II n="x" />
          </button>
        </div>
        <div className="act-pop-body">
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-strong)',
              fontWeight: 'var(--weight-medium)',
            }}
          >
            {item.itemName}
          </div>
          {mode === 'edit' && (
            <>
              <div>
                <label className="field-lbl">Quantity</label>
                <input
                  className="field-in mono"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="field-lbl">Notes</label>
                <textarea
                  className="field-in"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note…"
                ></textarea>
              </div>
            </>
          )}
          {mode === 'split' && (
            <>
              <p className="act-note">
                Current quantity:{' '}
                <strong>{window._invHelpers.qfmt(item.quantity)}</strong>. The
                split amount becomes a new stack.
              </p>
              <div>
                <label className="field-lbl">Quantity to split off</label>
                <input
                  className="field-in mono"
                  value={splitAmt}
                  onChange={(e) => setSplitAmt(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </div>
            </>
          )}
          {mode === 'share' && (
            <>
              <p className="act-note">
                Make this item visible to one of your organizations.
              </p>
              <div>
                <label className="field-lbl">Organization</label>
                <span
                  className="inv-select"
                  style={{ width: '100%', height: 40 }}
                >
                  <II n="building-2" className="lead" />
                  <select
                    value={shareOrg}
                    onChange={(e) => setShareOrg(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                  >
                    <option value="">Select organization…</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <II n="chevron-down" className="chev" />
                </span>
              </div>
            </>
          )}
          {mode === 'delete' && (
            <p className="act-note">
              Remove{' '}
              <strong style={{ color: 'var(--text-strong)' }}>
                {item.itemName}
              </strong>{' '}
              from this inventory? You can re-add it later from the catalog.
            </p>
          )}
        </div>
        <div className="act-pop-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          {mode === 'edit' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onEdit(item, qty, notes)}
            >
              <II n="check" /> Save
            </button>
          )}
          {mode === 'split' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onSplit(item, splitAmt)}
            >
              <II n="split" /> Split
            </button>
          )}
          {mode === 'share' && (
            <button
              className="btn btn-primary btn-sm"
              disabled={!shareOrg}
              onClick={() => shareOrg && onShare(item, shareOrg)}
            >
              <II n="share-2" /> Share
            </button>
          )}
          {mode === 'delete' && (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--coral-500)', color: '#fff' }}
              onClick={() => onDelete(item)}
            >
              <II n="trash-2" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- catalog add dialog ----
function CatalogDialog({ orgMode, orgName, onClose, onAdd }) {
  const [q, setQ] = React.useState('');
  const [catId, setCatId] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const [qty, setQty] = React.useState('1');
  const [notes, setNotes] = React.useState('');
  const [hi, setHi] = React.useState(0);
  const searchRef = React.useRef(null);
  React.useEffect(() => {
    setTimeout(() => searchRef.current && searchRef.current.focus(), 20);
  }, []);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const results = React.useMemo(() => {
    let r = window.StationInv.UEX_CATALOG;
    if (catId) r = r.filter((c) => c.categoryId === Number(catId));
    if (q.trim())
      r = r.filter((c) =>
        c.name.toLowerCase().includes(q.trim().toLowerCase()),
      );
    return r;
  }, [q, catId]);
  React.useEffect(() => {
    setSel(results[0] || null);
    setHi(0);
  }, [q, catId]);

  const ready = sel && Number(qty) > 0;
  const submit = (stay) => {
    if (!ready) return;
    onAdd(sel, Number(qty), notes);
    if (stay) {
      setQty('1');
      setNotes('');
      searchRef.current && searchRef.current.focus();
    } else onClose();
  };
  const onListKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const n = Math.min(results.length - 1, hi + 1);
      setHi(n);
      setSel(results[n]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.max(0, hi - 1);
      setHi(n);
      setSel(results[n]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit(false);
    }
  };

  return (
    <div
      className="scrim"
      onMouseDown={onClose}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          submit(true);
        }
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="catalog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add inventory item"
      >
        <div className="catalog-head">
          <span className="t">
            {orgMode ? 'Add org item · ' + orgName : 'Add inventory item'}
          </span>
          <button className="ibtn" onClick={onClose} aria-label="Close">
            <II n="x" />
          </button>
        </div>
        <div className="catalog-grid">
          <div className="catalog-left">
            <div>
              <label className="field-lbl">Search catalog</label>
              <label
                className="inv-search"
                style={{ maxWidth: 'none', width: '100%' }}
              >
                <II n="search" />
                <input
                  ref={searchRef}
                  value={q}
                  placeholder="Search UEX items…"
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
            </div>
            <div>
              <label className="field-lbl">Category</label>
              <span
                className="inv-select"
                style={{ width: '100%', height: 40 }}
              >
                <II n="tag" className="lead" />
                <select
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">All</option>
                  {window.StationInv.INV_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <II n="chevron-down" className="chev" />
              </span>
            </div>
            <div>
              <label className="field-lbl">Quantity</label>
              <div className="stepper">
                <input
                  className="field-in mono"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() =>
                    setQty((v) => String(Math.max(1, (Number(v) || 0) - 1)))
                  }
                  aria-label="Decrease"
                >
                  <II n="minus" />
                </button>
                <button
                  onClick={() => setQty((v) => String((Number(v) || 0) + 1))}
                  aria-label="Increase"
                >
                  <II n="plus" />
                </button>
              </div>
            </div>
            <div>
              <label className="field-lbl">Notes</label>
              <input
                className="field-in"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional…"
              />
            </div>
          </div>
          <div className="catalog-right">
            <div className="cr-head">
              <span className="lbl">Catalog results</span>
              <span className="cnt">{results.length} items</span>
            </div>
            <div
              className="cat-list"
              tabIndex={0}
              onKeyDown={onListKey}
              role="listbox"
              aria-label="Catalog items"
            >
              {results.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--space-8)',
                    textAlign: 'center',
                    color: 'var(--text-faint)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  No catalog items match.
                </div>
              ) : (
                results.map((c, i) => {
                  const cat = window.StationInv.INV_CATEGORIES.find(
                    (x) => x.id === c.categoryId,
                  );
                  return (
                    <div
                      key={c.uexId}
                      className={
                        'cat-opt' + (sel && sel.uexId === c.uexId ? ' sel' : '')
                      }
                      tabIndex={-1}
                      role="option"
                      aria-selected={sel && sel.uexId === c.uexId}
                      onClick={() => {
                        setSel(c);
                        setHi(i);
                      }}
                    >
                      <span className="radio"></span>
                      <span
                        className="catdot"
                        style={{ background: cat.color, alignSelf: 'center' }}
                      ></span>
                      <div style={{ flex: 1 }}>
                        <div className="nm">{c.name}</div>
                        <div className="ct">{cat.name}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <div className="catalog-foot">
          <span className="tip">
            <span className="kbd">
              <kbd>⌘</kbd>
              <kbd>↵</kbd>
            </span>{' '}
            add &amp; keep open ·{' '}
            <span className="kbd">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
            </span>{' '}
            browse
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-ghost btn-sm"
            disabled={!ready}
            onClick={() => submit(true)}
          >
            Add &amp; stay
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!ready}
            onClick={() => submit(false)}
          >
            <II n="check" /> Add &amp; close
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryApp() {
  const commands = [
    {
      id: 'inv-add',
      group: 'Inventory',
      icon: 'plus',
      label: 'Add inventory item',
      hint: 'n',
      run: () => window.__toast && window.__toast('Opening catalog', 'plus'),
    },
    {
      id: 'inv-personal',
      group: 'Inventory',
      icon: 'user-round',
      label: 'View personal inventory',
      run: () => window.__toast && window.__toast('Personal inventory'),
    },
    {
      id: 'inv-org',
      group: 'Inventory',
      icon: 'building-2',
      label: 'View org inventory',
      run: () => window.__toast && window.__toast('Org inventory'),
    },
    {
      id: 'inv-editor',
      group: 'Inventory',
      icon: 'pencil-ruler',
      label: 'Toggle editor mode',
      run: () => window.__toast && window.__toast('Editor mode'),
    },
  ];
  const helpExtra = [
    ['Add item', ['n']],
    ['Switch view', ['←', '→']],
    ['Inline edit qty', ['↵']],
    ['Add & keep open', ['⌘', '↵']],
  ];
  return (
    <AppShell
      active="inventory"
      commands={commands}
      helpExtra={helpExtra}
      onNew={() => {
        const b = document.getElementById('inv-new');
        if (b) b.click();
      }}
      searchPlaceholder="Search items, categories…"
    >
      <InventoryPage />
    </AppShell>
  );
}

window.InventoryApp = InventoryApp;
