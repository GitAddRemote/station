// ============================================================
// Station — Contracts page
// Service contracts: hauling/transport, security, mining, salvage.
// Board list + type-specific detail (route, quota, milestones,
// reward, assigned crew). Keyboard-first: roving list, Enter opens.
// ============================================================

const CI = window.StationIcon;

const CTYPE = {
  hauling: {
    icon: 'container',
    label: 'Hauling / Transport',
    cls: 'ct-hauling',
  },
  security: { icon: 'crosshair', label: 'Security', cls: 'ct-security' },
  mining: { icon: 'gem', label: 'Mining', cls: 'ct-mining' },
  salvage: { icon: 'recycle', label: 'Salvage', cls: 'ct-salvage' },
};
const CSTATUS = {
  open: { tone: 'brand', icon: 'circle-dot', label: 'Open' },
  claimed: { tone: 'info', icon: 'user-check', label: 'Claimed' },
  active: { tone: 'warn', icon: 'loader', label: 'In progress' },
  completed: { tone: 'success', icon: 'badge-check', label: 'Completed' },
  disputed: { tone: 'danger', icon: 'triangle-alert', label: 'Disputed' },
};
const RISK = { low: 'Low', med: 'Medium', high: 'High' };
const riskIcon = { low: 'shield-check', med: 'shield-alert', high: 'shield-x' };

