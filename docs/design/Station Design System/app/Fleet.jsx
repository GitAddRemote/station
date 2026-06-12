// ============================================================
// Station — Fleet management page
// Three views: Org Fleet (leadership manages owned ships),
// My Ships (members manage personal ships + offer them to the org),
// and Member-Offered (org-rentable capacity it doesn't own).
// Keyboard-first: roving tables, Enter opens, tabs via ← →.
// ============================================================

const FI = window.StationIcon;

const ROLE = {
  combat: { icon: 'crosshair', label: 'Combat', cls: 'role-combat' },
  mining: { icon: 'gem', label: 'Mining', cls: 'role-mining' },
  salvage: { icon: 'recycle', label: 'Salvage', cls: 'role-salvage' },
  hauling: { icon: 'container', label: 'Hauling', cls: 'role-hauling' },
  explore: { icon: 'compass', label: 'Exploration', cls: 'role-explore' },
  transport: { icon: 'users', label: 'Transport', cls: 'role-transport' },
  medical: { icon: 'cross', label: 'Medical', cls: 'role-medical' },
  support: { icon: 'wrench', label: 'Support', cls: 'role-support' },
};
const SHIP_STATUS = {
  ready: { tone: 'success', icon: 'circle-check', label: 'Ready' },
  deployed: { tone: 'info', icon: 'navigation', label: 'Deployed' },
  repair: { tone: 'warn', icon: 'wrench', label: 'In repair' },
  stored: { tone: 'neutral', icon: 'warehouse', label: 'Stored' },
};

// ---- org-owned fleet ----
const ORG_FLEET = [
  {
    id: 'AV-01',
    ship: 'Polaris',
    mfr: 'RSI',
    role: 'combat',
    status: 'deployed',
    captain: 'hezeqiah',
    crew: 14,
    cargo: 576,
    loc: 'Aaron Halo · Patrol',
    flag: true,
    note: 'Org flagship — corvette',
  },
  {
    id: 'AV-02',
    ship: 'Hammerhead',
    mfr: 'Aegis',
    role: 'combat',
    status: 'ready',
    captain: 'Dax Moreno',
    crew: 9,
    cargo: 40,
    loc: 'Everus Harbor · Hangar 2',
  },
  {
    id: 'AV-03',
    ship: 'Reclaimer',
    mfr: 'Aegis',
    role: 'salvage',
    status: 'repair',
    captain: 'Kova Rhys',
    crew: 5,
    cargo: 420,
    loc: 'CRU-L1 · Repair bay',
    note: 'Hull integrity 62% — in repair',
  },
  {
    id: 'AV-04',
    ship: 'Hull C',
    mfr: 'MISC',
    role: 'hauling',
    status: 'deployed',
    captain: 'Iris Tanaka',
    crew: 4,
    cargo: 4608,
    loc: 'ARC → Hurston run',
  },
  {
    id: 'AV-05',
    ship: 'Carrack',
    mfr: 'Anvil',
    role: 'explore',
    status: 'stored',
    captain: '—',
    crew: 6,
    cargo: 456,
    loc: 'New Babbage · Storage',
  },
  {
    id: 'AV-06',
    ship: 'Argo MOLE',
    mfr: 'Argo',
    role: 'mining',
    status: 'ready',
    captain: 'Vesper Calderon',
    crew: 3,
    cargo: 96,
    loc: 'Lyria · Outpost',
  },
  {
    id: 'AV-07',
    ship: 'Valkyrie',
    mfr: 'Anvil',
    role: 'transport',
    status: 'ready',
    captain: '—',
    crew: 5,
    cargo: 30,
    loc: 'Everus Harbor · Hangar 5',
  },
  {
    id: 'AV-08',
    ship: 'A2 Hercules',
    mfr: 'Crusader',
    role: 'combat',
    status: 'stored',
    captain: '—',
    crew: 4,
    cargo: 216,
    loc: 'Area18 · Storage',
  },
];

