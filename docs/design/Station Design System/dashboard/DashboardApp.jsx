// ============================================================
// Station — post-login dashboard (DashboardApp)
// Rebuilds the real Dashboard + InventoryPortlet on Presstronic tokens.
// Tweaks: data state (empty/populated), summary-card style, accent.
// ============================================================

const USER = { name: 'hezeqiah', email: 'hez@station.app' };

// ---- mock data: populated state ------------------------------
const ITEMS_FULL = [
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
    name: 'P8-AR Assault Rifle',
    sku: 'UEX-WPN-P8AR',
    cat: 'Personal Weapons',
    qty: 2,
    loc: 'Port Olisar',
    status: 'Atlas Vanguard',
    tone: 'brand',
    ico: 'crosshair',
  },
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
    name: 'Medical Supplies',
    sku: 'UEX-MED-SUP',
    cat: 'Consumables',
    qty: 48,
    loc: 'Atlas Hangar',
    status: 'Atlas Vanguard',
    tone: 'brand',
    ico: 'cross',
  },
  {
    name: 'Greycat ROC',
    sku: 'UEX-VEH-ROC',
    cat: 'Vehicles',
    qty: 2,
    loc: 'New Babbage',
    status: 'Private',
    tone: 'neutral',
    ico: 'truck',
  },
];
const ITEMS_EMPTY = [
  {
    name: '100i Frostbite Livery',
    sku: 'UEX-100I-FRB',
    cat: 'Liveries',
    qty: 3,
    loc: 'Unknown',
    status: 'Private',
    tone: 'neutral',
    ico: 'paintbrush',
  },
  {
    name: 'Demeco LMG',
    sku: 'UEX-WPN-DMC',
    cat: 'Personal Weapons',
    qty: 1,
    loc: 'Unknown',
    status: 'Private',
    tone: 'neutral',
    ico: 'crosshair',
  },
  {
    name: 'P8-AR Assault Rifle',
    sku: 'UEX-WPN-P8AR',
    cat: 'Personal Weapons',
    qty: 2,
    loc: 'Unknown',
    status: 'Private',
    tone: 'neutral',
    ico: 'crosshair',
  },
];

const Icon = ({ n, ...p }) => <i data-lucide={n} {...p}></i>;

// ---- top bar -------------------------------------------------
function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="logo" href="#" aria-label="Station home">
          <span className="logo-mark">
            <Icon n="orbit" />
          </span>
          <span className="logo-word">STATION</span>
        </a>
        <nav className="topbar-nav">
          <a className="topnav-link active" href="#">
            Overview
          </a>
          <a className="topnav-link" href="#">
            Organizations
          </a>
          <a className="topnav-link" href="#">
            Inventory
          </a>
          <a className="topnav-link" href="#">
            Members
          </a>
        </nav>
        <div className="topbar-right">
          <button className="icon-btn" aria-label="Notifications">
            <Icon n="bell" />
            <span className="dot"></span>
          </button>
          <button className="avatar" aria-label="Account menu">
            {USER.name.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
}

// ---- welcome + quick stats -----------------------------------
function Welcome({ populated }) {
  return (
    <section className="welcome">
      <div className="welcome-copy">
        <div className="eyebrow welcome-eyebrow">Command center</div>
        <h1>
          Welcome back, <span className="name">{USER.name}</span>.
        </h1>
        <p className="welcome-sub">{USER.email}</p>
      </div>
      <div className="welcome-actions">
        <a className="btn btn-ghost btn-sm" href="#">
          <Icon n="settings-2" /> Settings
        </a>
        <a className="btn btn-primary btn-sm" href="#">
          <Icon n="plus" /> New organization
        </a>
      </div>
    </section>
  );
}

function QuickStats() {
  const stats = [
    { k: 'Total items', ki: 'package', v: '1,296', d: '6 categories' },
    { k: 'Organizations', ki: 'users', v: '2', d: 'Atlas Vanguard +1' },
    { k: 'Shared items', ki: 'share-2', v: '291', d: '22% of inventory' },
    {
      k: 'Est. value',
      ki: 'coins',
      v: '8.42M',
      d: '+4.1% this cycle',
      up: true,
    },
  ];
  return (
    <section className="qstats">
      {stats.map((s) => (
        <div className="qstat" key={s.k}>
          <div className="k">
            <Icon n={s.ki} /> {s.k}
          </div>
          <div className="v">{s.v}</div>
          <div className={'d' + (s.up ? ' up' : '')}>{s.d}</div>
        </div>
      ))}
    </section>
  );
}

