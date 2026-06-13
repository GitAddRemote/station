import { useState, useEffect, useCallback, useRef } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import AppShell from '../components/AppShell';
import { api } from '../services/api.service';
import { businessUnitsService, type BusinessUnitNode } from '../services/business-units.service';
import './Members.css';

// ---- types -----------------------------------------------
interface MemberUser {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  discordId?: string | null;
  discordAvatarUrl?: string | null;
  isActive: boolean;
  joinedAt?: string | null;
}

interface MemberRow {
  id: string;          // UOR id
  userId: string;
  roleId: string;
  roleName: string;
  businessUnitId: string | null;
  businessUnitName: string | null;
  assignedAt: string;
  user: MemberUser;
}

// ---- helpers ---------------------------------------------
function displayName(u: MemberUser): string {
  if (u.firstName || u.lastName) return [u.firstName, u.lastName].filter(Boolean).join(' ');
  return u.username;
}

function initials(u: MemberUser): string {
  if (u.firstName) return u.firstName[0].toUpperCase();
  return u.username[0].toUpperCase();
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- flatten business unit tree --------------------------
function flattenUnits(nodes: BusinessUnitNode[], depth = 0): Array<{ id: string; label: string; kind: string }> {
  const out: Array<{ id: string; label: string; kind: string }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: `${'  '.repeat(depth)}${n.name}`, kind: n.kind });
    out.push(...flattenUnits(n.children, depth + 1));
  }
  return out;
}

// ---- Member drawer ---------------------------------------
interface DrawerProps {
  member: MemberRow;
  orgId: string;
  units: BusinessUnitNode[];
  onClose: () => void;
  onRemoved: () => void;
  onUnitChanged: () => void;
}

