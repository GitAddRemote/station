// ============================================================
// Station — Inventory page
// Reimplements the app's Inventory: personal/org views, filters,
// sort, group, density editor mode (inline qty edit + new row),
// row actions (edit/split/share/unshare/delete), catalog add dialog.
// Keyboard-first on the shared app shell.
// ============================================================

const NI = window.StationIcon;
const {
  INV_CATEGORIES,
  UEX_CATALOG,
  INV_ORGS,
  PERSONAL_ITEMS,
  ORG_ITEMS,
  catColor,
  catIcon,
} = window.StationInv;

const qfmt = (n) =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 });
const abbr = (n) =>
  n >= 1e6
    ? (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
    : n >= 1e3
      ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
      : String(Math.round(n));

// ============== row ==============
function InvRow({
  it,
  editing,
  orgMode,
  draft,
  qtyState,
  qtyErr,
  isActive,
  tabIndex,
  regRef,
  onSelect,
  onQtyFocus,
  onQtyChange,
  onQtyCommit,
  onAction,
}) {
  const shared = it.sharedOrgId;
  const org = INV_ORGS.find((o) => o.id === it.sharedOrgId);
  return (
    <tr
      ref={regRef}
      tabIndex={tabIndex}
      aria-selected={isActive}
      onFocus={onSelect}
    >
      <td>
        <div className="t-ent">
          <span className="inv-thumb">
            <NI n={catIcon(it.categoryName)} />
          </span>
          <div>
            <div className="nm">{it.itemName}</div>
            <div className="sub">{it.notes ? it.notes : it.location}</div>
          </div>
        </div>
      </td>
      <td>
        <span
          className="divc"
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}
        >
          <span
            className="catdot"
            style={{ background: catColor(it.categoryName) }}
          ></span>
          {it.categoryName}
        </span>
      </td>
      <td className="qty-cell">
        {editing ? (
          <div>
            <div className="qty-edit">
              <input
                className="qty-input"
                type="text"
                inputMode="decimal"
                value={draft != null ? draft : it.quantity}
                ref={regRef ? undefined : undefined}
                onFocus={onQtyFocus}
                onChange={(e) => onQtyChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onQtyCommit(true);
                  }
                }}
                onBlur={() => onQtyCommit(false)}
                aria-label={'Quantity for ' + it.itemName}
              />
              <span className={'qty-state ' + (qtyState || '')}>
                {qtyState === 'saving' && <NI n="loader" />}
                {qtyState === 'saved' && <NI n="check" />}
              </span>
            </div>
            {qtyErr && <div className="qty-err">{qtyErr}</div>}
          </div>
        ) : (
          <span className="qty-static" tabIndex={-1}>
            {qfmt(it.quantity)}
          </span>
        )}
      </td>
      <td>
        {orgMode ? (
          <StatusPill tone="brand" icon="building-2">
            Org stock
          </StatusPill>
        ) : shared ? (
          <StatusPill tone="success" icon="share-2">
            {org ? org.name : 'Shared'}
          </StatusPill>
        ) : (
          <StatusPill tone="neutral" icon="lock">
            Private
          </StatusPill>
        )}
      </td>
      <td className="t-muted t-mono" style={{ fontSize: 'var(--text-xs)' }}>
        {it.modified}
      </td>
      <td style={{ width: 44 }}>
        <button
          className="row-act"
          aria-label={'Actions for ' + it.itemName}
          onClick={(e) => {
            e.stopPropagation();
            onAction(e.currentTarget, it);
          }}
        >
          <NI n="more-horizontal" />
        </button>
      </td>
    </tr>
  );
}

// ============== new row (editor mode) ==============
function NewRow({ orgMode, onAdd }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const [qty, setQty] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const itemRef = React.useRef(null);
  const matches = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return UEX_CATALOG.slice(0, 8);
    return UEX_CATALOG.filter((c) => c.name.toLowerCase().includes(s)).slice(
      0,
      8,
    );
  }, [q]);
  const choose = (c) => {
    setSel(c);
    setQ(c.name);
    setOpen(false);
  };
  const save = () => {
    if (!sel) {
      itemRef.current && itemRef.current.focus();
      return;
    }
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) return;
    onAdd(sel, n);
    setSel(null);
    setQ('');
    setQty('');
    setHi(0);
    itemRef.current && itemRef.current.focus();
  };
  return (
    <tr className="new-row">
      <td colSpan={2}>
        <div className="new-row-item">
          <NI n="plus" />
          <input
            ref={itemRef}
            value={q}
            placeholder={
              orgMode
                ? 'Add org item — search catalog…'
                : 'Add item — search catalog…'
            }
            onChange={(e) => {
              setQ(e.target.value);
              setSel(null);
              setOpen(true);
              setHi(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHi((h) => Math.min(matches.length - 1, h + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHi((h) => Math.max(0, h - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (matches[hi]) choose(matches[hi]);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && matches.length > 0 && (
            <div className="nr-suggest">
              {matches.map((c, i) => (
                <div
                  key={c.uexId}
                  className={'nr-opt' + (i === hi ? ' active' : '')}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(c);
                  }}
                  onMouseEnter={() => setHi(i)}
                >
                  <span
                    className="catdot"
                    style={{
                      background: catColor(
                        (
                          INV_CATEGORIES.find((x) => x.id === c.categoryId) ||
                          {}
                        ).name,
                      ),
                    }}
                  ></span>
                  <span className="nm">{c.name}</span>
                  <span className="cat">
                    {
                      (INV_CATEGORIES.find((x) => x.id === c.categoryId) || {})
                        .name
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="qty-cell">
        <input
          className="new-row-qty"
          type="text"
          inputMode="decimal"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
          aria-label="New item quantity"
        />
      </td>
      <td colSpan={2}>
        <button className="btn btn-primary btn-sm" onClick={save}>
          <NI n="check" /> Add row
        </button>
      </td>
      <td></td>
    </tr>
  );
}

window.InvRow = InvRow;
window.NewRow = NewRow;
window._invHelpers = { qfmt, abbr };
