// ============================================================
// Station — portlet library (v2)
// A uniform Portlet shell + 10 portlet bodies + registry + presets.
// Every portlet is a self-contained card so it can be dragged into any
// grid zone. Exposed on window for DashboardGrid.jsx.
// ============================================================

const PIcon = ({ n, ...p }) => <i data-lucide={n} {...p}></i>;

// ---- uniform shell -------------------------------------------
// dragHandlers + editing are injected by the grid; content is `children`.
function Portlet({
  id,
  icon,
  title,
  action,
  href,
  full,
  editing,
  dragging,
  dropTarget,
  dragProps = {},
  children,
}) {
  const headAction =
    action ||
    (href && !editing ? (
      <a
        className="pcard-act"
        href={href}
        aria-label={'Open ' + title}
        title={'Open ' + title}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <PIcon n="arrow-up-right" />
      </a>
    ) : (
      <button className="pcard-act" aria-label="Portlet options">
        <PIcon n="more-horizontal" />
      </button>
    ));
  return (
    <article
      className={
        'pcard' +
        (full ? ' pcard--full' : '') +
        (dragging ? ' dragging' : '') +
        (dropTarget ? ' drop-target' : '')
      }
      data-portlet={id}
      {...dragProps}
    >
      <div className="pcard-head">
        <span className="pcard-grip" aria-hidden="true">
          <PIcon n="grip-vertical" />
        </span>
        <span className="pcard-ico">
          <PIcon n={icon} />
        </span>
        <span className="pcard-title">{title}</span>
        {headAction}
      </div>
      <div className="pcard-body">{children}</div>
    </article>
  );
}

// ---- compact bodies ------------------------------------------
function MiningBody() {
  return (
    <>
      <div className="plabel">Refined · this cycle</div>
      <div className="pmetric">
        1,240<span className="unit">SCU</span>
      </div>
      <div className="pdelta up">
        <PIcon n="trending-up" /> +18% vs last cycle
      </div>
      <div className="pbars">
        <i style={{ height: '40%' }}></i>
        <i style={{ height: '62%' }}></i>
        <i style={{ height: '48%' }}></i>
        <i style={{ height: '78%' }}></i>
        <i style={{ height: '55%' }}></i>
        <i className="hi" style={{ height: '96%' }}></i>
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l">
            <PIcon n="gem" /> Top commodity
          </span>
          <span className="v brand">Quantanium</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="pickaxe" /> Active rigs
          </span>
          <span className="v">3</span>
        </div>
      </div>
    </>
  );
}

function WorkOrdersBody() {
  return (
    <>
      <div className="plabel">Session net payout · Aaron Halo</div>
      <div className="pmetric">
        3.55<span className="unit">M aUEC</span>
      </div>
      <div className="pdelta warn">
        <PIcon n="loader" /> 2 jobs refining now
      </div>
      <div className="pbars">
        <i style={{ height: '38%' }}></i>
        <i style={{ height: '64%' }}></i>
        <i style={{ height: '52%' }}></i>
        <i style={{ height: '80%' }}></i>
        <i style={{ height: '60%' }}></i>
        <i className="hi" style={{ height: '92%' }}></i>
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l">
            <PIcon n="package-check" /> Ready to sell
          </span>
          <span className="v brand">1 order</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="gem" /> Session yield
          </span>
          <span className="v">250 SCU</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="users" /> Crew shares
          </span>
          <span className="v">5</span>
        </div>
      </div>
    </>
  );
}

function SalvageBody() {
  return (
    <>
      <div className="plabel">Reclaimed materials</div>
      <div className="pmetric">
        318<span className="unit">RMC</span>
      </div>
      <div className="pdelta up">
        <PIcon n="trending-up" /> +42 this week
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l">
            <PIcon n="recycle" /> CM stripped
          </span>
          <span className="v">96</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="ship" /> Hulls processed
          </span>
          <span className="v">12</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="map-pin" /> Field
          </span>
          <span className="v brand">Aaron Halo</span>
        </div>
      </div>
    </>
  );
}

function HaulingBody() {
  return (
    <>
      <div className="plabel">Trade profit · 30d</div>
      <div className="pmetric">
        2.1<span className="unit">M aUEC</span>
      </div>
      <div className="pdelta up">
        <PIcon n="trending-up" /> +4.1% margin
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l">
            <PIcon n="route" /> Routes run
          </span>
          <span className="v">42</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="container" /> Cargo moved
          </span>
          <span className="v">9,840 SCU</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="fuel" /> Best lane
          </span>
          <span className="v brand">ARC → Hurston</span>
        </div>
      </div>
    </>
  );
}

