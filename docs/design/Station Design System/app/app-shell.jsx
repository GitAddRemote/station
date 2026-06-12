// ============================================================
// Station — application shell (shared)
// Sidebar + app bar + command palette + keyboard shortcuts +
// roving-focus helpers + shared primitives. Exposed on window
// so each page's JSX can use them.
//   Keyboard model:
//   ⌘/Ctrl K  command palette      ?  shortcuts        /  search
//   g then d/w/c/f/m  go to page    n  new (page-defined)   Esc close
// ============================================================

// Render lucide icons as REAL React-owned SVG (no createIcons() DOM mutation).
// This keeps React in full control so subtree swaps (e.g. edit toggles) never
// hit "removeChild" errors from lucide replacing nodes in place.
const ICON_ALIAS = { 'hand-helping': 'Handshake', 'helping-hand': 'Handshake' };
function lucideNode(name) {
  const L = window.lucide || {};
  const key =
    ICON_ALIAS[name] ||
    String(name)
      .split('-')
      .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
      .join('');
  const node = L[key] || (L.icons && L.icons[key]);
  return Array.isArray(node) ? node : null;
}
function iconChildren(kids) {
  return (kids || []).map((c, i) => {
    const [tag, attrs, sub] = c;
    const props = { key: i };
    for (const k in attrs || {})
      props[k.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = attrs[k];
    return React.createElement(tag, props, sub ? iconChildren(sub) : undefined);
  });
}
const Icon = ({ n, size, ...p }) => {
  const node = lucideNode(n);
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size || 24,
      height: size || 24,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
      ...p,
    },
    node ? iconChildren(node[2]) : null,
  );
};

// org-tool navigation (single source of truth)
const NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'layout-dashboard',
    href: '../dashboard/Station Dashboard v2.html',
    key: 'd',
  },
  {
    id: 'workorders',
    label: 'Work Orders',
    icon: 'pickaxe',
    href: 'Work Orders.html',
    key: 'w',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    icon: 'scroll-text',
    href: 'Contracts.html',
    key: 'c',
  },
  { id: 'fleet', label: 'Fleet', icon: 'rocket', href: 'Fleet.html', key: 'f' },
  {
    id: 'members',
    label: 'Members',
    icon: 'users',
    href: 'Members.html',
    key: 'm',
  },
];
const NAV_SECONDARY = [
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'archive',
    href: 'Inventory.html',
  },
  {
    id: 'treasury',
    label: 'Treasury',
    icon: 'landmark',
    href: 'Treasury.html',
  },
];

// ---- theme + accent (persisted; shared with dashboard) -------
function useChrome() {
  const [theme, setTheme] = React.useState(() => {
    try {
      return localStorage.getItem('station-dash-theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  const [accent, setAccent] = React.useState(() => {
    try {
      return localStorage.getItem('station-accent') || 'aqua';
    } catch (e) {
      return 'aqua';
    }
  });
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('station-dash-theme', theme);
    } catch (e) {}
  }, [theme]);
  React.useEffect(() => {
    try {
      localStorage.setItem('station-accent', accent);
    } catch (e) {}
  }, [accent]);
  return { theme, setTheme, accent, setAccent };
}

