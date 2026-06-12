// ============================================================
// Station — customizable dashboard (v2)
// Edit-Layout mode + HTML5 drag-and-drop reorder into fixed grid zones,
// layout persistence, preset profiles (Miner/Salvager/Hauler), reset.
// Depends on portlets.jsx (window.Portlet / PORTLETS / LAYOUTS / PIcon).
// ============================================================

const LS_KEY = 'station-dash-layout-v2';
const THEME_KEY = 'station-dash-theme';
const RAIL_KEY = 'station-dash-rail';
const ALL_IDS = Object.keys(PORTLETS);

// shared nav (mirrors the app shell so the rail feels identical across screens)
const RAIL_NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'layout-dashboard',
    href: '#',
    active: true,
  },
  {
    id: 'workorders',
    label: 'Work Orders',
    icon: 'pickaxe',
    href: '../app/Work Orders.html',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    icon: 'scroll-text',
    href: '../app/Contracts.html',
  },
  { id: 'fleet', label: 'Fleet', icon: 'rocket', href: '../app/Fleet.html' },
  {
    id: 'members',
    label: 'Members',
    icon: 'users',
    href: '../app/Members.html',
  },
];
const RAIL_NAV2 = [
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'archive',
    href: '../app/Inventory.html',
  },
  {
    id: 'treasury',
    label: 'Treasury',
    icon: 'landmark',
    href: '../app/Treasury.html',
  },
];

// ---- collapsible rail (defaults collapsed on the dashboard) --------
function DashSidebar({ collapsed, onToggle }) {
  const linkEl = (n) => (
    <a
      key={n.id}
      className={'dr-link' + (n.active ? ' active' : '')}
      href={n.active ? undefined : n.href}
      aria-current={n.active ? 'page' : undefined}
      title={collapsed ? n.label : undefined}
    >
      <PIcon n={n.icon} />
      <span className="lbl">{n.label}</span>
    </a>
  );
  return (
    <aside className="dash-rail" aria-label="Primary">
      <div className="dr-head">
        <span className="dr-badge">AV</span>
        <span className="dr-org">
          <span className="nm">Atlas Vanguard</span>
          <span className="role">Quartermaster</span>
        </span>
      </div>
      <nav className="dr-nav">
        <div className="dr-cap">Operations</div>
        {RAIL_NAV.map(linkEl)}
        <div className="dr-cap">Assets</div>
        {RAIL_NAV2.map(linkEl)}
      </nav>
      <div className="dr-foot">
        <button
          className="dr-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <PIcon n="chevrons-left" />
          <span className="lbl">Collapse</span>
        </button>
      </div>
    </aside>
  );
}

// keep a saved order valid against the current registry
function reconcile(arr) {
  const seen = new Set();
  const out = [];
  arr.forEach((id) => {
    if (PORTLETS[id] && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  });
  ALL_IDS.forEach((id) => {
    if (!seen.has(id)) out.push(id);
  });
  return out;
}
function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (Array.isArray(s) && s.length) return reconcile(s);
  } catch (e) {
    /* ignore */
  }
  return null;
}
function persist(order) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(order));
  } catch (e) {
    /* ignore */
  }
}

// ---- top bar (self-contained) --------------------------------
function TopBar({ theme, onToggleTheme, onToggleRail }) {
  const dark = theme === 'dark';
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <button
            className="icon-btn topbar-railbtn"
            onClick={onToggleRail}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <PIcon n="panel-left" />
          </button>
          <a className="logo" href="#" aria-label="Station home">
            <span className="logo-mark">
              <PIcon n="orbit" />
            </span>
            <span className="logo-word">STATION</span>
          </a>
        </div>
        <div className="topbar-right">
          <button
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            <PIcon n={dark ? 'sun' : 'moon'} />
          </button>
          <button className="icon-btn" aria-label="Notifications">
            <PIcon n="bell" />
            <span className="dot"></span>
          </button>
          <button className="avatar" aria-label="Account menu">
            H
          </button>
        </div>
      </div>
    </header>
  );
}