function FleetBody() {
  return (
    <>
      <div className="plabel">Hangar status</div>
      <div className="pmetric">
        14<span className="unit">ships</span>
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l">
            <span className="pdots">
              <i className="ok"></i>
            </span>{' '}
            Ready
          </span>
          <span className="v">9</span>
        </div>
        <div className="prow">
          <span className="l">
            <span className="pdots">
              <i className="warn"></i>
            </span>{' '}
            In repair
          </span>
          <span className="v">2</span>
        </div>
        <div className="prow">
          <span className="l">
            <span className="pdots">
              <i className="off"></i>
            </span>{' '}
            Stored
          </span>
          <span className="v">3</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="rocket" /> Flagship
          </span>
          <span className="v brand">Polaris</span>
        </div>
      </div>
    </>
  );
}

function ContractsBody() {
  return (
    <>
      <div className="plabel">Org contracts</div>
      <div className="pmetric">
        5<span className="unit">active</span>
      </div>
      <div className="pdelta warn">
        <PIcon n="clock" /> 2 due within 48h
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l">
            <PIcon n="hand-coins" /> Pending payout
          </span>
          <span className="v brand">1.2M</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="check-check" /> Completed · 30d
          </span>
          <span className="v">23</span>
        </div>
      </div>
    </>
  );
}

function TreasuryBody() {
  return (
    <>
      <div className="plabel">Org treasury</div>
      <div className="pmetric">
        8.42<span className="unit">M aUEC</span>
      </div>
      <div className="pdelta up">
        <PIcon n="trending-up" /> +4.1% this cycle
      </div>
      <div className="pbars">
        <i style={{ height: '52%' }}></i>
        <i style={{ height: '46%' }}></i>
        <i style={{ height: '64%' }}></i>
        <i style={{ height: '58%' }}></i>
        <i style={{ height: '72%' }}></i>
        <i className="hi" style={{ height: '88%' }}></i>
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l">
            <PIcon n="users" /> Contributors
          </span>
          <span className="v">41</span>
        </div>
      </div>
    </>
  );
}

function OrganizationsBody() {
  return (
    <>
      <div className="pmini">
        <span className="pavatar">AV</span>
        <div>
          <div className="pnm">Atlas Vanguard</div>
          <div className="pmeta">Quartermaster · 312 members</div>
        </div>
      </div>
      <div className="pmini">
        <span
          className="pavatar"
          style={{
            background:
              'linear-gradient(140deg, var(--coral-300), var(--coral-500))',
          }}
        >
          CF
        </span>
        <div>
          <div className="pnm">Crimson Fleet</div>
          <div className="pmeta">Member · 88 members</div>
        </div>
      </div>
      <div className="pbtn-row">
        <a className="btn btn-ghost btn-sm" href="#">
          Manage orgs <PIcon n="arrow-right" />
        </a>
      </div>
    </>
  );
}

function InvitationsBody() {
  return (
    <>
      <div className="pmini">
        <span
          className="pavatar"
          style={{
            background:
              'linear-gradient(140deg, var(--teal-300), var(--teal-500))',
          }}
        >
          HP
        </span>
        <div>
          <div className="pnm">Hollow Point Mercs</div>
          <div className="pmeta">Invited you as Operative</div>
        </div>
      </div>
      <div className="pbtn-row">
        <a className="btn btn-primary btn-sm" href="#">
          <PIcon n="check" /> Accept
        </a>
        <a className="btn btn-ghost btn-sm" href="#">
          Decline
        </a>
      </div>
    </>
  );
}

function ProfileBody() {
  return (
    <>
      <div className="pprofile">
        <span className="big-av">H</span>
        <div>
          <div className="ph">hezeqiah</div>
          <div className="pr">Quartermaster · Atlas Vanguard</div>
        </div>
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l">
            <PIcon n="shield-check" /> Reputation
          </span>
          <span className="v brand">Trusted</span>
        </div>
        <div className="prow">
          <span className="l">
            <PIcon n="calendar" /> Member since
          </span>
          <span className="v">2952</span>
        </div>
      </div>
    </>
  );
}

