import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import MailIcon from '@mui/icons-material/Mail';
import ConstructionIcon from '@mui/icons-material/Construction';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArticleIcon from '@mui/icons-material/Article';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RecyclingIcon from '@mui/icons-material/Recycling';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import GridViewIcon from '@mui/icons-material/GridView';
import MoveDownIcon from '@mui/icons-material/MoveDown';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import CheckIcon from '@mui/icons-material/Check';
import AppShell from '../components/AppShell';
import Portlet, { type PortletSize } from '../components/dashboard/Portlet';
import ProfilePortlet from '../components/dashboard/portlets/ProfilePortlet';
import OrganizationsPortlet from '../components/dashboard/portlets/OrganizationsPortlet';
import InvitationsPortlet from '../components/dashboard/portlets/InvitationsPortlet';
import StubPortlet from '../components/dashboard/portlets/StubPortlet';
import InventoryPortlet from '../components/inventory/InventoryPortlet';
import ContractsPortlet from '../components/contracts/ContractsPortlet';
import '../components/dashboard/Dashboard.css';
import { api } from '../services/api.service';

// ---- types ---------------------------------------------------
interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface Org {
  id: string;
  name: string;
  role?: string;
  memberCount?: number;
}

// ---- layout persistence ------------------------------------
const LS_LAYOUT_KEY  = 'station-dash-layout-v2';
const LS_SIZES_KEY   = 'station-dash-sizes-v1';

const PORTLET_DEFS = [
  { id: 'profile',     title: 'My Profile',      icon: <PersonIcon />,         href: '/profile',    defaultSize: 'compact'  as PortletSize },
  { id: 'orgs',        title: 'Organizations',    icon: <GroupsIcon />,                              defaultSize: 'compact'  as PortletSize },
  { id: 'invitations', title: 'Invitations',      icon: <MailIcon />,                                defaultSize: 'compact'  as PortletSize },
  { id: 'workorders',  title: 'Work Orders',      icon: <ConstructionIcon />,   href: '/work-orders', defaultSize: 'compact'  as PortletSize },
  { id: 'fleet',       title: 'Fleet',            icon: <RocketLaunchIcon />,   href: '/fleet',       defaultSize: 'compact'  as PortletSize },
  { id: 'contracts',   title: 'Contracts',        icon: <ArticleIcon />,        href: '/contracts',   defaultSize: 'compact'  as PortletSize },
  { id: 'treasury',    title: 'Treasury',         icon: <AccountBalanceIcon />, href: '/treasury',    defaultSize: 'compact'  as PortletSize },
  { id: 'mining',      title: 'Mining',           icon: <TrendingUpIcon />,                           defaultSize: 'compact'  as PortletSize },
  { id: 'salvage',     title: 'Salvage',          icon: <RecyclingIcon />,                            defaultSize: 'compact'  as PortletSize },
  { id: 'hauling',     title: 'Hauling & Trade',  icon: <LocalShippingIcon />,                        defaultSize: 'compact'  as PortletSize },
  { id: 'inventory',   title: 'My Inventory',     icon: <AccountBalanceIcon />, href: '/inventory',   defaultSize: 'full'     as PortletSize },
] as const;

type PortletId = typeof PORTLET_DEFS[number]['id'];
const ALL_IDS: PortletId[] = PORTLET_DEFS.map((p) => p.id);

const DEFAULT_ORDER: PortletId[] = [
  'profile', 'orgs', 'invitations',
  'workorders', 'fleet', 'contracts',
  'treasury', 'mining', 'salvage',
  'hauling', 'inventory',
];

function defaultSizes(): Record<PortletId, PortletSize> {
  return Object.fromEntries(
    PORTLET_DEFS.map((p) => [p.id, p.defaultSize])
  ) as Record<PortletId, PortletSize>;
}