// ---- roving focus for lists/tables --------------------------
// returns handlers; rows get tabIndex from getTab(i); container onKeyDown.
function useRoving(count, { onActivate, orientation = 'vertical' } = {}) {
  const [idx, setIdx] = React.useState(0);
  const refs = React.useRef([]);
  const focus = (i) => {
    const el = refs.current[i];
    if (el) el.focus();
  };
  const clamp = (i) => Math.max(0, Math.min(count - 1, i));
  const onKeyDown = (e) => {
    const nextKeys =
      orientation === 'vertical' ? ['ArrowDown', 'j'] : ['ArrowRight'];
    const prevKeys =
      orientation === 'vertical' ? ['ArrowUp', 'k'] : ['ArrowLeft'];
    if (nextKeys.includes(e.key)) {
      e.preventDefault();
      const i = clamp(idx + 1);
      setIdx(i);
      focus(i);
    } else if (prevKeys.includes(e.key)) {
      e.preventDefault();
      const i = clamp(idx - 1);
      setIdx(i);
      focus(i);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setIdx(0);
      focus(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setIdx(count - 1);
      focus(count - 1);
    } else if ((e.key === 'Enter' || e.key === ' ') && onActivate) {
      e.preventDefault();
      onActivate(idx);
    }
  };
  const getTab = (i) => (i === idx ? 0 : -1);
  const register = (i) => (el) => {
    refs.current[i] = el;
  };
  return { idx, setIdx, onKeyDown, getTab, register, focus };
}

// ---- primitives ----------------------------------------------
function Kbd({ keys }) {
  return (
    <span className="kbd">
      {keys.map((k, i) => (
        <kbd key={i}>{k}</kbd>
      ))}
    </span>
  );
}

function Segmented({ options, value, onChange, ariaLabel }) {
  const ref = React.useRef(null);
  const onKey = (e) => {
    const i = options.findIndex((o) => (o.value ?? o) === value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      const n = (i + d + options.length) % options.length;
      onChange(options[n].value ?? options[n]);
      const btns = ref.current.querySelectorAll('button');
      if (btns[n]) btns[n].focus();
    }
  };
  return (
    <div
      className="seg"
      role="tablist"
      aria-label={ariaLabel}
      ref={ref}
      onKeyDown={onKey}
    >
      {options.map((o) => {
        const v = o.value ?? o;
        const label = o.label ?? o;
        const sel = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={sel}
            tabIndex={sel ? 0 : -1}
            onClick={() => onChange(v)}
          >
            {o.icon && <Icon n={o.icon} />}
            {label}
            {o.count != null && <span className="count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function StatusPill({ tone = 'neutral', icon, children }) {
  return (
    <span className={'spill ' + tone}>
      {icon && <Icon n={icon} />}
      {children}
    </span>
  );
}

function StatStrip({ items }) {
  return (
    <div className="statstrip" style={{ '--n': items.length }}>
      {items.map((s, i) => (
        <div className="statcard" key={i}>
          <div className="k">
            {s.icon && <Icon n={s.icon} />}
            {s.k}
          </div>
          <div className="v">
            {s.v}
            {s.unit && <span className="unit">{s.unit}</span>}
          </div>
          {s.d && (
            <div className={'d' + (s.tone ? ' ' + s.tone : '')}>{s.d}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// deterministic avatar color from a string
function avColor(seed) {
  const palettes = [
    'var(--aqua-500)',
    'var(--teal-500)',
    'var(--coral-500)',
    '#6E7BF2',
    '#C879D8',
    '#3FB6A8',
    '#E0913A',
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return palettes[h % palettes.length];
}
function AvatarChip({ name, handle }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="achip">
      <span className="av" style={{ background: avColor(name) }}>
        {initials}
      </span>
      <span>
        <span className="nm">{name}</span>
        {handle && (
          <span
            className="t-muted"
            style={{ fontSize: 'var(--text-xs)', marginLeft: 6 }}
          >
            {handle}
          </span>
        )}
      </span>
    </span>
  );
}

// ---- toasts (tiny global) -----------------------------------
const ToastCtx = React.createContext(() => {});
function useToast() {
  return React.useContext(ToastCtx);
}

// ---- command palette ----------------------------------------
function CommandPalette({ open, onClose, commands }) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 20);
    }
  }, [open]);
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  if (!open) return null;
  const filtered = commands.filter((c) =>
    (c.label + ' ' + (c.group || '')).toLowerCase().includes(q.toLowerCase()),
  );
  const run = (c) => {
    onClose();
    if (c.run) c.run();
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[sel]) run(filtered[sel]);
    }
  };
  let lastGroup = null;
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="cmdk"
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmdk-in">
          <Icon n="search" />
          <input
            ref={inputRef}
            value={q}
            placeholder="Search actions, pages, people…"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKey}
          />
          <span className="kbd">
            <kbd>Esc</kbd>
          </span>
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 && (
            <div className="cmdk-empty">No matches for “{q}”.</div>
          )}
          {filtered.map((c, i) => {
            const head =
              c.group && c.group !== lastGroup ? (
                <div className="cmdk-cap" key={'g' + i}>
                  {c.group}
                </div>
              ) : null;
            lastGroup = c.group;
            return (
              <React.Fragment key={c.id}>
                {head}
                <div
                  className={'cmdk-item' + (i === sel ? ' active' : '')}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => run(c)}
                >
                  <span className="ic">
                    <Icon n={c.icon} />
                  </span>
                  <span className="lbl">{c.label}</span>
                  {c.hint && <span className="hint">{c.hint}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="cmdk-foot">
          <span className="kbd">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
          </span>
          <span className="t-muted" style={{ fontSize: 'var(--text-xs)' }}>
            navigate
          </span>
          <span className="kbd">
            <kbd>↵</kbd>
          </span>
          <span className="t-muted" style={{ fontSize: 'var(--text-xs)' }}>
            run
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- keyboard help ------------------------------------------
function KeyHelp({ open, onClose, extra = [] }) {
  React.useEffect(() => {
    if (open && window.lucide) window.lucide.createIcons();
  });
  if (!open) return null;
  const groups = [
    {
      cap: 'Global',
      rows: [
        ['Command palette', ['⌘', 'K']],
        ['Search', ['/']],
        ['This help', ['?']],
        ['Close / back', ['Esc']],
      ],
    },
    {
      cap: 'Go to',
      rows: [
        ['Dashboard', ['g', 'd']],
        ['Work Orders', ['g', 'w']],
        ['Contracts', ['g', 'c']],
        ['Fleet', ['g', 'f']],
        ['Members', ['g', 'm']],
      ],
    },
    {
      cap: 'Lists & tables',
      rows: [
        ['Move selection', ['↑', '↓']],
        ['Vim move', ['j', 'k']],
        ['First / last', ['Home', 'End']],
        ['Open row', ['↵']],
      ],
    },
    {
      cap: 'This page',
      rows: extra.length
        ? extra
        : [
            ['New item', ['n']],
            ['Toggle theme', ['t']],
          ],
    },
  ];
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="khelp"
        role="dialog"
        aria-label="Keyboard shortcuts"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="khelp-head">
          <h2>Keyboard shortcuts</h2>
          <button className="ibtn" onClick={onClose} aria-label="Close">
            <Icon n="x" />
          </button>
        </div>
        <div className="khelp-grid">
          {groups.map((g) => (
            <div key={g.cap}>
              <div className="grp-cap">{g.cap}</div>
              {g.rows.map((r, i) => (
                <div className="krow" key={i}>
                  <span>{r[0]}</span>
                  <Kbd keys={r[1]} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- the shell ----------------------------------------------
function AppShell({
  active,
  title,
  children,
  commands = [],
  helpExtra = [],
  onNew,
  searchPlaceholder = 'Search…',
}) {
  const { theme, setTheme, accent, setAccent } = useChrome();
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [toasts, setToasts] = React.useState([]);
  const gPending = React.useRef(false);

  const pushToast = React.useCallback((msg, icon = 'check') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  // expose toast globally so page-level commands can fire it
  React.useEffect(() => {
    window.__toast = pushToast;
    return () => {
      if (window.__toast === pushToast) delete window.__toast;
    };
  }, [pushToast]);

  const go = (href) => {
    if (href && href !== '#') window.location.href = href;
  };
  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));

  // build default command set (nav + theme + page commands)
  const allCommands = React.useMemo(() => {
    const navCmds = NAV.filter((n) => !n.soon).map((n) => ({
      id: 'nav-' + n.id,
      group: 'Go to',
      icon: n.icon,
      label: n.label,
      hint: 'g ' + n.key,
      run: () => go(n.href),
    }));
    const sys = [
      {
        id: 'theme',
        group: 'System',
        icon: theme === 'dark' ? 'sun' : 'moon',
        label:
          theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        run: toggleTheme,
      },
      {
        id: 'accent',
        group: 'System',
        icon: 'palette',
        label: 'Toggle accent (Aqua / Coral)',
        run: () => setAccent((a) => (a === 'aqua' ? 'coral' : 'aqua')),
      },
      {
        id: 'help',
        group: 'System',
        icon: 'keyboard',
        label: 'Keyboard shortcuts',
        hint: '?',
        run: () => setHelpOpen(true),
      },
    ];
    return [...commands, ...navCmds, ...sys];
  }, [commands, theme]);

  // global keyboard
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing =
        tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      // ⌘K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
        return;
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
        setHelpOpen(false);
        setNavOpen(false);
        return;
      }
      if (typing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // g-then-key navigation
      if (gPending.current) {
        gPending.current = false;
        const target = NAV.find((n) => n.key === e.key.toLowerCase());
        if (target) {
          e.preventDefault();
          go(target.href);
          return;
        }
      }
      if (e.key === 'g') {
        gPending.current = true;
        setTimeout(() => {
          gPending.current = false;
        }, 900);
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === 't') {
        toggleTheme();
        return;
      }
      if (e.key === 'n' && onNew) {
        e.preventDefault();
        onNew();
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onNew, theme]);

  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  const activeNav = NAV.find((n) => n.id === active);

  return (
    <ToastCtx.Provider value={pushToast}>
      <div
        className={'app' + (navOpen ? ' nav-open' : '')}
        data-theme={theme}
        data-accent={accent}
      >
        <a className="skip" href="#main">
          Skip to content
        </a>

        <aside className="sidebar">
          <div className="side-head">
            <button className="side-org" aria-label="Switch organization">
              <span className="badge">AV</span>
              <span>
                <span className="nm">Atlas Vanguard</span>
                <span className="role">Quartermaster</span>
              </span>
              <span className="chev">
                <Icon n="chevrons-up-down" />
              </span>
            </button>
          </div>
          <nav className="side-nav" aria-label="Primary">
            <div className="side-cap">Operations</div>
            {NAV.map((n) => (
              <a
                key={n.id}
                className={
                  'side-link' +
                  (n.id === active ? ' active' : '') +
                  (n.soon ? ' soon' : '')
                }
                href={n.soon ? undefined : n.href}
                aria-current={n.id === active ? 'page' : undefined}
                aria-disabled={n.soon || undefined}
              >
                <Icon n={n.icon} />
                <span className="lbl">{n.label}</span>
                {n.soon ? (
                  <span className="soon-tag">soon</span>
                ) : (
                  <span className="key">{n.key}</span>
                )}
              </a>
            ))}
            <div className="side-cap">Assets</div>
            {NAV_SECONDARY.map((n) => (
              <a
                key={n.id}
                className={
                  'side-link' +
                  (n.id === active ? ' active' : '') +
                  (n.soon ? ' soon' : '')
                }
                href={n.soon ? undefined : n.href}
                aria-current={n.id === active ? 'page' : undefined}
                aria-disabled={n.soon || undefined}
              >
                <Icon n={n.icon} />
                <span className="lbl">{n.label}</span>
                {n.soon ? (
                  <span className="soon-tag">soon</span>
                ) : n.id === active ? null : (
                  <span className="key"></span>
                )}
              </a>
            ))}
          </nav>
          <div className="side-foot">
            <button className="side-help" onClick={() => setHelpOpen(true)}>
              <Icon n="keyboard" /> Keyboard shortcuts{' '}
              <span className="kbd">
                <kbd>?</kbd>
              </span>
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="appbar">
            <button
              className="ibtn side-toggle"
              aria-label="Menu"
              onClick={() => setNavOpen((o) => !o)}
            >
              <Icon n="menu" />
            </button>
            <button
              className="appbar-search"
              onClick={() => setCmdOpen(true)}
              aria-label="Search and commands"
            >
              <Icon n="search" />
              <span className="ph">{searchPlaceholder}</span>
              <span className="kbd">
                <kbd>⌘</kbd>
                <kbd>K</kbd>
              </span>
            </button>
            <span className="appbar-spacer"></span>
            <div className="appbar-right">
              <button
                className="ibtn"
                onClick={toggleTheme}
                aria-label={
                  theme === 'dark'
                    ? 'Switch to light mode'
                    : 'Switch to dark mode'
                }
                title="Toggle theme (t)"
              >
                <Icon n={theme === 'dark' ? 'sun' : 'moon'} />
              </button>
              <button className="ibtn" aria-label="Notifications">
                <Icon n="bell" />
                <span className="dot"></span>
              </button>
              <a
                className="uavatar"
                href="Profile.html"
                aria-label="Account · My Profile"
                title="My Profile"
                style={{ textDecoration: 'none' }}
              >
                H
              </a>
            </div>
          </header>

          <main className="page" id="main">
            {children}
          </main>
        </div>

        <CommandPalette
          open={cmdOpen}
          onClose={() => setCmdOpen(false)}
          commands={allCommands}
        />
        <KeyHelp
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          extra={helpExtra}
        />

        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div className="toast" key={t.id}>
              <Icon n={t.icon} />
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

Object.assign(window, {
  StationIcon: Icon,
  NAV,
  useRoving,
  useChrome,
  useToast,
  Kbd,
  Segmented,
  StatusPill,
  StatStrip,
  AvatarChip,
  avColor,
  AppShell,
});