// ---- current member's personal ships (hezeqiah) ----
const MY_SHIPS = [
  {
    id: 'MY-1',
    ship: 'F8C Lightning',
    mfr: 'Anvil',
    role: 'combat',
    crew: 1,
    cargo: 0,
    offered: true,
    rate: 0,
    who: 'Leadership',
  },
  {
    id: 'MY-2',
    ship: 'Vulture',
    mfr: 'Drake',
    role: 'salvage',
    crew: 1,
    cargo: 12,
    offered: true,
    rate: 25000,
    who: 'Any member',
  },
  {
    id: 'MY-3',
    ship: 'Prospector',
    mfr: 'MISC',
    role: 'mining',
    crew: 1,
    cargo: 32,
    offered: false,
    rate: 0,
    who: 'Leadership',
  },
  {
    id: 'MY-4',
    ship: 'Cutlass Black',
    mfr: 'Drake',
    role: 'transport',
    crew: 3,
    cargo: 46,
    offered: false,
    rate: 18000,
    who: 'Leadership',
  },
  {
    id: 'MY-5',
    ship: 'Constellation Andromeda',
    mfr: 'RSI',
    role: 'combat',
    crew: 4,
    cargo: 96,
    offered: false,
    rate: 0,
    who: 'Leadership',
  },
];

// ---- ships members have offered to the org (org doesn't own) ----
const OFFERED = [
  {
    id: 'OF-1',
    ship: 'Constellation Phoenix',
    mfr: 'RSI',
    role: 'transport',
    owner: 'Vesper Calderon',
    crew: 4,
    cargo: 96,
    rate: 45000,
    status: 'available',
    who: 'Leadership',
  },
  {
    id: 'OF-2',
    ship: 'Redeemer',
    mfr: 'Aegis',
    role: 'combat',
    owner: 'Dax Moreno',
    crew: 5,
    cargo: 6,
    rate: 60000,
    status: 'available',
    who: 'Leadership',
  },
  {
    id: 'OF-3',
    ship: 'Caterpillar',
    mfr: 'Drake',
    role: 'hauling',
    owner: 'Kova Rhys',
    crew: 4,
    cargo: 576,
    rate: 30000,
    status: 'onloan',
    who: 'Any member',
    borrowedBy: 'Org haul · Op Ironwake',
  },
  {
    id: 'OF-4',
    ship: 'Carrack',
    mfr: 'Anvil',
    role: 'explore',
    owner: 'Iris Tanaka',
    crew: 6,
    cargo: 456,
    rate: 0,
    status: 'available',
    who: 'Leadership',
  },
  {
    id: 'OF-5',
    ship: 'Vulture',
    mfr: 'Drake',
    role: 'salvage',
    owner: 'hezeqiah',
    crew: 1,
    cargo: 12,
    rate: 25000,
    status: 'available',
    who: 'Any member',
  },
];

const fmt = (n) => Math.round(n).toLocaleString('en-US');
const initials = (s) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// ============== ORG FLEET VIEW ==============
function OrgFleetRow({ s, selected, tabIndex, regRef, onSelect }) {
  const r = ROLE[s.role],
    st = SHIP_STATUS[s.status];
  return (
    <tr
      ref={regRef}
      tabIndex={tabIndex}
      aria-selected={selected}
      onClick={onSelect}
      onFocus={onSelect}
    >
      <td>
        <div className="t-ent">
          <span className={'ic ' + r.cls}>
            <FI n={r.icon} />
          </span>
          <div>
            <div className="nm">
              {s.mfr} {s.ship}{' '}
              {s.flag && (
                <FI
                  n="star"
                  style={{
                    width: 13,
                    height: 13,
                    color: 'var(--brand)',
                    verticalAlign: 'middle',
                  }}
                />
              )}
            </div>
            <div className="sub">
              {s.id} · {r.label}
            </div>
          </div>
        </div>
      </td>
      <td>
        {s.captain === '—' ? (
          <span className="t-muted">Unassigned</span>
        ) : (
          <window.AvatarChip name={s.captain} />
        )}
      </td>
      <td>
        <div className="fleet-meta">
          <span>
            <FI n="users" />
            <span className="t-mono">{s.crew}</span>
          </span>
          <span>
            <FI n="container" />
            <span className="t-mono">{fmt(s.cargo)}</span>
          </span>
        </div>
      </td>
      <td>
        <StatusPill tone={st.tone} icon={st.icon}>
          {st.label}
        </StatusPill>
      </td>
    </tr>
  );
}