function DashboardGridApp() {
  const [t, setTweak] = useTweaks(
    /*EDITMODE-BEGIN*/ {
      layout: 'Default',
      accent: 'Aqua',
    } /*EDITMODE-END*/,
  );

  const [order, setOrder] = React.useState(
    () => loadSaved() || LAYOUTS[String(t.layout)] || LAYOUTS.Default,
  );
  const [editing, setEditing] = React.useState(false);
  const [editBase, setEditBase] = React.useState(null); // snapshot for Cancel
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);

  // ---- theme (light-first token system; dark is the product default) ----
  const [theme, setTheme] = React.useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* ignore */
    }
  }, [theme]);
  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));

  // ---- rail (collapsed by default on the dashboard; persisted) ----
  const [rail, setRail] = React.useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) || 'collapsed';
    } catch (e) {
      return 'collapsed';
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(RAIL_KEY, rail);
    } catch (e) {}
  }, [rail]);
  const toggleRail = () =>
    setRail((p) => (p === 'collapsed' ? 'expanded' : 'collapsed'));

  // apply a preset when the Tweak changes (but not on first mount)
  const firstRun = React.useRef(true);
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const next = LAYOUTS[String(t.layout)] || LAYOUTS.Default;
    setEditing(false);
    setOrder(next);
    persist(next);
  }, [t.layout]);

  // (re)build Lucide glyphs after each render
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const accent = String(t.accent || 'Aqua').toLowerCase();

  // ---- edit session controls ----
  const startEdit = () => {
    setEditBase(order);
    setEditing(true);
  };
  const cancelEdit = () => {
    if (editBase) setOrder(editBase);
    setEditing(false);
    setDragId(null);
    setOverId(null);
  };
  const saveEdit = () => {
    persist(order);
    setEditing(false);
    setDragId(null);
    setOverId(null);
  };
  const resetLayout = () => {
    const def = LAYOUTS[String(t.layout)] || LAYOUTS.Default;
    setOrder(def);
  };

  // ---- drag-and-drop reorder (insert dragged before target) ----
  const move = (drag, target) => {
    if (!drag || drag === target) return;
    setOrder((prev) => {
      const arr = prev.filter((id) => id !== drag);
      const idx = arr.indexOf(target);
      arr.splice(idx < 0 ? arr.length : idx, 0, drag);
      return arr;
    });
  };
  const dragPropsFor = (id) =>
    editing
      ? {
          draggable: true,
          onDragStart: (e) => {
            setDragId(id);
            e.dataTransfer.effectAllowed = 'move';
            try {
              e.dataTransfer.setData('text/plain', id);
            } catch (x) {}
          },
          onDragOver: (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (overId !== id) setOverId(id);
          },
          onDragLeave: () => {
            if (overId === id) setOverId(null);
          },
          onDrop: (e) => {
            e.preventDefault();
            move(dragId, id);
            setDragId(null);
            setOverId(null);
          },
          onDragEnd: () => {
            setDragId(null);
            setOverId(null);
          },
        }
      : {};

  return (
    <div
      className="dash station"
      data-theme={theme}
      data-accent={accent}
      data-rail={rail}
    >
      <DashSidebar collapsed={rail === 'collapsed'} onToggle={toggleRail} />
      <div className="dash-shellcol">
        <TopBar
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleRail={toggleRail}
        />
        <main className="dash-main">
          <section className="welcome">
            <div className="welcome-copy">
              <div className="eyebrow welcome-eyebrow">Command center</div>
              <h1>
                Welcome back, <span className="name">hezeqiah</span>.
              </h1>
              <p className="welcome-sub">
                Your dashboard, your way — arrange portlets around how you play.
              </p>
            </div>
            <div className="welcome-actions">
              {!editing && (
                <button
                  className="btn btn-ghost btn-sm edit-toggle"
                  onClick={startEdit}
                >
                  <PIcon n="layout-grid" /> Edit layout
                </button>
              )}
            </div>
          </section>

          {editing && (
            <div className="edit-banner">
              <span className="eb-ico">
                <PIcon n="move" />
              </span>
              <div className="eb-text">
                <div className="eb-title">Customizing your dashboard</div>
                <div className="eb-sub">
                  Drag any portlet by its handle to move it into a new zone.
                </div>
              </div>
              <div className="eb-actions">
                <button className="btn-link" onClick={resetLayout}>
                  <PIcon n="rotate-ccw" /> Reset to default
                </button>
                <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                  <PIcon n="check" /> Save layout
                </button>
              </div>
            </div>
          )}

          <section className={'pgrid' + (editing ? ' editing' : '')}>
            {order.map((id) => {
              const def = PORTLETS[id];
              if (!def) return null;
              const Body = def.Body;
              return (
                <Portlet
                  key={id}
                  id={id}
                  icon={def.icon}
                  title={def.title}
                  href={def.href}
                  full={def.full}
                  editing={editing}
                  dragging={dragId === id}
                  dropTarget={editing && overId === id && dragId !== id}
                  dragProps={dragPropsFor(id)}
                >
                  <Body />
                </Portlet>
              );
            })}
          </section>
        </main>
      </div>

      <TweaksPanel>
        <TweakSection label="Layout profile" />
        <TweakSelect
          label="Starting layout"
          value={t.layout}
          options={['Default', 'Miner', 'Salvager', 'Hauler']}
          onChange={(v) => setTweak('layout', v)}
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

window.DashboardGridApp = DashboardGridApp;