const CONTRACTS = [
  {
    id: 'CT-512',
    type: 'hauling',
    title: 'Titanium haul — Hurston to ArcCorp',
    client: 'Hurston Dynamics',
    clientType: 'NPC contract',
    reward: 285000,
    status: 'active',
    risk: 'med',
    deadline: '6h',
    assigned: ['Iris Tanaka'],
    commodity: 'Titanium',
    scu: 768,
    origin: 'HDMS-Edmond',
    originSub: 'Hurston',
    dest: 'Area18',
    destSub: 'ArcCorp',
    desc: 'Bulk Titanium delivery on the Hurston→ArcCorp lane. Watch the Stanton pirate corridor near the jump.',
    miles: [
      ['Cargo loaded at HDMS-Edmond', 'done'],
      ['In transit — Stanton lane', 'active'],
      ['Delivery to Area18 TDD', ''],
    ],
  },
  {
    id: 'CT-509',
    type: 'security',
    title: 'Escort mining op — Aaron Halo',
    client: 'Atlas Vanguard',
    clientType: 'Internal op',
    reward: 180000,
    status: 'active',
    risk: 'high',
    deadline: '2h',
    assigned: ['Dax Moreno', 'Talia Vance'],
    objective: 'Escort & Defend',
    threat: 'Pirate interdiction',
    location: 'Aaron Halo · Cluster 7',
    duration: '4h window',
    desc: 'Provide armed escort for the Day-3 mining session. Two fighters on overwatch, intercept hostiles before they reach the Mole.',
    miles: [
      ['Wing assembled at ARC-L1', 'done'],
      ['Overwatch established', 'active'],
      ['Session complete — RTB', ''],
    ],
  },
  {
    id: 'CT-507',
    type: 'mining',
    title: 'Quantanium quota — refinery contract',
    client: 'Refinery Consortium',
    clientType: 'Org contract',
    reward: 520000,
    status: 'open',
    risk: 'med',
    deadline: '3d',
    assigned: [],
    commodity: 'Quantanium',
    quota: 150,
    location: 'Aaron Halo',
    refinery: 'ARC-L1',
    desc: 'Deliver 150 SCU of refined Quantanium. Volatile cargo — refine promptly and mind the inertia on the haul back.',
    miles: [
      ['Accept contract', ''],
      ['Mine & refine 150 SCU', ''],
      ['Deliver to consortium', ''],
    ],
  },
  {
    id: 'CT-503',
    type: 'salvage',
    title: 'Wreck reclamation — Yela Belt',
    client: 'Drake Interplanetary',
    clientType: 'NPC contract',
    reward: 240000,
    status: 'claimed',
    risk: 'low',
    deadline: '2d',
    assigned: ['Kova Rhys'],
    site: 'Yela Belt · Wreck Field 22',
    target: 'RMC + CMAT',
    targetScu: 180,
    location: 'Crusader · Yela',
    desc: 'Strip and reclaim the marked hulls. RMC to CRU-L1, construction materials retained for the org.',
    miles: [
      ['Claim contract', 'done'],
      ['Reclaim 180 SCU', 'active'],
      ['Sell RMC at CRU-L1', ''],
    ],
  },
  {
    id: 'CT-498',
    type: 'hauling',
    title: 'Medical supply run — microTech',
    client: 'microTech',
    clientType: 'NPC contract',
    reward: 96000,
    status: 'open',
    risk: 'low',
    deadline: '1d',
    assigned: [],
    commodity: 'Medical Supplies',
    scu: 120,
    origin: 'New Babbage',
    originSub: 'microTech',
    dest: 'Port Tressler',
    destSub: 'microTech orbit',
    desc: 'Quick low-risk medical resupply to Port Tressler. Good first contract for a recruit pilot.',
    miles: [
      ['Load at New Babbage', ''],
      ['Deliver to Port Tressler', ''],
    ],
  },
  {
    id: 'CT-495',
    type: 'security',
    title: 'Bounty — Nine Tails cell',
    client: 'Crusader Security',
    clientType: 'NPC contract',
    reward: 145000,
    status: 'open',
    risk: 'high',
    deadline: '5d',
    assigned: [],
    objective: 'Bounty hunt',
    threat: 'Armed hostiles',
    location: 'Crusader · Cellin',
    duration: 'Until cleared',
    desc: 'Eliminate the flagged Nine Tails cell operating near Cellin. Multicrew gunship recommended.',
    miles: [
      ['Accept bounty', ''],
      ['Locate & engage', ''],
      ['Confirm kills', ''],
    ],
  },
  {
    id: 'CT-489',
    type: 'mining',
    title: 'Laranite delivery — completed',
    client: 'ArcCorp Mining',
    clientType: 'NPC contract',
    reward: 134000,
    status: 'completed',
    risk: 'low',
    deadline: '—',
    assigned: ['Vesper Calderon'],
    commodity: 'Laranite',
    quota: 60,
    location: 'Lyria',
    refinery: 'ARC-L1',
    desc: 'Closed out last cycle. Paid in full and settled to the crew.',
    miles: [
      ['Accepted', 'done'],
      ['Refined 60 SCU', 'done'],
      ['Delivered & paid', 'done'],
    ],
  },
  {
    id: 'CT-486',
    type: 'hauling',
    title: 'Agricium freight — disputed',
    client: 'Shubin Interstellar',
    clientType: 'NPC contract',
    reward: 210000,
    status: 'disputed',
    risk: 'med',
    deadline: '—',
    assigned: ['Orin Pell'],
    commodity: 'Agricium',
    scu: 320,
    origin: 'ArcCorp',
    originSub: 'Stanton',
    dest: 'Lorville',
    destSub: 'Hurston',
    desc: 'Delivery shortfall reported — 40 SCU unaccounted after a soft-death event. Under review with the client.',
    miles: [
      ['Loaded', 'done'],
      ['Transit interrupted', 'done'],
      ['Delivery disputed', 'active'],
    ],
  },
];

const fmt = (n) => Math.round(n).toLocaleString('en-US');
const abbr = (n) =>
  n >= 1e6
    ? (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
    : n >= 1e3
      ? Math.round(n / 1e3) + 'K'
      : String(n);
const initials = (s) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// ---- list row ----
function ContractRow({ c, selected, tabIndex, regRef, onSelect }) {
  const ty = CTYPE[c.type],
    st = CSTATUS[c.status];
  const urgent =
    (c.deadline === '2h' || c.deadline === '6h') && c.status === 'active';
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
          <span className={'ic ' + ty.cls}>
            <CI n={ty.icon} />
          </span>
          <div>
            <div className="nm">{c.title}</div>
            <div className="sub">
              {c.id} · {ty.label}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span className="client">
          <span className="ci">
            <CI
              n={
                c.clientType.includes('Internal') ||
                c.clientType.includes('Org')
                  ? 'shield'
                  : 'building-2'
              }
            />
          </span>
          <span>
            <span className="cn">{c.client}</span>
            <span className="ct">{c.clientType}</span>
          </span>
        </span>
      </td>
      <td>
        <span className={'deadline' + (urgent ? ' urgent' : '')}>
          {c.deadline !== '—' && <CI n="clock" />}
          {c.deadline === '—' ? '—' : c.deadline}
        </span>
      </td>
      <td>
        <StatusPill tone={st.tone} icon={st.icon}>
          {st.label}
        </StatusPill>
      </td>
      <td className="num">
        <span className="reward">
          {abbr(c.reward)} <small>aUEC</small>
        </span>
      </td>
    </tr>
  );
}