function MemberDrawer({ member, orgId, units, onClose, onRemoved, onUnitChanged }: DrawerProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving]           = useState(false);
  const [savingUnit, setSavingUnit]       = useState(false);
  const [selectedUnit, setSelectedUnit]   = useState<string>(member.businessUnitId ?? '');
  const flatUnits = flattenUnits(units);

  const handleUnitChange = async (unitId: string) => {
    setSelectedUnit(unitId);
    setSavingUnit(true);
    try {
      await api.patch(`/user-organization-roles/organization/${orgId}/members/${member.userId}/business-unit`, {
        businessUnitId: unitId || null,
      });
      onUnitChanged();
    } catch {
      setSelectedUnit(member.businessUnitId ?? '');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/user-organization-roles/organization/${orgId}/members/${member.userId}`);
      onRemoved();
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  const u = member.user;

  return (
    <div className="mem-drawer open">
      <div className="mem-drawer-inner">
        {/* Header */}
        <div className="mem-drawer-head">
          <div className="mem-avatar-lg">{initials(u)}</div>
          <div className="mem-drawer-name-wrap">
            <div className="mem-drawer-name">{displayName(u)}</div>
            <div className="mem-drawer-username">@{u.username}</div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <div className="mem-drawer-body">
          {/* Basic info */}
          <div className="mem-section">
            <div className="mem-section-cap">Profile</div>
            <div className="mem-kv"><span className="mem-k">Email</span><span className="mem-v">{u.email}</span></div>
            <div className="mem-kv"><span className="mem-k">Role</span><span className="mem-v">{member.roleName}</span></div>
            <div className="mem-kv"><span className="mem-k">Joined org</span><span className="mem-v">{fmtDate(member.assignedAt)}</span></div>
            {u.discordId && (
              <div className="mem-kv">
                <span className="mem-k"><LinkIcon style={{ width: 12, height: 12 }} /> Discord</span>
                <span className="mem-v mem-discord">{u.discordId}</span>
              </div>
            )}
            <div className="mem-kv">
              <span className="mem-k">Account status</span>
              <span className={`chip chip-${u.isActive ? 'success' : 'neutral'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>

          {/* Business unit assignment */}
          <div className="mem-section">
            <div className="mem-section-cap"><AccountTreeIcon style={{ width: 12, height: 12 }} /> Business Unit</div>
            <select
              className="field-input"
              value={selectedUnit}
              onChange={(e) => handleUnitChange(e.target.value)}
              disabled={savingUnit}
            >
              <option value="">— Unassigned —</option>
              {flatUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
            {savingUnit && <p className="mem-saving">Saving…</p>}
          </div>

          {/* Remove from org */}
          <div className="mem-section mem-section-danger">
            <div className="mem-section-cap">Danger zone</div>
            {!confirmRemove ? (
              <button className="btn-danger-outline" onClick={() => setConfirmRemove(true)}>
                <DeleteOutlineIcon style={{ width: 15, height: 15 }} /> Remove from organization
              </button>
            ) : (
              <div className="mem-confirm">
                <p className="mem-confirm-msg">
                  Remove <strong>{displayName(u)}</strong> from this organization?
                  Their account is not deleted — only their membership and roles are removed.
                </p>
                <div className="mem-confirm-btns">
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(false)}>Keep them</button>
                  <button className="btn-danger btn-sm" onClick={handleRemove} disabled={removing}>
                    {removing ? 'Removing…' : 'Yes, remove'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Page ------------------------------------------------
export default function Members() {
  const [orgId, setOrgId]           = useState<string | null>(null);
  const [members, setMembers]       = useState<MemberRow[]>([]);
  const [units, setUnits]           = useState<BusinessUnitNode[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selId, setSelId]           = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // load org id
  useEffect(() => {
    api.get('/users/profile').then((r) => {
      const uid = r.data.userId ?? r.data.id;
      return api.get<Array<{ organization: { id: string } }>>(`/user-organization-roles/user/${uid}/organizations`);
    }).then((r) => {
      setOrgId(r.data?.[0]?.organization?.id ?? null);
    }).catch(() => {});
  }, []);

  const fetchMembers = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    api.get<Array<{
      id: string;
      userId: string;
      roleId: string;
      assignedAt: string;
      businessUnitId: string | null;
      user: MemberUser;
      role: { id: string; name: string };
      businessUnit: { id: string; name: string } | null;
    }>>(`/user-organization-roles/organization/${orgId}/members`)
      .then((r) => {
        const rows: MemberRow[] = r.data.map((m) => ({
          id: m.id,
          userId: m.userId,
          roleId: m.roleId,
          roleName: m.role?.name ?? '—',
          businessUnitId: m.businessUnitId,
          businessUnitName: m.businessUnit?.name ?? null,
          assignedAt: m.assignedAt,
          user: m.user,
        }));
        // Deduplicate by userId — show one row per user (primary/first role)
        const seen = new Map<string, MemberRow>();
        for (const row of rows) {
          if (!seen.has(row.userId)) seen.set(row.userId, row);
        }
        setMembers(Array.from(seen.values()));
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  useEffect(() => {
    if (orgId) businessUnitsService.getAll(orgId).then(setUnits).catch(() => {});
  }, [orgId]);

  // close drawer on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // close drawer if selected member was removed
  const handleRowClick = (id: string) => {
    if (selId === id && drawerOpen) { setDrawerOpen(false); return; }
    setSelId(id);
    setDrawerOpen(true);
  };

  const roles = Array.from(new Set(members.map((m) => m.roleName))).sort();

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.user.username.toLowerCase().includes(q) ||
      (m.user.firstName ?? '').toLowerCase().includes(q) ||
      (m.user.lastName ?? '').toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || m.roleName === roleFilter;
    return matchSearch && matchRole;
  });

  const sel = members.find((m) => m.userId === selId) ?? null;

  return (
    <AppShell active="members" searchPlaceholder="Search members…">
      <div className="mem-layout">
        {/* Main panel */}
        <div className={'mem-main' + (drawerOpen ? ' drawer-open' : '')}>
          {/* Page header */}
          <div className="mem-page-header">
            <div>
              <h1 className="mem-title">Members</h1>
              <p className="mem-sub">{loading ? '…' : `${filtered.length} member${filtered.length !== 1 ? 's' : ''}`}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mem-filters">
            <label className="mem-search-wrap">
              <SearchIcon style={{ width: 15, height: 15 }} />
              <input
                ref={searchRef}
                className="mem-search"
                type="search"
                placeholder="Search name, username, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              className="field-input mem-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="mem-empty">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="mem-empty">
              <GroupsIcon style={{ width: 40, height: 40, opacity: 0.3 }} />
              <p>{search || roleFilter ? 'No members match your filters.' : 'No members yet.'}</p>
            </div>
          ) : (
            <div className="mem-table-wrap">
              <table className="mem-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Business unit</th>
                    <th>Joined</th>
                    <th>Discord</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.userId}
                      className={'mem-row' + (m.userId === selId && drawerOpen ? ' selected' : '')}
                      onClick={() => handleRowClick(m.userId)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleRowClick(m.userId)}
                    >
                      <td>
                        <div className="mem-cell-user">
                          <div className="mem-avatar">{initials(m.user)}</div>
                          <div>
                            <div className="mem-name">{displayName(m.user)}</div>
                            <div className="mem-username">@{m.user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="mem-role-badge">{m.roleName}</span></td>
                      <td className="mem-cell-unit">{m.businessUnitName ?? <span className="mem-unassigned">—</span>}</td>
                      <td className="mem-cell-date">{fmtDate(m.assignedAt)}</td>
                      <td className="mem-cell-discord">
                        {m.user.discordId
                          ? <span className="mem-discord-tag"><LinkIcon style={{ width: 12, height: 12 }} /> Linked</span>
                          : <span className="mem-no-discord">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drawer */}
        {drawerOpen && sel && orgId && (
          <MemberDrawer
            member={sel}
            orgId={orgId}
            units={units}
            onClose={() => setDrawerOpen(false)}
            onRemoved={fetchMembers}
            onUnitChanged={fetchMembers}
          />
        )}
        {drawerOpen && <div className="mem-backdrop" onClick={() => setDrawerOpen(false)} />}
      </div>
    </AppShell>
  );
}
