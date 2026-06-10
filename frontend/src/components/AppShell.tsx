import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import { ToastContext, PushToast } from '../contexts/ToastContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Construction as PickaxeIcon,
  Article as ContractsIcon,
  RocketLaunch as FleetIcon,
  Group as MembersIcon,
  Inventory2 as InventoryIcon,
  AccountBalance as TreasuryIcon,
  Search as SearchIcon,
  Keyboard as KeyboardIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Notifications as NotificationsIcon,
  CheckCircleOutline as CheckIcon,
  UnfoldMoreDouble as ChevronUpDownIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { api } from '../services/api.service';
import './AppShell.css';

// ---- navigation items ------------------------------------------------
interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  href: string;
  key?: string;
  soon?: boolean;
}

const NAV_PRIMARY: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',   icon: <DashboardIcon />, href: '/dashboard',  key: 'd' },
  { id: 'workorders', label: 'Work Orders',  icon: <PickaxeIcon />,   href: '/work-orders', key: 'w', soon: true },
  { id: 'contracts',  label: 'Contracts',    icon: <ContractsIcon />, href: '/contracts',  key: 'c', soon: true },
  { id: 'fleet',      label: 'Fleet',        icon: <FleetIcon />,     href: '/fleet',      key: 'f', soon: true },
  { id: 'members',    label: 'Members',      icon: <MembersIcon />,   href: '/members',    key: 'm', soon: true },
];

const NAV_ASSETS: NavItem[] = [
  { id: 'inventory', label: 'Inventory', icon: <InventoryIcon />, href: '/inventory' },
  { id: 'treasury',  label: 'Treasury',  icon: <TreasuryIcon />,  href: '/treasury', soon: true },
];

// ---- theme persistence -----------------------------------------------
type Theme = 'dark' | 'light';
type Accent = 'aqua' | 'coral';

function useChrome() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try { return (localStorage.getItem('station-theme') as Theme) || 'dark'; } catch { return 'dark'; }
  });
  const [accent, setAccentState] = useState<Accent>(() => {
    try { return (localStorage.getItem('station-accent') as Accent) || 'aqua'; } catch { return 'aqua'; }
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem('station-theme', t); } catch { /* ignore */ }
  }, []);

  const setAccent = useCallback((a: Accent) => {
    setAccentState(a);
    try { localStorage.setItem('station-accent', a); } catch { /* ignore */ }
  }, []);

  return { theme, setTheme, accent, setAccent };
}

interface Toast { id: string; msg: string; icon: string; }

// ---- command palette -------------------------------------------------
interface Command {
  id: string;
  group?: string;
  icon?: ReactNode;
  label: string;
  hint?: string;
  run?: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  if (!open) return null;

  const filtered = commands.filter((c) =>
    (c.label + ' ' + (c.group || '')).toLowerCase().includes(q.toLowerCase()),
  );