function OrgFleetDetail({ s }) {
  const r = ROLE[s.role],
    st = SHIP_STATUS[s.status];
  const tint = {
    combat: 'var(--coral-300)',
    mining: 'var(--aqua-300)',
    salvage: '#D9A6E6',
    hauling: 'var(--warning-500)',
    explore: 'var(--teal-300)',
    transport: '#9AA6F5',
    medical: 'var(--success-500)',
    support: 'var(--text-muted)',
  }[s.role];
  return (
    <div className="panel detail">
      <div className="panel-body">
        <div className="ship-hero">
          <span className={'ic ' + r.cls}>
            <FI n={r.icon} />
          </span>
          <div className="h">
            <div className="t">
              {s.mfr} {s.ship}
            </div>
            <div className="mfr">
              {s.id} · {r.label} {s.flag && '· Flagship'}
            </div>
          </div>
          <StatusPill tone={st.tone} icon={st.icon}>
            {st.label}
          </StatusPill>
        </div>
        <div className="spec-grid" style={{ marginTop: 'var(--space-4)' }}>
          <div className="spec">
            <div className="sk">
              <FI n="users" /> Crew
            </div>
            <div className="sv">
              {s.crew}
              <small>seats</small>
            </div>
          </div>
          <div className="spec">
            <div className="sk">
              <FI n="container" /> Cargo
            </div>
            <div className="sv">
              {fmt(s.cargo)}
              <small>SCU</small>
            </div>
          </div>
        </div>
      </div>
      <div className="detail-section">
        <div className="ds-cap">
          <span>Assignment</span>
        </div>
        <div className="kv">
          <span className="k">
            <FI n="user-round" /> Captain
          </span>
          <span className="v">{s.captain}</span>
        </div>
        <div className="kv">
          <span className="k">
            <FI n="map-pin" /> Location
          </span>
          <span className="v">{s.loc}</span>
        </div>
        <div className="kv">
          <span className="k">
            <FI n="shield" /> Role
          </span>
          <span className="v">{r.label}</span>
        </div>
        {s.note && (
          <div className="kv">
            <span className="k">
              <FI n="info" /> Note
            </span>
            <span
              className="v"
              style={{ fontWeight: 400, color: 'var(--text-muted)' }}
            >
              {s.note}
            </span>
          </div>
        )}
      </div>
      <div
        className="panel-body"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 'var(--space-3)',
        }}
      >
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
          <FI n="user-plus" /> Assign crew
        </button>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
          <FI n="navigation" /> Set status
        </button>
        <button className="btn btn-ghost btn-sm" aria-label="Ship settings">
          <FI n="settings-2" />
        </button>
      </div>
    </div>
  );
}

function OrgFleetView() {
  const [selId, setSelId] = React.useState(ORG_FLEET[0].id);
  const sel = ORG_FLEET.find((s) => s.id === selId);
  const roving = window.useRoving(ORG_FLEET.length, {
    onActivate: (i) => setSelId(ORG_FLEET[i].id),
  });
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return (
    <div className="split">
      <div className="dtable-wrap">
        <table
          className="dtable"
          role="grid"
          aria-label="Org fleet"
          onKeyDown={roving.onKeyDown}
        >
          <thead>
            <tr>
              <th>Ship</th>
              <th>Captain</th>
              <th>Capacity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ORG_FLEET.map((s, i) => (
              <OrgFleetRow
                key={s.id}
                s={s}
                selected={s.id === selId}
                tabIndex={roving.getTab(i)}
                regRef={roving.register(i)}
                onSelect={() => {
                  setSelId(s.id);
                  roving.setIdx(i);
                }}
              />
            ))}
          </tbody>
        </table>
        <div className="list-hint">
          <span className="kbd">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
          </span>{' '}
          move{' '}
          <span className="kbd">
            <kbd>↵</kbd>
          </span>{' '}
          open{' '}
          <span style={{ marginLeft: 'auto' }}>
            {ORG_FLEET.length} org ships
          </span>
        </div>
      </div>
      {sel && <OrgFleetDetail s={sel} />}
    </div>
  );
}