// ---- inventory body (compact reuse of the table) -------------
const INV_ROWS = [
  {
    name: 'Quantanium',
    sku: 'UEX-MAT-QNT',
    cat: 'Mining · Refined',
    qty: 1240,
    loc: 'CRU-L1 Storage',
    status: 'Shared',
    tone: 'success',
    ico: 'gem',
  },
  {
    name: 'Demeco LMG',
    sku: 'UEX-WPN-DMC',
    cat: 'Personal Weapons',
    qty: 1,
    loc: 'Area18 · Hangar 4',
    status: 'Atlas Vanguard',
    tone: 'brand',
    ico: 'crosshair',
  },
  {
    name: '100i Frostbite Livery',
    sku: 'UEX-100I-FRB',
    cat: 'Liveries',
    qty: 3,
    loc: 'Everus Harbor',
    status: 'Private',
    tone: 'neutral',
    ico: 'paintbrush',
  },
  {
    name: 'Medical Supplies',
    sku: 'UEX-MED-SUP',
    cat: 'Consumables',
    qty: 48,
    loc: 'Atlas Hangar',
    status: 'Atlas Vanguard',
    tone: 'brand',
    ico: 'cross',
  },
];
function InventoryBody() {
  return (
    <>
      <div className="portlet-controls">
        <label className="search">
          <PIcon n="search" />
          <input type="text" placeholder="Search items…" />
        </label>
        <div className="select">
          <span>All categories</span>
          <PIcon n="chevron-down" />
        </div>
        <div className="toggle-field">
          <span className="switch"></span>
          <span>Shared only</span>
        </div>
      </div>
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
          {INV_ROWS.map((it) => (
            <tr key={it.sku}>
              <td>
                <div className="inv-item">
                  <span className="thumb">
                    <PIcon n={it.ico} />
                  </span>
                  <div>
                    <div className="nm">{it.name}</div>
                    <div className="sku">{it.sku}</div>
                  </div>
                </div>
              </td>
              <td className="cell-muted">{it.cat}</td>
              <td className="cell-num">{it.qty.toLocaleString()}</td>
              <td className="cell-muted">{it.loc}</td>
              <td>
                <span className={'chip-badge ' + it.tone}>
                  {it.tone === 'brand' && <PIcon n="shield" />}
                  {it.tone === 'success' && <PIcon n="share-2" />}
                  {it.tone === 'neutral' && <PIcon n="lock" />}
                  {it.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <div className="rpp">
          Rows per page:{' '}
          <span className="pill">
            10 <PIcon n="chevron-down" />
          </span>
        </div>
        <span>1–4 of 4</span>
        <div className="pager">
          <button disabled aria-label="Previous">
            <PIcon n="chevron-left" />
          </button>
          <button disabled aria-label="Next">
            <PIcon n="chevron-right" />
          </button>
        </div>
      </div>
    </>
  );
}

// ---- registry ------------------------------------------------
const PORTLETS = {
  profile: {
    icon: 'user-round',
    title: 'My Profile',
    Body: ProfileBody,
    href: '../app/Profile.html',
  },
  invitations: { icon: 'mail', title: 'Invitations', Body: InvitationsBody },
  workorders: {
    icon: 'pickaxe',
    title: 'Work Orders',
    Body: WorkOrdersBody,
    href: '../app/Work Orders.html',
  },
  fleet: {
    icon: 'rocket',
    title: 'Fleet',
    Body: FleetBody,
    href: '../app/Fleet.html',
  },
  mining: { icon: 'pickaxe', title: 'Mining', Body: MiningBody },
  salvage: { icon: 'recycle', title: 'Salvage', Body: SalvageBody },
  hauling: { icon: 'truck', title: 'Hauling & Trade', Body: HaulingBody },
  contracts: {
    icon: 'scroll-text',
    title: 'Contracts',
    Body: ContractsBody,
    href: '../app/Contracts.html',
  },
  treasury: {
    icon: 'landmark',
    title: 'Treasury',
    Body: TreasuryBody,
    href: '../app/Treasury.html',
  },
  inventory: {
    icon: 'archive',
    title: 'My Inventory',
    Body: InventoryBody,
    full: true,
    href: '../app/Inventory.html',
  },
};

// ---- preset layouts (seed of future system-level profiles) ---
const LAYOUTS = {
  Default: [
    'profile',
    'invitations',
    'workorders',
    'fleet',
    'hauling',
    'contracts',
    'treasury',
    'inventory',
    'mining',
    'salvage',
  ],
  Miner: [
    'workorders',
    'treasury',
    'fleet',
    'inventory',
    'hauling',
    'contracts',
    'invitations',
    'profile',
    'mining',
    'salvage',
  ],
  Salvager: [
    'workorders',
    'fleet',
    'treasury',
    'inventory',
    'contracts',
    'hauling',
    'invitations',
    'profile',
    'salvage',
    'mining',
  ],
  Hauler: [
    'hauling',
    'treasury',
    'contracts',
    'inventory',
    'fleet',
    'workorders',
    'invitations',
    'profile',
    'mining',
    'salvage',
  ],
};

Object.assign(window, { Portlet, PORTLETS, LAYOUTS, PIcon });
