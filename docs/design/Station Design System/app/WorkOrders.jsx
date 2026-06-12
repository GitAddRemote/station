// ============================================================
// Station — Work Orders page (v2)
// A work order is a JOB that may involve MANY ships feeding one
// refinery batch + crew-share split. Two views:
//   • LIST  — top stats aggregate over a PERIOD (session / 7d / 30d)
//   • ACTIVE (drill-in) — top stats scoped to ONE work order, plus
//     the ships participating, refinery, ore, expenses, crew shares.
// Keyboard-first: roving list, Enter drills in, Esc steps back, n = new.
// ============================================================

const I = window.StationIcon;

// ---- ore reference (aUEC per refined SCU, plausible 4.x values) ----
const ORE = {
  Quantanium: { price: 26800, color: '#5BD6B0' },
  Bexalite: { price: 17400, color: '#7CBEF9' },
  Taranite: { price: 16100, color: '#C879D8' },
  Gold: { price: 12300, color: '#E0B23A' },
  Laranite: { price: 6300, color: '#9AA7B2' },
  Agricium: { price: 5800, color: '#B6E3D4' },
  Hephaestanite: { price: 5300, color: '#E0913A' },
  Titanium: { price: 1900, color: '#8FA0AE' },
  Tungsten: { price: 1500, color: '#6E7BF2' },
  Iron: { price: 1100, color: '#C2724B' },
  RMC: { price: 12100, color: '#5BD6B0' },
  CMAT: { price: 1800, color: '#9AA7B2' },
};
const oreColor = (n) => (ORE[n] && ORE[n].color) || '#9AA7B2';

const TYPE = {
  ship: { icon: 'gem', label: 'Ship Mining', cls: 'ship', shipIcon: 'gem' },
  vehicle: {
    icon: 'car',
    label: 'Vehicle (ROC)',
    cls: 'vehicle',
    shipIcon: 'car',
  },
  salvage: {
    icon: 'recycle',
    label: 'Salvage',
    cls: 'salvage',
    shipIcon: 'recycle',
  },
};
const STATUS = {
  refining: { tone: 'warn', icon: 'loader', label: 'Refining' },
  refined: { tone: 'info', icon: 'package-check', label: 'Refined' },
  sold: { tone: 'success', icon: 'badge-check', label: 'Sold' },
  pending: { tone: 'neutral', icon: 'circle-dashed', label: 'Pending' },
  failed: { tone: 'danger', icon: 'circle-x', label: 'Failed' },
};
const tintFor = (type) =>
  ({
    ship: {
      background: 'color-mix(in srgb, var(--aqua-400) 18%, transparent)',
      color: 'var(--aqua-300)',
    },
    vehicle: {
      background: 'color-mix(in srgb, var(--teal-400) 18%, transparent)',
      color: 'var(--teal-300)',
    },
    salvage: {
      background: 'color-mix(in srgb, #C879D8 20%, transparent)',
      color: '#D9A6E6',
    },
  })[type];