// ============== MY SHIPS VIEW ==============
function MyShipOffer({ s, onToggle, onToast }) {
  const r = ROLE[s.role];
  return (
    <div className={'offer' + (s.offered ? ' on' : '')}>
      <div className="offer-head">
        <span className={'ic ' + r.cls}>
          <FI n={r.icon} />
        </span>
        <div className="h">
          <div className="t">
            {s.mfr} {s.ship}
          </div>
          <div className="s">
            <span>{r.label}</span>
            <span>·</span>
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <FI n="users" style={{ width: 13, height: 13 }} />
              {s.crew} crew
            </span>
            <span>·</span>
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <FI n="container" style={{ width: 13, height: 13 }} />
              {fmt(s.cargo)} SCU
            </span>
          </div>
        </div>
        <div className="offer-toggle">
          <span className="lbl">
            <strong>{s.offered ? 'Offered to org' : 'Private'}</strong>
            {s.offered
              ? s.rate
                ? fmt(s.rate) + ' aUEC/day'
                : 'Free for org'
              : 'Not shared'}
          </span>
          <button
            className="swtch"
            role="switch"
            aria-checked={s.offered}
            aria-label={'Offer ' + s.ship + ' to org'}
            onClick={() => {
              onToggle(s.id);
              onToast(
                s.offered
                  ? s.ship + ' withdrawn from org'
                  : s.ship + ' offered to org',
                s.offered ? 'lock' : 'check',
              );
            }}
          ></button>
        </div>
      </div>
      {s.offered && (
        <div className="terms">
          <div className="field">
            <div className="fl">Rate</div>
            <div className="control" tabIndex="0" role="button">
              {s.rate ? (
                <span className="mono">{fmt(s.rate)}</span>
              ) : (
                <span className="rate-free">Free</span>
              )}
              <span className="t-muted" style={{ fontSize: 'var(--text-xs)' }}>
                {s.rate ? 'aUEC/day' : ''}
              </span>
              <FI n="pencil" />
            </div>
          </div>
          <div className="field">
            <div className="fl">Who can request</div>
            <div className="control" tabIndex="0" role="button">
              {s.who}
              <FI n="chevron-down" />
            </div>
          </div>
          <div className="field">
            <div className="fl">Status</div>
            <div
              className="control"
              tabIndex="0"
              role="button"
              style={{ cursor: 'default' }}
            >
              <StatusPill tone="success" icon="circle-check">
                Available
              </StatusPill>
            </div>
          </div>
          <div className="terms-note">
            <FI n="shield-check" /> Leadership can see this ship as rentable
            capacity. You stay the owner and can withdraw it anytime.
          </div>
        </div>
      )}
    </div>
  );
}

function MyShipsView({ ships, setShips }) {
  const toast = window.__toast || (() => {});
  const onToggle = (id) =>
    setShips((arr) =>
      arr.map((s) => (s.id === id ? { ...s, offered: !s.offered } : s)),
    );
  const offeredCount = ships.filter((s) => s.offered).length;
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return (
    <div>
      <div className="offer-summary">
        <span className="ic">
          <FI n="hand-helping" />
        </span>
        <div className="txt">
          <div className="tt">
            {offeredCount} of {ships.length} ships offered to Atlas Vanguard
          </div>
          <div className="ss">
            Toggle a ship to make it available for org operations. You keep
            ownership and set the terms.
          </div>
        </div>
        <button className="btn btn-ghost btn-sm">
          <FI n="plus" /> Add ship
        </button>
      </div>
      <div className="offer-list">
        {ships.map((s) => (
          <MyShipOffer key={s.id} s={s} onToggle={onToggle} onToast={toast} />
        ))}
      </div>
    </div>
  );
}