function loadSizes(): Record<PortletId, PortletSize> {
  try {
    const s = JSON.parse(localStorage.getItem(LS_SIZES_KEY) || 'null');
    if (s && typeof s === 'object') {
      const defaults = defaultSizes();
      const valid: PortletSize[] = ['compact', 'standard', 'full'];
      for (const id of ALL_IDS) {
        if (valid.includes(s[id])) defaults[id] = s[id];
      }
      return defaults;
    }
  } catch { /* ignore */ }
  return defaultSizes();
}

function saveSizes(sizes: Record<PortletId, PortletSize>) {
  try { localStorage.setItem(LS_SIZES_KEY, JSON.stringify(sizes)); } catch { /* ignore */ }
}

function reconcile(arr: string[]): PortletId[] {
  const valid = new Set(ALL_IDS as readonly string[]);
  const seen = new Set<string>();
  const out: PortletId[] = [];
  for (const id of arr) {
    if (valid.has(id) && !seen.has(id)) { seen.add(id); out.push(id as PortletId); }
  }
  for (const id of ALL_IDS) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

function loadLayout(): PortletId[] {
  try {
    const s = JSON.parse(localStorage.getItem(LS_LAYOUT_KEY) || 'null');
    if (Array.isArray(s) && s.length) return reconcile(s);
  } catch { /* ignore */ }
  return [...DEFAULT_ORDER];
}

function saveLayout(order: PortletId[]) {
  try { localStorage.setItem(LS_LAYOUT_KEY, JSON.stringify(order)); } catch { /* ignore */ }
}

// ---- Dashboard ---------------------------------------------
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  const [order, setOrder] = useState<PortletId[]>(loadLayout);
  const [sizes, setSizes] = useState<Record<PortletId, PortletSize>>(loadSizes);
  const [editing, setEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<PortletId[] | null>(null);
  const [dragId, setDragId] = useState<PortletId | null>(null);
  const [overId, setOverId] = useState<PortletId | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const profileRes = await api.get('/users/profile');
        const userId: string = profileRes.data.userId ?? profileRes.data.id;
        if (!userId) throw new Error('No user id in profile response');
        const orgsRes = await api.get(`/user-organization-roles/user/${userId}/organizations`).catch(() => ({ data: [] }));
        setUser(profileRes.data);
        const seen = new Set<string>();
        const mappedOrgs: Org[] = Array.isArray(orgsRes.data)
          ? (orgsRes.data as Array<{ organization?: { id: string; name: string }; role?: { name: string } }>)
              .filter((row) => row.organization?.id && row.organization?.name)
              .filter((row) => !seen.has(row.organization!.id) && seen.add(row.organization!.id))
              .map((row) => ({
                id: row.organization!.id,
                name: row.organization!.name,
                role: row.role?.name,
              }))
          : [];
        setOrgs(mappedOrgs);
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const startEdit = useCallback(() => { setEditSnapshot(order); setEditing(true); }, [order]);
  const cancelEdit = useCallback(() => {
    if (editSnapshot) setOrder(editSnapshot);
    setEditing(false); setDragId(null); setOverId(null);
  }, [editSnapshot]);
  const saveEdit = useCallback(() => {
    saveLayout(order); saveSizes(sizes); setEditing(false); setDragId(null); setOverId(null);
  }, [order, sizes]);

  const handleSizeChange = useCallback((id: PortletId, size: PortletSize) => {
    setSizes((prev) => ({ ...prev, [id]: size }));
  }, []);
  const resetLayout = useCallback(() => setOrder([...DEFAULT_ORDER]), []);

  const move = useCallback((drag: PortletId, target: PortletId) => {
    if (!drag || drag === target) return;
    setOrder((prev) => {
      const arr = prev.filter((id) => id !== drag);
      const idx = arr.indexOf(target);
      arr.splice(idx < 0 ? arr.length : idx, 0, drag);
      return arr;
    });
  }, []);

  const dragPropsFor = useCallback((id: PortletId): React.HTMLAttributes<HTMLElement> => {
    if (!editing) return {};
    return {
      draggable: true,
      onDragStart: (e) => {
        setDragId(id);
        (e as React.DragEvent).dataTransfer.effectAllowed = 'move';
        try { (e as React.DragEvent).dataTransfer.setData('text/plain', id); } catch { /* ignore */ }
      },
      onDragOver: (e) => {
        e.preventDefault();
        (e as React.DragEvent).dataTransfer.dropEffect = 'move';
        if (overId !== id) setOverId(id);
      },
      onDragLeave: () => { if (overId === id) setOverId(null); },
      onDrop: (e) => {
        e.preventDefault();
        if (dragId) move(dragId, id);
        setDragId(null); setOverId(null);
      },
      onDragEnd: () => { setDragId(null); setOverId(null); },
    };
  }, [editing, dragId, overId, move]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--surface-page)' }}>
        <CircularProgress />
      </Box>
    );
  }

  const displayName = user?.firstName || user?.username || '';
  const userInitial = user?.firstName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U';

  const renderPortletBody = (id: PortletId, size: PortletSize) => {
    switch (id) {
      case 'profile':
        return <ProfilePortlet username={user?.username || ''} />;
      case 'orgs':
        return <OrganizationsPortlet orgs={orgs} />;
      case 'invitations':
        return <InvitationsPortlet invitations={[]} />;
      case 'inventory':
        return <InventoryPortlet />;
      case 'workorders':
        return <StubPortlet icon={<ConstructionIcon />} label="Work Orders" />;
      case 'fleet':
        return <StubPortlet icon={<RocketLaunchIcon />} label="Fleet" />;
      case 'contracts':
        return <ContractsPortlet size={size} />;
      case 'treasury':
        return <StubPortlet icon={<AccountBalanceIcon />} label="Treasury" />;
      case 'mining':
        return <StubPortlet icon={<TrendingUpIcon />} label="Mining" />;
      case 'salvage':
        return <StubPortlet icon={<RecyclingIcon />} label="Salvage" />;
      case 'hauling':
        return <StubPortlet icon={<LocalShippingIcon />} label="Hauling & Trade" />;
      default:
        return null;
    }
  };

  return (
    <AppShell active="dashboard" userInitial={userInitial} searchPlaceholder="Search inventory, members, orders…">
      <div className="dash-page">

        {/* Welcome header */}
        <div className="dash-welcome">
          <div className="dash-welcome-copy">
            <div className="dash-eyebrow">Command center</div>
            <h1 className="dash-title">
              Welcome back, <span className="dash-title-name">{displayName}</span>.
            </h1>
            <p className="dash-sub">Your dashboard, your way — arrange portlets around how you play.</p>
          </div>
          <div className="dash-welcome-actions">
            {!editing && (
              <button className="btn btn-ghost btn-sm" onClick={startEdit}>
                <GridViewIcon /> Edit layout
              </button>
            )}
          </div>
        </div>

        {/* Edit layout banner */}
        {editing && (
          <div className="dash-edit-banner">
            <span className="dash-edit-banner-ico"><MoveDownIcon /></span>
            <div className="dash-edit-banner-text">
              <div className="dash-edit-banner-title">Customizing your dashboard</div>
              <div className="dash-edit-banner-sub">Drag any portlet by its handle to move it into a new position.</div>
            </div>
            <div className="dash-edit-banner-actions">
              <button className="btn-link" onClick={resetLayout}><RotateLeftIcon /> Reset</button>
              <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveEdit}><CheckIcon /> Save layout</button>
            </div>
          </div>
        )}

        {/* Portlet grid */}
        <div className={'dash-pgrid' + (editing ? ' editing' : '')}>
          {order.map((id) => {
            const def = PORTLET_DEFS.find((p) => p.id === id);
            if (!def) return null;
            return (
              <Portlet
                key={id}
                id={id}
                icon={def.icon}
                title={def.title}
                href={'href' in def ? (def as { href?: string }).href : undefined}
                size={sizes[id]}
                editing={editing}
                dragging={dragId === id}
                dropTarget={editing && overId === id && dragId !== id}
                dragProps={dragPropsFor(id)}
                onSizeChange={(s) => handleSizeChange(id, s)}
              >
                {renderPortletBody(id, sizes[id])}
              </Portlet>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