// ---- work orders (each can hold MANY ships) ----
const ORDERS = [
  {
    id: 'WO-3041',
    title: 'Aaron Halo dragline',
    type: 'ship',
    status: 'refining',
    loc: 'Aaron Halo · Cluster 7',
    daysAgo: 0,
    session: true,
    refinery: 'ARC-L1 · Refinery',
    method: 'Dinyx Solventation',
    yield: 78,
    progress: 0.64,
    timeLeft: '1h 12m',
    ships: [
      { ship: 'MISC Mole', op: 'hezeqiah', scu: 96 },
      { ship: 'MISC Mole', op: 'Vesper Calderon', scu: 88 },
      { ship: 'MISC Prospector', op: 'Iris Tanaka', scu: 32 },
    ],
    ores: [
      ['Quantanium', 132, 103],
      ['Taranite', 60, 47],
      ['Bexalite', 24, 19],
    ],
    expenses: [
      ['Refinery fee', 31400, 'hezeqiah'],
      ['Fuel + QT', 8200, 'Vesper Calderon'],
    ],
    crew: [
      { name: 'hezeqiah', role: 'Lead · Seller', type: 'equal' },
      { name: 'Vesper Calderon', role: 'Operator', type: 'equal' },
      { name: 'Iris Tanaka', role: 'Operator', type: 'equal' },
      { name: 'Dax Moreno', role: 'Escort', type: 'percent', val: 10 },
    ],
  },
  {
    id: 'WO-3040',
    title: 'Lyria surface sweep',
    type: 'ship',
    status: 'refined',
    loc: 'Lyria · Crater Field',
    daysAgo: 1,
    session: true,
    refinery: 'ARC-L1 · Refinery',
    method: 'Ferron Exchange',
    yield: 71,
    progress: 1,
    timeLeft: 'Ready to sell',
    ships: [{ ship: 'MISC Prospector', op: 'Iris Tanaka', scu: 50 }],
    ores: [
      ['Laranite', 32, 23],
      ['Agricium', 18, 13],
    ],
    expenses: [['Refinery fee', 6200, 'Iris Tanaka']],
    crew: [{ name: 'Iris Tanaka', role: 'Solo · Seller', type: 'equal' }],
  },
  {
    id: 'WO-3038',
    title: 'Daymar ROC gem run',
    type: 'vehicle',
    status: 'sold',
    loc: 'Daymar · Eager Flats',
    daysAgo: 2,
    session: true,
    refinery: '—',
    method: 'Hand-sold (gems)',
    yield: 100,
    progress: 1,
    timeLeft: 'Sold',
    ships: [
      { ship: 'Greycat ROC', op: 'Dax Moreno', scu: 9 },
      { ship: 'Greycat ROC', op: 'Kova Rhys', scu: 7 },
    ],
    ores: [['Hephaestanite', 16, 16]],
    expenses: [],
    crew: [
      { name: 'Dax Moreno', role: 'Driver · Seller', type: 'equal' },
      { name: 'Kova Rhys', role: 'Driver', type: 'equal' },
    ],
  },
  {
    id: 'WO-3037',
    title: 'Yela wreck reclaim',
    type: 'salvage',
    status: 'refining',
    loc: 'Yela Belt · Wrecks 19–24',
    daysAgo: 4,
    refinery: 'CRU-L1 · Reclamation',
    method: 'Material Reclaim',
    yield: 96,
    progress: 0.31,
    timeLeft: '3h 48m',
    ships: [
      { ship: 'Drake Vulture', op: 'Kova Rhys', scu: 64 },
      { ship: 'Aegis Reclaimer', op: 'hezeqiah', scu: 220 },
    ],
    ores: [
      ['RMC', 180, 172],
      ['CMAT', 96, 91],
    ],
    expenses: [['Hull repair', 18400, 'Kova Rhys']],
    crew: [
      { name: 'hezeqiah', role: 'Reclaimer crew · Seller', type: 'equal' },
      { name: 'Kova Rhys', role: 'Operator', type: 'flat', val: 120000 },
      { name: 'Talia Vance', role: 'Processing', type: 'equal' },
    ],
    altSeller: 'hezeqiah',
  },
  {
    id: 'WO-3036',
    title: 'Aaron Halo cluster 4',
    type: 'ship',
    status: 'pending',
    loc: 'Aaron Halo · Cluster 4',
    daysAgo: 6,
    refinery: 'Not submitted',
    method: '—',
    yield: 0,
    progress: 0,
    timeLeft: 'Awaiting refinery',
    ships: [
      { ship: 'MISC Mole', op: 'hezeqiah', scu: 84 },
      { ship: 'MISC Mole', op: 'Vesper Calderon', scu: 76 },
    ],
    ores: [
      ['Bexalite', 54, 0],
      ['Titanium', 120, 0],
    ],
    expenses: [],
    crew: [
      { name: 'hezeqiah', role: 'Lead · Seller', type: 'equal' },
      { name: 'Vesper Calderon', role: 'Operator', type: 'equal' },
    ],
  },
  {
    id: 'WO-3030',
    title: 'Wala ring (ship lost)',
    type: 'ship',
    status: 'failed',
    loc: 'Wala · Ring',
    daysAgo: 12,
    refinery: 'HUR-L2 · Refinery',
    method: 'Cormack Method',
    yield: 0,
    progress: 0,
    timeLeft: 'Ship lost — claim filed',
    ships: [{ ship: 'MISC Prospector', op: 'Vesper Calderon', scu: 28 }],
    ores: [['Gold', 28, 0]],
    expenses: [['Insurance excess', 4500, 'Vesper Calderon']],
    crew: [{ name: 'Vesper Calderon', role: 'Solo', type: 'equal' }],
  },
  {
    id: 'WO-3024',
    title: 'Daymar quant haul',
    type: 'ship',
    status: 'sold',
    loc: 'Daymar · Kudre Ore',
    daysAgo: 21,
    refinery: 'CRU-L1 · Refinery',
    method: 'Dinyx Solventation',
    yield: 82,
    progress: 1,
    timeLeft: 'Sold',
    ships: [
      { ship: 'MISC Mole', op: 'hezeqiah', scu: 110 },
      { ship: 'MISC Prospector', op: 'Bram Holloway', scu: 44 },
    ],
    ores: [
      ['Quantanium', 120, 98],
      ['Taranite', 30, 24],
    ],
    expenses: [['Refinery fee', 22400, 'hezeqiah']],
    crew: [
      { name: 'hezeqiah', role: 'Lead · Seller', type: 'equal' },
      { name: 'Bram Holloway', role: 'Operator', type: 'equal' },
    ],
  },
];