// ============== MEMBER-OFFERED VIEW ==============
function OfferedRow({ s, selected, tabIndex, regRef, onSelect }) {
  const r = ROLE[s.role];
  const onloan = s.status === 'onloan';
  return (
    <tr
      ref={regRef}
      tabIndex={tabIndex}
      aria-selected={selected}
      onClick={onSelect}
      onFocus={onSelect}
    >
      <td>
        <div className="t-ent">
          <span className={'ic ' + r.cls}>
            <FI n={r.icon} />
          </span>
          <div>
            <div className="nm">
              {s.mfr} {s.ship}
            </div>
            <div className="sub">{r.label}</div>
          </div>
        </div>
      </td>
      <td>
        <window.AvatarChip name={s.owner} />
      </td>
      <td className="num">
        {s.rate ? (
          <span className="rate-pill">
            {fmt(s.rate)} <small>/day</small>
          </span>
        ) : (
          <span className="rate-free">Free</span>
        )}
      </td>
      <td>
        {onloan ? (
          <StatusPill tone="info" icon="navigation">
            On loan
          </StatusPill>
        ) : (
          <StatusPill tone="brand" icon="circle-check">
            Available
          </StatusPill>
        )}
      </td>
    </tr>
  );
}

function OfferedDetail({ s }) {
  const r = ROLE[s.role];
  const onloan = s.status === 'onloan';
  return (
    <div className="panel detail">
      <div className="panel-body">
        <div className="ship-hero">
          <span className={'ic ' + r.cls}>
            <FI n={r.icon} />
          </span>
          <div className="h">
            <div className="t">
              {s.mfr} {s.ship}
            </div>
            <div className="mfr">
              {r.label} · owned by {s.owner}
            </div>
          </div>
          {onloan ? (
            <StatusPill tone="info" icon="navigation">
              On loan
            </StatusPill>
          ) : (
            <StatusPill tone="brand" icon="circle-check">
              Available
            </StatusPill>
          )}
        </div>
        <div className="spec-grid" style={{ marginTop: 'var(--space-4)' }}>
          <div className="spec">
            <div className="sk">
              <FI n="users" /> Crew
            </div>
            <div className="sv">
              {s.crew}
              <small>seats</small>
            </div>
          </div>
          <div className="spec">
            <div className="sk">
              <FI n="container" /> Cargo
            </div>
            <div className="sv">
              {fmt(s.cargo)}
              <small>SCU</small>
            </div>
          </div>
        </div>
      </div>
      <div className="detail-section">
        <div className="ds-cap">
          <span>Rental terms</span>
        </div>
        <div className="kv">
          <span className="k">
            <FI n="coins" /> Rate
          </span>
          <span className="v brand">
            {s.rate ? fmt(s.rate) + ' aUEC / day' : 'Free for org ops'}
          </span>
        </div>
        <div className="kv">
          <span className="k">
            <FI n="key-round" /> Who can request
          </span>
          <span className="v">{s.who}</span>
        </div>
        <div className="kv">
          <span className="k">
            <FI n="user-round" /> Owner
          </span>
          <span className="v">{s.owner}</span>
        </div>
        {onloan && (
          <div className="kv">
            <span className="k">
              <FI n="navigation" /> Current use
            </span>
            <span
              className="v"
              style={{ fontWeight: 400, color: 'var(--text-muted)' }}
            >
              {s.borrowedBy}
            </span>
          </div>
        )}
      </div>
      <div className="detail-section">
        <div className="ds-cap">
          <span>Request to use</span>
        </div>
        <div className="req-box">
          <span
            className="ic role-explore"
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-sm)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <FI n="calendar-clock" />
          </span>
          <div className="who">
            <div className="nm">
              {onloan
                ? 'Currently on loan to the org'
                : 'Reserve for an operation'}
            </div>
            <div className="rt">
              {onloan
                ? 'Returns after Op Ironwake'
                : s.rate
                  ? fmt(s.rate) + ' aUEC/day · ' + s.owner + ' approves'
                  : 'Free · ' + s.owner + ' approves'}
            </div>
          </div>
        </div>
      </div>
      <div
        className="panel-body"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 'var(--space-3)',
        }}
      >
        {onloan ? (
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
            <FI n="rotate-ccw" /> Request return
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            <FI n="send" /> Request ship
          </button>
        )}
        <button className="btn btn-ghost btn-sm" aria-label="Message owner">
          <FI n="message-circle" />
        </button>
      </div>
    </div>
  );
}