// ---- summary cards -------------------------------------------
function SummaryCards({ populated, cardStyle }) {
  if (cardStyle === 'stat' && populated) {
    return (
      <section className="summary-grid" data-style="stat">
        <article className="scard link">
          <div className="scard-ico">
            <Icon n="user-round" />
          </div>
          <h3>My Profile</h3>
          <p>View and update your profile, handle, and contact details.</p>
          <div className="scard-foot">
            <a className="btn btn-ghost btn-sm" href="#">
              Open profile <Icon n="arrow-right" />
            </a>
          </div>
        </article>
        <article className="scard">
          <div className="scard-ico">
            <Icon n="users" />
          </div>
          <h3>Organizations</h3>
          <div className="big">2</div>
          <p>Atlas Vanguard · Crimson Fleet</p>
          <div className="scard-foot">
            <a className="btn btn-ghost btn-sm" href="#">
              Manage orgs <Icon n="arrow-right" />
            </a>
          </div>
        </article>
        <article className="scard">
          <div className="scard-ico">
            <Icon n="mail" />
          </div>
          <h3>Invitations</h3>
          <div className="big">1</div>
          <p>Hollow Point Mercenaries invited you.</p>
          <div className="scard-foot">
            <a className="btn btn-primary btn-sm" href="#">
              <Icon n="check" /> Review
            </a>
          </div>
        </article>
      </section>
    );
  }

  if (populated) {
    return (
      <section className="summary-grid">
        <article className="scard link">
          <div className="scard-ico">
            <Icon n="user-round" />
          </div>
          <h3>My Profile</h3>
          <p>
            View and update your profile information, handle, and contact
            details.
          </p>
          <div className="scard-foot">
            <a className="btn btn-ghost btn-sm" href="#">
              Open profile <Icon n="arrow-right" />
            </a>
          </div>
        </article>
        <article className="scard">
          <span className="scard-count">2 orgs</span>
          <div className="scard-ico">
            <Icon n="users" />
          </div>
          <h3>My Organizations</h3>
          <div className="org-list">
            <div className="org-row">
              <span className="org-badge">AV</span>
              <div>
                <div className="org-name">Atlas Vanguard</div>
                <div className="org-meta">Quartermaster · 312 members</div>
              </div>
            </div>
            <div className="org-row">
              <span
                className="org-badge"
                style={{
                  background:
                    'linear-gradient(140deg, var(--coral-300), var(--coral-500))',
                }}
              >
                CF
              </span>
              <div>
                <div className="org-name">Crimson Fleet</div>
                <div className="org-meta">Member · 88 members</div>
              </div>
            </div>
          </div>
        </article>
        <article className="scard">
          <span className="scard-count">1 new</span>
          <div className="scard-ico">
            <Icon n="mail" />
          </div>
          <h3>Invitations</h3>
          <div className="org-list">
            <div className="inv-row">
              <span
                className="org-badge"
                style={{
                  background:
                    'linear-gradient(140deg, var(--teal-300), var(--teal-500))',
                }}
              >
                HP
              </span>
              <div style={{ flex: 1 }}>
                <div className="inv-name">Hollow Point Mercenaries</div>
                <div className="inv-meta">Invited you as Operative</div>
              </div>
            </div>
          </div>
          <div
            className="scard-foot"
            style={{ display: 'flex', gap: 'var(--space-2)' }}
          >
            <a className="btn btn-primary btn-sm" href="#">
              <Icon n="check" /> Accept
            </a>
            <a className="btn btn-ghost btn-sm" href="#">
              Decline
            </a>
          </div>
        </article>
      </section>
    );
  }

  // empty / new-user state (matches the screenshot)
  return (
    <section className="summary-grid">
      <article className="scard link">
        <div className="scard-ico">
          <Icon n="user-round" />
        </div>
        <h3>My Profile</h3>
        <p>View and update your profile information.</p>
        <div className="scard-foot">
          <a className="btn btn-ghost btn-sm" href="#">
            Open profile <Icon n="arrow-right" />
          </a>
        </div>
      </article>
      <article className="scard">
        <div className="scard-ico">
          <Icon n="users" />
        </div>
        <h3>My Organizations</h3>
        <p>You are not a member of any organizations yet.</p>
        <div className="scard-foot">
          <a className="btn btn-primary btn-sm" href="#">
            <Icon n="plus" /> Create organization
          </a>
        </div>
      </article>
      <article className="scard">
        <div className="scard-ico">
          <Icon n="mail" />
        </div>
        <h3>Invitations</h3>
        <p>No pending invitations.</p>
        <div className="scard-foot">
          <span className="chip-badge neutral">
            <Icon n="inbox" /> Inbox zero
          </span>
        </div>
      </article>
    </section>
  );
}