const PERIODS = [
  { value: 'session', label: 'This session' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];
const inPeriod = (o, p) =>
  p === 'session' ? !!o.session : o.daysAgo <= Number(p);

// ---- money helpers ----
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const abbr = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
};
const initials = (s) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const realisedQ = (o) => o.status === 'pending' || o.status === 'failed';

function grossOf(o) {
  return o.ores.reduce(
    (s, [name, , refined]) => s + refined * (ORE[name] ? ORE[name].price : 0),
    0,
  );
}
function scuOf(o) {
  return o.ores.reduce((s, x) => s + (realisedQ(o) ? x[1] : x[2]), 0);
}
function payoutOf(o) {
  const gross = grossOf(o);
  const totalExp = o.expenses.reduce((s, [, amt]) => s + amt, 0);
  const net = Math.max(0, gross - totalExp);
  const flats = o.crew.filter((c) => c.type === 'flat');
  const pcts = o.crew.filter((c) => c.type === 'percent');
  const equals = o.crew.filter((c) => c.type === 'equal');
  const flatSum = flats.reduce((s, c) => s + (c.val || 0), 0);
  const pctSum = pcts.reduce((s, c) => s + (net * (c.val || 0)) / 100, 0);
  const remainder = Math.max(0, net - flatSum - pctSum);
  const equalEach = equals.length ? remainder / equals.length : 0;
  const rows = o.crew.map((c) => {
    let share = 0,
      label = 'Equal';
    if (c.type === 'flat') {
      share = c.val || 0;
      label = 'Flat';
    } else if (c.type === 'percent') {
      share = (net * (c.val || 0)) / 100;
      label = c.val + '%';
    } else {
      share = equalEach;
      label = 'Equal';
    }
    const reimb = o.expenses
      .filter((e) => e[2] === c.name)
      .reduce((s, e) => s + e[1], 0);
    return { ...c, share, reimb, total: share + reimb, label };
  });
  return { gross, totalExp, net, rows };
}

// ===========================================================
//  LIST VIEW
// ===========================================================
function OrderRow({ o, selected, tabIndex, regRef, onSelect, onOpen }) {
  const ty = TYPE[o.type],
    st = STATUS[o.status];
  const gross = grossOf(o);
  const scu = scuOf(o);
  return (
    <tr
      ref={regRef}
      tabIndex={tabIndex}
      aria-selected={selected}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onFocus={onSelect}
    >
      <td>
        <div className="t-ent">
          <span className={'ic ' + ty.cls}>
            <I n={ty.icon} />
          </span>
          <div>
            <div className="nm">{o.title}</div>
            <div className="sub">
              {o.id} · {ty.label}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span className="ship-count">
          <span className="ship-stack">
            {o.ships.slice(0, 3).map((s, i) => (
              <span className="mini" key={i}>
                <I n={ty.shipIcon} />
              </span>
            ))}
          </span>
          {o.ships.length} {o.ships.length === 1 ? 'ship' : 'ships'}
        </span>
      </td>
      <td className="num">
        {scu}{' '}
        <span className="t-muted" style={{ fontWeight: 400 }}>
          SCU
        </span>
      </td>
      <td>
        <StatusPill tone={st.tone} icon={st.icon}>
          {o.status === 'refining' ? o.timeLeft : st.label}
        </StatusPill>
      </td>
      <td className="num">{realisedQ(o) ? '—' : abbr(gross)}</td>
      <td className="num" style={{ paddingLeft: 0 }}>
        <button
          className="ibtn"
          style={{ width: 30, height: 30 }}
          aria-label={'Open ' + o.title}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <I n="chevron-right" />
        </button>
      </td>
    </tr>
  );
}