function OfferedView() {
  const [selId, setSelId] = React.useState(OFFERED[0].id);
  const sel = OFFERED.find((s) => s.id === selId);
  const roving = window.useRoving(OFFERED.length, {
    onActivate: (i) => setSelId(OFFERED[i].id),
  });
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return (
    <div className="split">
      <div className="dtable-wrap">
        <table
          className="dtable"
          role="grid"
          aria-label="Member-offered ships"
          onKeyDown={roving.onKeyDown}
        >
          <thead>
            <tr>
              <th>Ship</th>
              <th>Offered by</th>
              <th className="num">Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {OFFERED.map((s, i) => (
              <OfferedRow
                key={s.id}
                s={s}
                selected={s.id === selId}
                tabIndex={roving.getTab(i)}
                regRef={roving.register(i)}
                onSelect={() => {
                  setSelId(s.id);
                  roving.setIdx(i);
                }}
              />
            ))}
          </tbody>
        </table>
        <div className="list-hint">
          <span className="kbd">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
          </span>{' '}
          move{' '}
          <span className="kbd">
            <kbd>↵</kbd>
          </span>{' '}
          open{' '}
          <span style={{ marginLeft: 'auto' }}>
            {OFFERED.length} member ships available
          </span>
        </div>
      </div>
      {sel && <OfferedDetail s={sel} />}
    </div>
  );
}

