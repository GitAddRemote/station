import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GroupsIcon from '@mui/icons-material/Groups';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkIcon from '@mui/icons-material/Link';
import AppShell from '../components/AppShell';
import { api } from '../services/api.service';
import { businessUnitsService, type BusinessUnitNode } from '../services/business-units.service';
import './HumanResources.css';

// ---- types -----------------------------------------------
interface MemberUser {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  discordId?: string | null;
}

interface MemberRow {
  userId: string;
  roleName: string;
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---- tree stats ----
function countUnits(nodes: BusinessUnitNode[]): number {
  let n = 0;
  const walk = (ns: BusinessUnitNode[]) => ns.forEach((nd) => { n++; walk(nd.children); });
  walk(nodes);
  return n;
}

function kindCount(nodes: BusinessUnitNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const walk = (ns: BusinessUnitNode[]) => ns.forEach((nd) => {
    counts[nd.kind] = (counts[nd.kind] ?? 0) + 1;
    walk(nd.children);
  });
  walk(nodes);
  return counts;
}

// ---- Mini tree for widget ----
function MiniTree({ nodes, depth = 0 }: { nodes: BusinessUnitNode[]; depth?: number }) {
  if (nodes.length === 0 || depth > 2) return null;
  return (
    <>
      {nodes.slice(0, depth === 0 ? 4 : 3).map((n) => (
        <div key={n.id} className="hr-tree-row" style={{ paddingLeft: depth * 16 }}>
          <span className={`hr-tree-dot hr-tree-dot-${n.kind}`} />
          <span className="hr-tree-name">{n.name}</span>
          <span className="hr-tree-kind">{n.kind}</span>
          {n.children.length > 0 && <MiniTree nodes={n.children} depth={depth + 1} />}
        </div>
      ))}
    </>
  );
}

// ---- Page ------------------------------------------------
export default function HumanResources() {
  const navigate = useNavigate();
  const [orgId, setOrgId]       = useState<string | null>(null);
  const [members, setMembers]   = useState<MemberRow[]>([]);
  const [units, setUnits]       = useState<BusinessUnitNode[]>([]);
  const [loadingM, setLoadingM] = useState(true);
  const [loadingU, setLoadingU] = useState(true);

  useEffect(() => {
    api.get('/users/profile').then((r) => {
      const uid = r.data.userId ?? r.data.id;
      return api.get<Array<{ organization: { id: string } }>>(`/user-organization-roles/user/${uid}/organizations`);
    }).then((r) => {
      setOrgId(r.data?.[0]?.organization?.id ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!orgId) return;

    setLoadingM(true);
    api.get<Array<{
      id: string; userId: string; assignedAt: string;
      user: MemberUser;
      role: { name: string };
    }>>(`/user-organization-roles/organization/${orgId}/members`)
      .then((r) => {
        const seen = new Map<string, MemberRow>();
        for (const m of r.data) {
          if (!seen.has(m.userId)) {
            seen.set(m.userId, { userId: m.userId, roleName: m.role?.name ?? '—', assignedAt: m.assignedAt, user: m.user });
          }
        }
        setMembers(Array.from(seen.values()));
      })
      .catch(() => {})
      .finally(() => setLoadingM(false));

    setLoadingU(true);
    businessUnitsService.getAll(orgId)
      .then(setUnits)
      .catch(() => {})
      .finally(() => setLoadingU(false));
  }, [orgId]);

  const totalUnits = countUnits(units);
  const kinds = kindCount(units);
  const recentMembers = [...members].sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()).slice(0, 6);

  return (
    <AppShell active="hr" searchPlaceholder="Search HR…">
      <div className="hr-page">

        {/* Page header */}
        <div className="hr-header">
          <div>
            <div className="hr-eyebrow">Operations</div>
            <h1 className="hr-title">Human Resources</h1>
            <p className="hr-sub">Manage your organization's roster and structure.</p>
          </div>
        </div>

        {/* Widget grid */}
        <div className="hr-grid">

          {/* ---- Members widget ---- */}
          <div className="hr-widget">
            <div className="hr-widget-head">
              <div className="hr-widget-icon"><GroupsIcon /></div>
              <div>
                <div className="hr-widget-title">Members</div>
                <div className="hr-widget-sub">
                  {loadingM ? '…' : members.length}
                </div>
              </div>
              <button className="hr-view-all" onClick={() => navigate('/hr/members')}>
                View all <ArrowForwardIcon style={{ width: 13, height: 13 }} />
              </button>
            </div>

            <div className="hr-widget-body">
              {loadingM ? (
                <div className="hr-loading">Loading…</div>
              ) : members.length === 0 ? (
                <div className="hr-empty">No members yet.</div>
              ) : (
                <div className="hr-member-list">
                  {recentMembers.map((m) => (
                    <div key={m.userId} className="hr-member-row" onClick={() => navigate('/hr/members')}>
                      <div className="hr-avatar">{initials(m.user)}</div>
                      <div className="hr-member-info">
                        <div className="hr-member-name">{displayName(m.user)}</div>
                        <div className="hr-member-meta">
                          <span className="hr-role-badge">{m.roleName}</span>
                          {m.user.discordId && <span className="hr-discord-dot"><LinkIcon style={{ width: 10, height: 10 }} /></span>}
                        </div>
                      </div>
                      <div className="hr-member-date">{fmtDate(m.assignedAt)}</div>
                    </div>
                  ))}
                  {members.length > 6 && (
                    <div className="hr-more" onClick={() => navigate('/hr/members')}>
                      +{members.length - 6} more — view all
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---- Business Units widget ---- */}
          <div className="hr-widget">
            <div className="hr-widget-head">
              <div className="hr-widget-icon"><AccountTreeIcon /></div>
              <div>
                <div className="hr-widget-title">Business Units</div>
                <div className="hr-widget-sub">
                  {loadingU ? '…' : totalUnits}
                </div>
              </div>
              <button className="hr-view-all" onClick={() => navigate('/hr/business-units')}>
                View all <ArrowForwardIcon style={{ width: 13, height: 13 }} />
              </button>
            </div>

            <div className="hr-widget-body">
              {/* Kind summary pills */}
              {!loadingU && totalUnits > 0 && (
                <div className="hr-kind-pills">
                  {Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([kind, count]) => (
                    <span key={kind} className={`hr-kind-pill hr-kind-${kind}`}>
                      {count} {kind}{count !== 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              )}

              {loadingU ? (
                <div className="hr-loading">Loading…</div>
              ) : units.length === 0 ? (
                <div className="hr-empty">No business units yet.</div>
              ) : (
                <div className="hr-tree-preview" onClick={() => navigate('/hr/business-units')}>
                  <MiniTree nodes={units} />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