function ListView({ period, setPeriod, filter, setFilter, onOpen }) {
  const visible = React.useMemo(
    () =>
      ORDERS.filter((o) => inPeriod(o, period)).filter(
        (o) => filter === 'all' || o.type === filter,
      ),
    [period, filter],
  );
  const [selId, setSelId] = React.useState(visible[0] ? visible[0].id : null);
  React.useEffect(() => {
    if (visible.length && !visible.find((o) => o.id === selId))
      setSelId(visible[0].id);
  }, [period, filter]);

  const roving = window.useRoving(visible.length, {
    onActivate: (i) => {
      if (visible[i]) onOpen(visible[i].id);
    },
  });
  React.useEffect(() => {
    roving.setIdx(0);
  }, [period, filter]);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  // period aggregates
  const totals = React.useMemo(() => {
    let yieldScu = 0,
      gross = 0,
      exp = 0,
      refining = 0,
      ships = 0;
    visible.forEach((o) => {
      if (!realisedQ(o)) {
        yieldScu += o.ores.reduce((s, x) => s + x[2], 0);
        gross += grossOf(o);
        exp += o.expenses.reduce((s, e) => s + e[1], 0);
      }
      if (o.status === 'refining') refining += 1;
      ships += o.ships.length;
    });
    return {
      yieldScu,
      gross,
      exp,
      net: gross - exp,
      refining,
      ships,
      orders: visible.length,
    };
  }, [visible]);

  const oreSummary = React.useMemo(() => {
    const m = {};
    visible.forEach((o) => {
      if (!realisedQ(o))
        o.ores.forEach(([n, , r]) => {
          m[n] = (m[n] || 0) + r;
        });
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [visible]);

  const filters = [
    {
      value: 'all',
      label: 'All',
      count: ORDERS.filter((o) => inPeriod(o, period)).length,
    },
    { value: 'ship', label: 'Ship', icon: 'gem' },
    { value: 'vehicle', label: 'ROC', icon: 'car' },
    { value: 'salvage', label: 'Salvage', icon: 'recycle' },
  ];
  const periodLabel = PERIODS.find(
    (p) => p.value === period,
  ).label.toLowerCase();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            <I n="pickaxe" /> Operations <I n="chevron-right" /> Work Orders
          </div>
          <h1 className="page-title">Work Orders</h1>
          <p className="page-sub">
            Every refinery job and its crew-share split in one place. A work
            order can pool many ships into one payout — open one to see the
            ships, ore, expenses, and who gets what.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm">
            <I n="scan-line" /> Capture
          </button>
          <button className="btn btn-primary btn-sm" id="wo-new">
            <I n="plus" /> New work order{' '}
            <span className="kbd" style={{ marginLeft: 6 }}>
              <kbd>n</kbd>
            </span>
          </button>
        </div>
      </div>

      <div className="wo-period">
        <span className="pcap">Summary for</span>
        <Segmented
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          ariaLabel="Summary period"
        />
        <span className="grow"></span>
        <span className="live-tag">
          <span className="live"></span>Aaron Halo session · open
        </span>
      </div>

      <StatStrip
        items={[
          {
            k: 'Orders',
            icon: 'layers',
            v: totals.orders,
            d: totals.ships + ' ships involved',
          },
          {
            k: 'Yield (' + periodLabel + ')',
            icon: 'gem',
            v: totals.yieldScu,
            unit: 'SCU',
            d: oreSummary.length + ' ores refined',
          },
          {
            k: 'Gross value',
            icon: 'coins',
            v: abbr(totals.gross),
            unit: 'aUEC',
            d: 'at UEX sell prices',
          },
          {
            k: 'Net payout',
            icon: 'hand-coins',
            v: abbr(totals.net),
            unit: 'aUEC',
            d: 'after expenses',
            tone: 'up',
          },
          {
            k: 'Refining now',
            icon: 'loader',
            v: totals.refining,
            d: 'jobs in progress',
          },
        ]}
      />

      {oreSummary.length > 0 && (
        <div className="ore-sum">
          {oreSummary.map(([name, scu]) => (
            <span className="chip" key={name}>
              <span
                className="dot"
                style={{ background: oreColor(name) }}
              ></span>
              {name} <span className="q">{scu} SCU</span>
            </span>
          ))}
        </div>
      )}

      <div className="wo-toolbar">
        <Segmented
          options={filters}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter work orders by type"
        />
        <span className="grow"></span>
        <div className="chips">
          <button className="fchip">
            <I n="arrow-down-up" /> Sort: Newest
          </button>
          <button className="fchip">
            <I n="download" /> Export CSV
          </button>
        </div>
      </div>

      <div className="dtable-wrap" style={{ marginTop: 'var(--space-5)' }}>
        {visible.length === 0 ? (
          <div className="empty">
            <div className="e-ic">
              <I n="pickaxe" />
            </div>
            No work orders in this period.
          </div>
        ) : (
          <table
            className="dtable"
            role="grid"
            aria-label="Work orders"
            onKeyDown={roving.onKeyDown}
          >
            <thead>
              <tr>
                <th>Work order</th>
                <th>Ships</th>
                <th className="num">Yield</th>
                <th>Status</th>
                <th className="num">Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o, i) => (
                <OrderRow
                  key={o.id}
                  o={o}
                  selected={o.id === selId}
                  tabIndex={roving.getTab(i)}
                  regRef={roving.register(i)}
                  onSelect={() => {
                    setSelId(o.id);
                    roving.setIdx(i);
                  }}
                  onOpen={() => onOpen(o.id)}
                />
              ))}
            </tbody>
          </table>
        )}
        <div className="list-hint">
          <span className="kbd">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
          </span>{' '}
          move
          <span className="kbd">
            <kbd>↵</kbd>
          </span>{' '}
          open work order
          <span className="kbd">
            <kbd>n</kbd>
          </span>{' '}
          new
          <span style={{ marginLeft: 'auto' }}>
            {visible.length} orders · {periodLabel}
          </span>
        </div>
      </div>
    </>
  );
}