// ============== PAGE ==============
function FleetPage() {
  const [tab, setTab] = React.useState('org');
  const [myShips, setMyShips] = React.useState(MY_SHIPS);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const myOffered = myShips.filter((s) => s.offered).length;
  const ready = ORG_FLEET.filter((s) => s.status === 'ready').length;
  const deployed = ORG_FLEET.filter((s) => s.status === 'deployed').length;
  const totalCargo = ORG_FLEET.reduce((s, x) => s + x.cargo, 0);
  const availOffered = OFFERED.filter((s) => s.status === 'available').length;

  const tabs = [
    {
      value: 'org',
      label: 'Org Fleet',
      icon: 'building-2',
      count: ORG_FLEET.length,
    },
    {
      value: 'mine',
      label: 'My Ships',
      icon: 'user-round',
      count: myShips.length,
    },
    {
      value: 'offered',
      label: 'Member-Offered',
      icon: 'hand-helping',
      count: OFFERED.length,
    },
  ];

  const stats =
    tab === 'mine'
      ? [
          {
            k: 'My ships',
            icon: 'rocket',
            v: myShips.length,
            d: 'in personal hangar',
          },
          {
            k: 'Offered to org',
            icon: 'hand-helping',
            v: myOffered,
            d: 'available for ops',
            tone: 'up',
          },
          {
            k: 'Earning potential',
            icon: 'coins',
            v: fmt(
              myShips.filter((s) => s.offered).reduce((a, s) => a + s.rate, 0),
            ),
            unit: 'aUEC/day',
            d: 'from rentals',
          },
          {
            k: 'Total cargo',
            icon: 'container',
            v: fmt(myShips.reduce((a, s) => a + s.cargo, 0)),
            unit: 'SCU',
            d: 'across your ships',
          },
        ]
      : tab === 'offered'
        ? [
            {
              k: 'Member ships',
              icon: 'hand-helping',
              v: OFFERED.length,
              d: 'offered to the org',
            },
            {
              k: 'Available now',
              icon: 'circle-check',
              v: availOffered,
              d: 'ready to request',
              tone: 'up',
            },
            {
              k: 'On loan',
              icon: 'navigation',
              v: OFFERED.length - availOffered,
              d: 'currently in use',
            },
            {
              k: 'Rentable cargo',
              icon: 'container',
              v: fmt(OFFERED.reduce((a, s) => a + s.cargo, 0)),
              unit: 'SCU',
              d: 'extra capacity',
            },
          ]
        : [
            {
              k: 'Org ships',
              icon: 'rocket',
              v: ORG_FLEET.length,
              d: 'owned by Atlas Vanguard',
            },
            {
              k: 'Ready',
              icon: 'circle-check',
              v: ready,
              d: 'crewed & flightworthy',
              tone: 'up',
            },
            {
              k: 'Deployed',
              icon: 'navigation',
              v: deployed,
              d: 'on active ops',
            },
            {
              k: 'Fleet cargo',
              icon: 'container',
              v: fmt(totalCargo),
              unit: 'SCU',
              d: 'total capacity',
            },
          ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            <FI n="rocket" /> Operations <FI n="chevron-right" /> Fleet
          </div>
          <h1 className="page-title">Fleet</h1>
          <p className="page-sub">
            Manage the org armada, your personal hangar, and the ships members
            lend to the cause — all in one command view.
          </p>
        </div>
        <div className="page-actions">
          {tab === 'org' && (
            <button className="btn btn-ghost btn-sm">
              <FI n="download" /> Export
            </button>
          )}
          <button className="btn btn-primary btn-sm" id="fleet-new">
            <FI n="plus" /> {tab === 'mine' ? 'Add ship' : 'Register ship'}{' '}
            <span className="kbd" style={{ marginLeft: 6 }}>
              <kbd>n</kbd>
            </span>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <Segmented
          options={tabs}
          value={tab}
          onChange={setTab}
          ariaLabel="Fleet view"
        />
      </div>

      <StatStrip items={stats} />

      <div style={{ marginTop: 'var(--space-2)' }}>
        {tab === 'org' && <OrgFleetView />}
        {tab === 'mine' && (
          <MyShipsView ships={myShips} setShips={setMyShips} />
        )}
        {tab === 'offered' && <OfferedView />}
      </div>
    </>
  );
}

function FleetApp() {
  const commands = [
    {
      id: 'fleet-org',
      group: 'Fleet',
      icon: 'building-2',
      label: 'View org fleet',
      run: () => window.__toast && window.__toast('Org fleet'),
    },
    {
      id: 'fleet-mine',
      group: 'Fleet',
      icon: 'user-round',
      label: 'My ships & offers',
      run: () => window.__toast && window.__toast('My ships'),
    },
    {
      id: 'fleet-offered',
      group: 'Fleet',
      icon: 'hand-helping',
      label: 'Member-offered ships',
      run: () => window.__toast && window.__toast('Member-offered'),
    },
    {
      id: 'fleet-register',
      group: 'Fleet',
      icon: 'plus',
      label: 'Register a ship',
      run: () => window.__toast && window.__toast('Register ship', 'plus'),
    },
  ];
  const helpExtra = [
    ['Register ship', ['n']],
    ['Switch view', ['←', '→']],
    ['Open ship', ['↵']],
    ['Toggle theme', ['t']],
  ];
  return (
    <AppShell
      active="fleet"
      commands={commands}
      helpExtra={helpExtra}
      onNew={() =>
        window.__toast && window.__toast('Register a new ship', 'plus')
      }
      searchPlaceholder="Search ships, captains, owners…"
    >
      <FleetPage />
    </AppShell>
  );
}

window.FleetApp = FleetApp;