// ---- inventory portlet ---------------------------------------
function InventoryPortlet({ populated }) {
  const items = populated ? ITEMS_FULL : ITEMS_EMPTY;
  const [sharedOnly, setSharedOnly] = React.useState(false);
  const shown = sharedOnly
    ? items.filter((i) => i.status !== 'Private')
    : items;

  return (
    <section className="portlet">
      <div className="portlet-head">
        <span className="portlet-ico">
          <Icon n="archive" />
        </span>
        <div className="portlet-title">
          My Inventory
          <div className="sub">Synced from UEX · Star Citizen</div>
        </div>
        <span className="spacer"></span>
        <button className="icon-btn" aria-label="Expand inventory">
          <Icon n="maximize-2" />
        </button>
      </div>

      <div className="portlet-controls">
        <label className="search">
          <Icon n="search" />
          <input type="text" placeholder="Search items…" />
        </label>
        <div className="select">
          <span>All categories</span>
          <Icon n="chevron-down" />
        </div>
        <div
          className={'toggle-field' + (sharedOnly ? ' on' : '')}
          onClick={() => setSharedOnly((v) => !v)}
          role="switch"
          aria-checked={sharedOnly}
        >
          <span className="switch"></span>
          <span>Shared only</span>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="inv-empty">
          <div className="e-ico">
            <Icon n="package-open" />
          </div>
          <p>No items match — try turning off “Shared only”.</p>
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
            {shown.map((it) => (
              <tr key={it.sku}>
                <td>
                  <div className="inv-item">
                    <span className="thumb">
                      <Icon n={it.ico} />
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
                    {it.tone === 'brand' && <Icon n="shield" />}
                    {it.tone === 'success' && <Icon n="share-2" />}
                    {it.tone === 'neutral' && <Icon n="lock" />}
                    {it.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <div className="rpp">
          Rows per page:{' '}
          <span className="pill">
            10 <Icon n="chevron-down" />
          </span>
        </div>
        <span>
          1–{shown.length} of {shown.length}
        </span>
        <div className="pager">
          <button disabled aria-label="Previous page">
            <Icon n="chevron-left" />
          </button>
          <button disabled aria-label="Next page">
            <Icon n="chevron-right" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ---- quick actions -------------------------------------------
function QuickActions({ populated }) {
  return (
    <section className="qactions">
      <h2>Quick actions</h2>
      <div className="qactions-row">
        <a className="btn btn-primary" href="#">
          <Icon n="users" />{' '}
          {populated ? 'New organization' : 'Create organization'}
        </a>
        <a className="btn btn-ghost" href="#">
          <Icon n="user-round-pen" /> Edit profile
        </a>
        <a className="btn btn-ghost" href="#">
          <Icon n="package-plus" /> Add inventory item
        </a>
        {populated && (
          <a className="btn btn-ghost" href="#">
            <Icon n="scroll-text" /> Post contract
          </a>
        )}
      </div>
    </section>
  );
}

// ---- tweaks defaults -----------------------------------------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  dataState: 'Populated',
  cardStyle: 'Detailed',
  accent: 'Aqua',
}; /*EDITMODE-END*/

function DashboardApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const populated = String(t.dataState || 'Populated') === 'Populated';
  const accent = String(t.accent || 'Aqua').toLowerCase();
  const cardStyle =
    String(t.cardStyle || 'Detailed') === 'Stat tiles' ? 'stat' : 'detailed';

  return (
    <div className="dash station" data-theme="dark" data-accent={accent}>
      <TopBar />
      <main className="dash-main">
        <Welcome populated={populated} />
        {populated && <QuickStats />}
        <SummaryCards populated={populated} cardStyle={cardStyle} />
        <InventoryPortlet populated={populated} />
        <QuickActions populated={populated} />
      </main>

      <TweaksPanel>
        <TweakSection label="Data" />
        <TweakRadio
          label="State"
          value={t.dataState}
          options={['Empty', 'Populated']}
          onChange={(v) => setTweak('dataState', v)}
        />
        <TweakSection label="Layout" />
        <TweakRadio
          label="Summary cards"
          value={t.cardStyle}
          options={['Detailed', 'Stat tiles']}
          onChange={(v) => setTweak('cardStyle', v)}
        />
        <TweakSection label="Brand" />
        <TweakRadio
          label="Accent"
          value={t.accent}
          options={['Aqua', 'Coral']}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

window.DashboardApp = DashboardApp;