// ===========================================================
//  ACTIVE (drill-in) VIEW
// ===========================================================
function ActiveView({ o, onBack }) {
  const backRef = React.useRef(null);
  const ty = TYPE[o.type],
    st = STATUS[o.status];
  const { gross, totalExp, net, rows } = payoutOf(o);
  const realised = realisedQ(o);
  const totalShipScu = o.ships.reduce((s, x) => s + x.scu, 0);

  React.useEffect(() => {
    if (backRef.current) backRef.current.focus();
  }, [o.id]);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const open = document.querySelector('.scrim');
        if (!open) onBack();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <div className="wo-active">
      <button className="wo-back" ref={backRef} onClick={onBack}>
        <I n="arrow-left" /> All work orders{' '}
        <span className="kbd" style={{ marginLeft: 4 }}>
          <kbd>Esc</kbd>
        </span>
      </button>

      <div className="wo-active-head">
        <span className="big-ic" style={tintFor(o.type)}>
          <I n={ty.icon} />
        </span>
        <div className="h">
          <div className="t">
            {o.title}{' '}
            <StatusPill tone={st.tone} icon={st.icon}>
              {st.label}
            </StatusPill>
          </div>
          <div className="s">
            <span>{o.id}</span>
            <span>·</span>
            <span>{ty.label}</span>
            <span>·</span>
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <I n="map-pin" />
              {o.loc}
            </span>
            <span>·</span>
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <I n="rocket" />
              {o.ships.length} ships · {o.crew.length} crew
            </span>
          </div>
        </div>
        <div className="acts">
          {o.status === 'refined' && (
            <button className="btn btn-primary btn-sm">
              <I n="coins" /> Mark sold &amp; pay crew
            </button>
          )}
          {o.status === 'pending' && (
            <button className="btn btn-primary btn-sm">
              <I n="send" /> Submit to refinery
            </button>
          )}
          {o.status === 'refining' && (
            <button className="btn btn-ghost btn-sm">
              <I n="bell" /> Notify when done
            </button>
          )}
          <button className="btn btn-ghost btn-sm" aria-label="Edit work order">
            <I n="pencil" />
          </button>
        </div>
      </div>

      <StatStrip
        items={[
          {
            k: 'Order yield',
            icon: 'gem',
            v: scuOf(o),
            unit: 'SCU',
            d: o.ores.length + ' ore types',
          },
          {
            k: 'Gross value',
            icon: 'coins',
            v: realised ? '—' : abbr(gross),
            unit: realised ? '' : 'aUEC',
            d: 'at UEX prices',
          },
          {
            k: 'Expenses',
            icon: 'receipt',
            v: totalExp ? abbr(totalExp) : '0',
            unit: 'aUEC',
            d: o.expenses.length + ' items',
            tone: 'warn',
          },
          {
            k: 'Net payout',
            icon: 'hand-coins',
            v: realised ? '—' : abbr(net),
            unit: realised ? '' : 'aUEC',
            d: 'split ' + o.crew.length + ' ways',
            tone: 'up',
          },
          {
            k: 'Ships',
            icon: 'rocket',
            v: o.ships.length,
            d: totalShipScu + ' SCU hauled',
          },
        ]}
      />

      <div className="split">
        {/* LEFT: ships + refinery + ore */}
        <div>
          <div className="panel">
            <div className="panel-head">
              <span className="ic">
                <I n="rocket" />
              </span>
              <span className="panel-title">Ships participating</span>
              <span
                className="t-mono t-muted"
                style={{ fontSize: 'var(--text-xs)' }}
              >
                {totalShipScu} SCU
              </span>
            </div>
            <div
              className="panel-body"
              style={{ paddingTop: 4, paddingBottom: 4 }}
            >
              {o.ships.map((s, i) => {
                const pct = totalShipScu
                  ? Math.round((s.scu / totalShipScu) * 100)
                  : 0;
                return (
                  <div className="ship-row" key={i}>
                    <span className="ship-ic" style={tintFor(o.type)}>
                      <I n={ty.shipIcon} />
                    </span>
                    <div className="info">
                      <div className="nm">{s.ship}</div>
                      <div className="op">
                        <I n="user" />
                        {s.op}
                      </div>
                    </div>
                    <div className="ship-scu">
                      <span className="v">{s.scu}</span>{' '}
                      <span className="u">SCU · {pct}%</span>
                      <div className="bar">
                        <i style={{ width: pct + '%' }}></i>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="ic">
                <I n="factory" />
              </span>
              <span className="panel-title">Refinery</span>
              <span
                className="t-mono t-muted"
                style={{ fontSize: 'var(--text-xs)' }}
              >
                yield {o.yield ? o.yield + '%' : '—'}
              </span>
            </div>
            <div className="panel-body">
              <div className="refbox">
                <div className="refbox-top">
                  <div>
                    <div className="refbox-method">{o.method}</div>
                    <div className="refbox-method st">{o.refinery}</div>
                  </div>
                  <div className="refbox-time">{o.timeLeft}</div>
                </div>
                {o.status === 'refining' && (
                  <>
                    <div className="tbar">
                      <i
                        style={{ width: Math.round(o.progress * 100) + '%' }}
                      ></i>
                    </div>
                    <div className="refbox-foot">
                      <span>{Math.round(o.progress * 100)}% complete</span>
                      <span>ETA {o.timeLeft}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="detail-section">
              <div className="ds-cap">
                <span>Ore yield (pooled)</span>
              </div>
              <table className="ore-table">
                <thead>
                  <tr>
                    <th>Ore</th>
                    <th className="num">Raw</th>
                    <th className="num">Refined</th>
                    <th className="num">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {o.ores.map(([name, raw, refined]) => (
                    <tr key={name}>
                      <td>
                        <span className="ore-name">
                          <span
                            className="ore-dot"
                            style={{ background: oreColor(name) }}
                          ></span>
                          {name}
                        </span>
                      </td>
                      <td className="num t-muted">{raw}</td>
                      <td className="num">{realised ? '—' : refined}</td>
                      <td className="num">
                        {realised
                          ? '—'
                          : fmt(refined * (ORE[name] ? ORE[name].price : 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {!realised && (
                  <tfoot>
                    <tr>
                      <td>Gross</td>
                      <td className="num"></td>
                      <td className="num"></td>
                      <td className="num">{fmt(gross)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: expenses + crew shares + payout */}
        <div>
          {o.expenses.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <span className="ic">
                  <I n="receipt" />
                </span>
                <span className="panel-title">Expenses</span>
                <span
                  className="t-mono"
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--coral-400)',
                  }}
                >
                  −{fmt(totalExp)}
                </span>
              </div>
              <div
                className="panel-body"
                style={{ paddingTop: 4, paddingBottom: 8 }}
              >
                {o.expenses.map(([label, amt, claimant], i) => (
                  <div className="exp-row" key={i}>
                    <span className="ex-ic">
                      <I n="receipt" />
                    </span>
                    <div className="ex-lbl">
                      {label}
                      <div className="ex-claim">Reimbursed to {claimant}</div>
                    </div>
                    <span className="ex-amt">−{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <span className="ic">
                <I n="users" />
              </span>
              <span className="panel-title">Crew shares · {o.crew.length}</span>
              <span className="t-muted" style={{ fontSize: 'var(--text-xs)' }}>
                net {realised ? '—' : fmt(net)}
              </span>
            </div>
            <div className="panel-body">
              {rows.map((c) => (
                <div className="share-row" key={c.name}>
                  <div className="share-who">
                    <span
                      className="av"
                      style={{ background: window.avColor(c.name) }}
                    >
                      {initials(c.name)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="nm">{c.name}</div>
                      <div className="role">
                        {c.role}
                        {c.reimb > 0 && (
                          <span
                            className="t-mono"
                            style={{ color: 'var(--teal-300)' }}
                          >
                            +{abbr(c.reimb)} reimb
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="share-type">{c.label}</span>
                  <div className="share-pay">
                    {realised ? '—' : fmt(c.total)}
                    <span className="sub">aUEC</span>
                  </div>
                </div>
              ))}
              {o.altSeller && (
                <div className="alt-note">
                  <I n="user-check" />
                  Alternate seller: <strong>{o.altSeller}</strong> handles the
                  sale and settles payouts to the crew.
                </div>
              )}
              <div className="payout-foot">
                <div className="row">
                  <span className="l">Gross value</span>
                  <span className="r">{realised ? '—' : fmt(gross)}</span>
                </div>
                <div className="row">
                  <span className="l">Less expenses</span>
                  <span className="r" style={{ color: 'var(--coral-400)' }}>
                    {totalExp ? '−' + fmt(totalExp) : '0'}
                  </span>
                </div>
                <div className="row total">
                  <span className="l">Net distributed</span>
                  <span className="r">
                    {realised ? '—' : fmt(net) + ' aUEC'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
//  PAGE
// ===========================================================
function WorkOrdersPage() {
  const [period, setPeriod] = React.useState('session');
  const [filter, setFilter] = React.useState('all');
  const [activeId, setActiveId] = React.useState(null);
  const active = activeId ? ORDERS.find((o) => o.id === activeId) : null;

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeId]);

  if (active) return <ActiveView o={active} onBack={() => setActiveId(null)} />;
  return (
    <ListView
      period={period}
      setPeriod={setPeriod}
      filter={filter}
      setFilter={setFilter}
      onOpen={setActiveId}
    />
  );
}

function WorkOrdersApp() {
  const onNew = () => {
    window.__toast &&
      window.__toast(
        'New work order — capture from game or enter ships manually',
        'plus',
      );
  };
  const commands = [
    {
      id: 'wo-new',
      group: 'Work Orders',
      icon: 'plus',
      label: 'New work order',
      hint: 'n',
      run: () =>
        window.__toast && window.__toast('New work order started', 'plus'),
    },
    {
      id: 'wo-capture',
      group: 'Work Orders',
      icon: 'scan-line',
      label: 'Capture order from game (OCR)',
      run: () =>
        window.__toast &&
        window.__toast('Share your game window to capture', 'scan-line'),
    },
    {
      id: 'wo-summary',
      group: 'Work Orders',
      icon: 'receipt',
      label: 'Session summary & payouts',
      run: () =>
        window.__toast && window.__toast('Opening session summary', 'receipt'),
    },
    {
      id: 'wo-close',
      group: 'Work Orders',
      icon: 'lock',
      label: 'Close session',
      run: () => window.__toast && window.__toast('Session closed', 'lock'),
    },
  ];
  const helpExtra = [
    ['New work order', ['n']],
    ['Open work order', ['↵']],
    ['Back to list', ['Esc']],
    ['Change period', ['←', '→']],
  ];
  return (
    <AppShell
      active="workorders"
      commands={commands}
      helpExtra={helpExtra}
      onNew={onNew}
      searchPlaceholder="Search orders, ships, crew…"
    >
      <WorkOrdersPage />
    </AppShell>
  );
}

window.WorkOrdersApp = WorkOrdersApp;