  const run = (c: Command) => { onClose(); c.run?.(); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[sel]) run(filtered[sel]); }
  };

  let lastGroup: string | undefined = undefined;

  return (
    <div className="shell-scrim" onMouseDown={onClose}>
      <div className="shell-cmdk" role="dialog" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="shell-cmdk-in">
          <SearchIcon style={{ width: 18, height: 18 }} />
          <input
            ref={inputRef}
            value={q}
            placeholder="Search actions, pages, people…"
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKey}
          />
          <span className="shell-kbd"><kbd>Esc</kbd></span>
        </div>
        <div className="shell-cmdk-list">
          {filtered.length === 0 && (
            <div className="shell-cmdk-empty">No matches for "{q}".</div>
          )}
          {filtered.map((c, i) => {
            const showHead = c.group && c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {showHead && <div className="shell-cmdk-cap">{c.group}</div>}
                <div
                  className={'shell-cmdk-item' + (i === sel ? ' active' : '')}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => run(c)}
                >
                  <span className="shell-cmdk-ic">{c.icon}</span>
                  <span className="shell-cmdk-label">{c.label}</span>
                  {c.hint && <span className="shell-cmdk-hint">{c.hint}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="shell-cmdk-foot">
          <span className="shell-kbd"><kbd>↑</kbd><kbd>↓</kbd></span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>navigate</span>
          <span className="shell-kbd"><kbd>↵</kbd></span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>run</span>
        </div>
      </div>
    </div>
  );
}

// ---- keyboard help ---------------------------------------------------
interface KeyHelpProps {
  open: boolean;
  onClose: () => void;
  extra?: Array<[string, string[]]>;
}

function KeyHelp({ open, onClose, extra = [] }: KeyHelpProps) {
  if (!open) return null;

  const groups = [
    { cap: 'Global', rows: [
      ['Command palette', ['⌘', 'K']], ['Search', ['/']], ['This help', ['?']], ['Close / back', ['Esc']],
    ] as Array<[string, string[]]> },
    { cap: 'Go to', rows: [
      ['Dashboard', ['g', 'd']], ['Work Orders', ['g', 'w']], ['Contracts', ['g', 'c']], ['Fleet', ['g', 'f']], ['Members', ['g', 'm']],
    ] as Array<[string, string[]]> },
    { cap: 'Lists & tables', rows: [
      ['Move selection', ['↑', '↓']], ['Vim move', ['j', 'k']], ['First / last', ['Home', 'End']], ['Open row', ['↵']],
    ] as Array<[string, string[]]> },
    { cap: 'This page', rows: extra.length ? extra : [['New item', ['n']], ['Toggle theme', ['t']]] as Array<[string, string[]]> },
  ];

  return (
    <div className="shell-scrim" onMouseDown={onClose}>
      <div className="shell-khelp" role="dialog" aria-label="Keyboard shortcuts" onMouseDown={(e) => e.stopPropagation()}>
        <div className="shell-khelp-head">
          <h2>Keyboard shortcuts</h2>
          <button className="shell-ibtn" onClick={onClose} aria-label="Close">
            <CloseIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div className="shell-khelp-grid">
          {groups.map((g) => (
            <div key={g.cap}>
              <div className="shell-khelp-grp-cap">{g.cap}</div>
              {g.rows.map((r, i) => (
                <div className="shell-krow" key={i}>
                  <span>{r[0]}</span>
                  <span className="shell-kbd">
                    {r[1].map((k, ki) => <kbd key={ki}>{k}</kbd>)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- AppShell --------------------------------------------------------
export interface AppShellProps {
  active: string;
  children: ReactNode;
  commands?: Command[];
  helpExtra?: Array<[string, string[]]>;
  onNew?: () => void;
  searchPlaceholder?: string;
  userInitial?: string;
  orgName?: string;
  orgRole?: string;
}

export function AppShell({
  active,
  children,
  commands = [],
  helpExtra = [],
  onNew,
  searchPlaceholder = 'Search…',
  userInitial = 'U',
  orgName = 'My Organization',
  orgRole = 'Member',
}: AppShellProps) {
  const { theme, setTheme, accent } = useChrome();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const gPending = useRef(false);
  const navigate = useNavigate();

  const pushToast = useCallback<PushToast>((msg, _icon = 'check') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, icon: _icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const go = useCallback((href: string) => {
    if (href && href !== '#') navigate(href);
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try { await api.post('/auth/logout', {}); } catch { /* ignore */ }
    navigate('/login');
  }, [navigate]);

  const allCommands = useMemo<Command[]>(() => {
    const navCmds = NAV_PRIMARY
      .filter((n) => !n.soon)
      .map((n) => ({
        id: 'nav-' + n.id,
        group: 'Go to',
        icon: n.icon,
        label: n.label,
        hint: n.key ? 'g ' + n.key : undefined,
        run: () => go(n.href),
      }));
    const sys: Command[] = [
      {
        id: 'theme',
        group: 'System',
        icon: theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />,
        label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        run: toggleTheme,
      },
      {
        id: 'help',
        group: 'System',
        icon: <KeyboardIcon />,
        label: 'Keyboard shortcuts',
        hint: '?',
        run: () => setHelpOpen(true),
      },
      {
        id: 'signout',
        group: 'System',
        icon: <LogoutIcon />,
        label: 'Sign out',
        run: handleSignOut,
      },
    ];
    return [...commands, ...navCmds, ...sys];
  }, [commands, theme, toggleTheme, go, handleSignOut]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const typing =
        tag === 'input' ||
        tag === 'textarea' ||
        (e.target as HTMLElement)?.isContentEditable;

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

      if (gPending.current) {
        gPending.current = false;
        const target = NAV_PRIMARY.find((n) => n.key === e.key.toLowerCase());
        if (target && !target.soon) {
          e.preventDefault();
          go(target.href);
          return;
        }
      }
      if (e.key === 'g') {
        gPending.current = true;
        setTimeout(() => { gPending.current = false; }, 900);
        return;
      }
      if (e.key === '/') { e.preventDefault(); setCmdOpen(true); return; }
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (e.key === 't') { toggleTheme(); return; }
      if (e.key === 'n' && onNew) { e.preventDefault(); onNew(); return; }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onNew, toggleTheme, go]);

  // apply theme to html element for DS token cascade
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ToastContext.Provider value={pushToast}>
      <div
        className={'app-shell' + (navOpen ? ' nav-open' : '')}
        data-theme={theme}
        data-accent={accent}
      >
        <a className="shell-skip" href="#main">Skip to content</a>

        {/* Sidebar */}
        <aside className="shell-sidebar">
          <div className="side-head">
            <button className="side-org" aria-label="Switch organization">
              <span className="side-org-badge">{orgName.slice(0, 2).toUpperCase()}</span>
              <span>
                <span className="side-org-name">{orgName}</span>
                <span className="side-org-role">{orgRole}</span>
              </span>
              <span className="side-org-chev">
                <ChevronUpDownIcon style={{ width: 15, height: 15 }} />
              </span>
            </button>
          </div>

          <nav className="side-nav" aria-label="Primary">
            <div className="side-cap">Operations</div>
            {NAV_PRIMARY.map((n) => (
              <Link
                key={n.id}
                className={'side-link' + (n.id === active ? ' active' : '') + (n.soon ? ' soon' : '')}
                to={n.soon ? '#' : n.href}
                aria-current={n.id === active ? 'page' : undefined}
                onClick={(e) => { if (n.soon) e.preventDefault(); if (!n.soon) setNavOpen(false); }}
              >
                {n.icon}
                <span className="side-link-label">{n.label}</span>
                {n.soon
                  ? <span className="side-link-soon-tag">soon</span>
                  : <span className="side-link-key">{n.key}</span>
                }
              </Link>
            ))}

            <div className="side-cap">Assets</div>
            {NAV_ASSETS.map((n) => (
              <Link
                key={n.id}
                className={'side-link' + (n.id === active ? ' active' : '') + (n.soon ? ' soon' : '')}
                to={n.soon ? '#' : n.href}
                aria-current={n.id === active ? 'page' : undefined}
                onClick={(e) => { if (n.soon) e.preventDefault(); if (!n.soon) setNavOpen(false); }}
              >
                {n.icon}
                <span className="side-link-label">{n.label}</span>
                {n.soon
                  ? <span className="side-link-soon-tag">soon</span>
                  : (n.id !== active ? <span className="side-link-key"></span> : null)
                }
              </Link>
            ))}
          </nav>

          <div className="side-foot">
            <button className="side-help-btn" onClick={() => setHelpOpen(true)}>
              <KeyboardIcon style={{ width: 15, height: 15 }} />
              Keyboard shortcuts
              <span className="shell-kbd side-help-kbd"><kbd>?</kbd></span>
            </button>
          </div>
        </aside>

        {/* Main area */}
        <div className="shell-main">
          <header className="shell-appbar">
            <button
              className="shell-ibtn shell-menu-toggle"
              aria-label="Menu"
              onClick={() => setNavOpen((o) => !o)}
            >
              <MenuIcon style={{ width: 18, height: 18 }} />
            </button>

            <button
              className="shell-search-btn"
              onClick={() => setCmdOpen(true)}
              aria-label="Search and commands"
            >
              <SearchIcon style={{ width: 17, height: 17 }} />
              <span className="shell-search-ph">{searchPlaceholder}</span>
              <span className="shell-kbd"><kbd>⌘</kbd><kbd>K</kbd></span>
            </button>

            <span className="shell-spacer" />

            <div className="shell-appbar-right">
              <button
                className="shell-ibtn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title="Toggle theme (t)"
              >
                {theme === 'dark'
                  ? <LightModeIcon style={{ width: 18, height: 18 }} />
                  : <DarkModeIcon style={{ width: 18, height: 18 }} />
                }
              </button>

              <button className="shell-ibtn" aria-label="Notifications">
                <NotificationsIcon style={{ width: 18, height: 18 }} />
                <span className="shell-ibtn-dot" />
              </button>

              <Link
                className="shell-avatar"
                to="/profile"
                aria-label="Account · My Profile"
                title="My Profile"
              >
                {userInitial}
              </Link>
            </div>
          </header>

          <main className="shell-page" id="main">
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

        <div className="shell-toasts" aria-live="polite">
          {toasts.map((t) => (
            <div className="shell-toast" key={t.id}>
              <CheckIcon style={{ width: 16, height: 16 }} />
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export default AppShell;