// ---- type-specific spec ----
function ContractSpec({ c }) {
  if (c.type === 'hauling') {
    return (
      <div className="route">
        <div className="node">
          <span className="dot"></span>
          <span className="lb">{c.origin}</span>
          <span className="sub">{c.originSub}</span>
        </div>
        <div className="line">
          <span className="cargo">
            {c.scu} SCU · {c.commodity}
          </span>
        </div>
        <div className="node end">
          <span className="dot"></span>
          <span className="lb">{c.dest}</span>
          <span className="sub">{c.destSub}</span>
        </div>
      </div>
    );
  }
  if (c.type === 'security') {
    return (
      <>
        <div className="kv">
          <span className="k">
            <CI n="target" /> Objective
          </span>
          <span className="v">{c.objective}</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="swords" /> Threat
          </span>
          <span className="v">{c.threat}</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="map-pin" /> Location
          </span>
          <span className="v">{c.location}</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="timer" /> Duration
          </span>
          <span className="v">{c.duration}</span>
        </div>
      </>
    );
  }
  if (c.type === 'mining') {
    return (
      <>
        <div className="kv">
          <span className="k">
            <CI n="gem" /> Commodity
          </span>
          <span className="v brand">{c.commodity}</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="scale" /> Quota
          </span>
          <span className="v mono">{c.quota} SCU</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="map-pin" /> Field
          </span>
          <span className="v">{c.location}</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="factory" /> Refinery
          </span>
          <span className="v">{c.refinery}</span>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="kv">
        <span className="k">
          <CI n="ship" /> Site
        </span>
        <span className="v">{c.site}</span>
      </div>
      <div className="kv">
        <span className="k">
          <CI n="recycle" /> Target
        </span>
        <span className="v">{c.target}</span>
      </div>
      <div className="kv">
        <span className="k">
          <CI n="scale" /> Volume
        </span>
        <span className="v mono">{c.targetScu} SCU</span>
      </div>
      <div className="kv">
        <span className="k">
          <CI n="map-pin" /> Location
        </span>
        <span className="v">{c.location}</span>
      </div>
    </>
  );
}

// ---- detail ----
function ContractDetail({ c }) {
  const ty = CTYPE[c.type],
    st = CSTATUS[c.status];
  const tint = {
    hauling: 'var(--warning-500)',
    security: 'var(--coral-300)',
    mining: 'var(--aqua-300)',
    salvage: '#D9A6E6',
  }[c.type];
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return (
    <div className="panel detail">
      <div className="panel-body">
        <div className="con-hero">
          <span className={'big-ic ' + ty.cls}>
            <CI n={ty.icon} />
          </span>
          <div className="h">
            <div className="t">{c.title}</div>
            <div className="s">
              <span>{c.id}</span>
              <span>·</span>
              <span>{ty.label}</span>
            </div>
          </div>
          <StatusPill tone={st.tone} icon={st.icon}>
            {st.label}
          </StatusPill>
        </div>

        <div className="reward-hero">
          <div>
            <div className="rk">Contract reward</div>
            <div className="rv">
              {fmt(c.reward)}
              <small>aUEC</small>
            </div>
          </div>
          <div className="risk">
            <div className="rk">Risk</div>
            <span className={'risk-badge ' + c.risk}>
              <CI n={riskIcon[c.risk]} />
              {RISK[c.risk]}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="ds-cap">
          <span>{c.type === 'hauling' ? 'Route' : 'Brief'}</span>
        </div>
        <ContractSpec c={c} />
        <p
          className="t-muted"
          style={{
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-relaxed)',
            marginTop: 'var(--space-3)',
            marginBottom: 0,
          }}
        >
          {c.desc}
        </p>
      </div>

      <div className="detail-section">
        <div className="ds-cap">
          <span>Client &amp; terms</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="building-2" /> Client
          </span>
          <span className="v">{c.client}</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="file-text" /> Type
          </span>
          <span className="v">{c.clientType}</span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="clock" /> Deadline
          </span>
          <span className="v">
            {c.deadline === '—' ? 'Closed' : 'in ' + c.deadline}
          </span>
        </div>
        <div className="kv">
          <span className="k">
            <CI n="users" /> Assigned
          </span>
          <span className="v">
            {c.assigned.length ? (
              <span className="assigned">
                <span className="stack">
                  {c.assigned.map((a) => (
                    <span
                      className="av"
                      key={a}
                      style={{ background: window.avColor(a) }}
                      title={a}
                    >
                      {initials(a)}
                    </span>
                  ))}
                </span>
              </span>
            ) : (
              <span
                className="t-faint"
                style={{ color: 'var(--text-faint)', fontWeight: 400 }}
              >
                Unassigned
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="detail-section">
        <div className="ds-cap">
          <span>Progress</span>
        </div>
        <div className="miles">
          {c.miles.map(([label, state], i) => (
            <div className={'mile ' + state} key={i}>
              <span className="mk">
                <CI
                  n={
                    state === 'done'
                      ? 'check'
                      : state === 'active'
                        ? 'loader'
                        : 'circle'
                  }
                />
              </span>
              <span className="ml">{label}</span>
              {state === 'active' && <span className="mt">now</span>}
            </div>
          ))}
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
        {c.status === 'open' && (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            <CI n="hand" /> Claim contract
          </button>
        )}
        {c.status === 'open' && (
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
            <CI n="user-plus" /> Assign crew
          </button>
        )}
        {c.status === 'claimed' && (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            <CI n="play" /> Start contract
          </button>
        )}
        {c.status === 'active' && (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            <CI n="check-check" /> Mark complete
          </button>
        )}
        {c.status === 'completed' && (
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
            <CI n="copy" /> Repost contract
          </button>
        )}
        {c.status === 'disputed' && (
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
            <CI n="gavel" /> Resolve dispute
          </button>
        )}
        <button className="btn btn-ghost btn-sm" aria-label="Contract settings">
          <CI n="more-horizontal" />
        </button>
      </div>
    </div>
  );
}

// ---- page ----
function ContractsPage() {
  const [type, setType] = React.useState('all');
  const visible = React.useMemo(
    () =>
      type === 'all' ? CONTRACTS : CONTRACTS.filter((c) => c.type === type),
    [type],
  );
  const [selId, setSelId] = React.useState(CONTRACTS[0].id);
  const sel = CONTRACTS.find((c) => c.id === selId) || visible[0];
  const roving = window.useRoving(visible.length, {
    onActivate: (i) => {
      if (visible[i]) setSelId(visible[i].id);
    },
  });
  React.useEffect(() => {
    if (visible.length && !visible.find((c) => c.id === selId)) {
      setSelId(visible[0].id);
      roving.setIdx(0);
    }
  }, [type]);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const open = CONTRACTS.filter((c) => c.status === 'open').length;
  const active = CONTRACTS.filter(
    (c) => c.status === 'active' || c.status === 'claimed',
  ).length;
  const pool = CONTRACTS.filter(
    (c) =>
      c.status === 'open' || c.status === 'active' || c.status === 'claimed',
  ).reduce((s, c) => s + c.reward, 0);
  const done = CONTRACTS.filter((c) => c.status === 'completed').length;

  const filters = [
    { value: 'all', label: 'All', count: CONTRACTS.length },
    { value: 'hauling', label: 'Hauling', icon: 'container' },
    { value: 'security', label: 'Security', icon: 'crosshair' },
    { value: 'mining', label: 'Mining', icon: 'gem' },
    { value: 'salvage', label: 'Salvage', icon: 'recycle' },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">
            <CI n="scroll-text" /> Operations <CI n="chevron-right" /> Contracts
          </div>
          <h1 className="page-title">Contracts</h1>
          <p className="page-sub">
            Service contracts across every discipline — hauling, security,
            mining, and salvage. Post, claim, crew up, and settle the reward.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm">
            <CI n="layout-grid" /> Board view
          </button>
          <button className="btn btn-primary btn-sm" id="con-new">
            <CI n="plus" /> New contract{' '}
            <span className="kbd" style={{ marginLeft: 6 }}>
              <kbd>n</kbd>
            </span>
          </button>
        </div>
      </div>

      <StatStrip
        items={[
          {
            k: 'Open contracts',
            icon: 'circle-dot',
            v: open,
            d: 'available to claim',
          },
          {
            k: 'In progress',
            icon: 'loader',
            v: active,
            d: 'claimed or active',
            tone: 'warn',
          },
          {
            k: 'Reward pool',
            icon: 'coins',
            v: abbr(pool),
            unit: 'aUEC',
            d: 'active contract value',
            tone: 'up',
          },
          { k: 'Completed', icon: 'badge-check', v: done, d: 'this cycle' },
        ]}
      />

      <div className="con-toolbar">
        <Segmented
          options={filters}
          value={type}
          onChange={setType}
          ariaLabel="Filter contracts by type"
        />
        <span className="grow"></span>
        <div className="chips">
          <button className="fchip">
            <CI n="circle-dot" /> Status: All
          </button>
          <button className="fchip">
            <CI n="arrow-down-up" /> Sort: Reward
          </button>
        </div>
      </div>

      <div className="split">
        <div className="dtable-wrap">
          <table
            className="dtable"
            role="grid"
            aria-label="Contracts"
            onKeyDown={roving.onKeyDown}
          >
            <thead>
              <tr>
                <th>Contract</th>
                <th>Client</th>
                <th>Deadline</th>
                <th>Status</th>
                <th className="num">Reward</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => (
                <ContractRow
                  key={c.id}
                  c={c}
                  selected={c.id === selId}
                  tabIndex={roving.getTab(i)}
                  regRef={roving.register(i)}
                  onSelect={() => {
                    setSelId(c.id);
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
            <span className="kbd">
              <kbd>n</kbd>
            </span>{' '}
            new{' '}
            <span style={{ marginLeft: 'auto' }}>
              {visible.length} of {CONTRACTS.length} contracts
            </span>
          </div>
        </div>
        {sel && <ContractDetail c={sel} />}
      </div>
    </>
  );
}

function ContractsApp() {
  const commands = [
    {
      id: 'con-new',
      group: 'Contracts',
      icon: 'plus',
      label: 'New contract',
      hint: 'n',
      run: () =>
        window.__toast && window.__toast('New contract drafted', 'plus'),
    },
    {
      id: 'con-haul',
      group: 'Contracts',
      icon: 'container',
      label: 'New hauling contract',
      run: () =>
        window.__toast && window.__toast('Hauling contract', 'container'),
    },
    {
      id: 'con-sec',
      group: 'Contracts',
      icon: 'crosshair',
      label: 'New security contract',
      run: () =>
        window.__toast && window.__toast('Security contract', 'crosshair'),
    },
    {
      id: 'con-open',
      group: 'Contracts',
      icon: 'circle-dot',
      label: 'Show open contracts',
      run: () =>
        window.__toast &&
        window.__toast('Showing open contracts', 'circle-dot'),
    },
  ];
  const helpExtra = [
    ['New contract', ['n']],
    ['Filter type', ['←', '→']],
    ['Open contract', ['↵']],
    ['Toggle theme', ['t']],
  ];
  return (
    <AppShell
      active="contracts"
      commands={commands}
      helpExtra={helpExtra}
      onNew={() =>
        window.__toast && window.__toast('Draft a new contract', 'plus')
      }
      searchPlaceholder="Search contracts, clients, commodities…"
    >
      <ContractsPage />
    </AppShell>
  );
}

window.ContractsApp = ContractsApp;
