import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import CreateContractModal from '../components/contracts/CreateContractModal';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SecurityIcon from '@mui/icons-material/Security';
import DiamondIcon from '@mui/icons-material/Diamond';
import RecyclingIcon from '@mui/icons-material/Recycling';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import ArticleIcon from '@mui/icons-material/Article';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CircleDotIcon from '@mui/icons-material/FiberManualRecord';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BusinessIcon from '@mui/icons-material/Business';
import PlusIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ScrollTextIcon from '@mui/icons-material/Article';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CoinsIcon from '@mui/icons-material/MonetizationOn';
import AppShell from '../components/AppShell';
import { api } from '../services/api.service';
import './Contracts.css';

type ContractStatus = 'draft' | 'open' | 'claimed' | 'active' | 'completed' | 'disputed' | 'cancelled';
type ContractType = 'transport' | 'transfer' | 'mining' | 'security' | 'salvage' | 'medical' | 'refueling';
type ContractRisk = 'low' | 'medium' | 'high';

interface ContractMilestone {
  id: string;
  title: string;
  state: 'pending' | 'in_progress' | 'completed';
  sortOrder: number;
}

interface ContractParty {
  id: string;
  userId: string;
  role: string;
  user?: { id: string; username: string; firstName?: string; lastName?: string } | null;
}

interface Contract {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  risk: ContractRisk | null;
  rewardAuec: string | null;
  deadline: string | null;
  description: string | null;
  orgId: string;
  creatorId: string;
  deliveryLocationId: string | null;
  details: Record<string, unknown> | null;
  milestones: ContractMilestone[];
  parties: ContractParty[];
  createdAt: string;
  updatedAt: string;
}

interface PaginatedContracts {
  data: Contract[];
  total: number;
  page: number;
  limit: number;
}

const TYPE_META: Record<ContractType, { label: string; cls: string; icon: React.ReactNode }> = {
  transport:  { label: 'Transport',  cls: 'ct-transport',  icon: <LocalShippingIcon /> },
  transfer:   { label: 'Transfer',   cls: 'ct-transfer',   icon: <ArticleIcon /> },
  mining:     { label: 'Mining',     cls: 'ct-mining',     icon: <DiamondIcon /> },
  security:   { label: 'Security',   cls: 'ct-security',   icon: <SecurityIcon /> },
  salvage:    { label: 'Salvage',    cls: 'ct-salvage',    icon: <RecyclingIcon /> },
  medical:    { label: 'Medical',    cls: 'ct-medical',    icon: <MedicalServicesIcon /> },
  refueling:  { label: 'Refueling',  cls: 'ct-refueling',  icon: <LocalGasStationIcon /> },
};

const STATUS_META: Record<ContractStatus, { label: string; chip: string }> = {
  draft:     { label: 'Draft',     chip: 'neutral' },
  open:      { label: 'Open',      chip: 'brand' },
  claimed:   { label: 'Claimed',   chip: 'neutral' },
  active:    { label: 'In progress', chip: 'warm' },
  completed: { label: 'Completed', chip: 'success' },
  disputed:  { label: 'Disputed',  chip: 'warm' },
  cancelled: { label: 'Cancelled', chip: 'neutral' },
};

const RISK_META: Record<ContractRisk, { label: string; cls: string }> = {
  low:    { label: 'Low',    cls: 'risk-low' },
  medium: { label: 'Medium', cls: 'risk-med' },
  high:   { label: 'High',   cls: 'risk-high' },
};

const TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'transport', label: 'Transport' },
  { value: 'security',  label: 'Security' },
  { value: 'mining',    label: 'Mining' },
  { value: 'salvage',   label: 'Salvage' },
  { value: 'transfer',  label: 'Transfer' },
  { value: 'medical',   label: 'Medical' },
  { value: 'refueling', label: 'Refueling' },
];

function partyName(parties: ContractParty[], role: string): string {
  const p = parties?.find((x) => x.role === role);
  if (!p?.user) return '—';
  return p.user.firstName || p.user.username || '—';
}

function fmtAuec(val: string | null): string {
  if (!val) return '—';
  const n = parseFloat(val);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return Math.round(n).toLocaleString();
}

function fmtDeadline(deadline: string | null): { text: string; urgent: boolean } {
  if (!deadline) return { text: '—', urgent: false };
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return { text: 'Overdue', urgent: true };
  const h = Math.floor(diff / 3_600_000);
  if (h < 6) return { text: `${h}h left`, urgent: true };
  if (h < 24) return { text: `${h}h left`, urgent: false };
  return { text: `${Math.floor(h / 24)}d left`, urgent: false };
}

function MilestoneIcon({ state }: { state: ContractMilestone['state'] }) {
  if (state === 'completed') return <CheckCircleIcon style={{ width: 14, height: 14 }} />;
  if (state === 'in_progress') return <PlayArrowIcon style={{ width: 14, height: 14 }} />;
  return <RadioButtonUncheckedIcon style={{ width: 14, height: 14 }} />;
}

const DETAILS_LABELS: Record<string, string> = {
  pickupLocationName:  'Pickup location',
  deliveryLocationName: 'Delivery location',
  cargoDescription:    'Cargo',
  scuRequired:         'SCU required',
  targetSystem:        'Target system',
  targetBody:          'Target body',
  resourceType:        'Resource type',
  targetScu:           'Target SCU',
  miningMethod:        'Mining method',
  missionKind:         'Mission kind',
  areaDescription:     'Area',
  threatLevel:         'Threat level',
  headCount:           'Head count',
  targetLocation:      'Target location',
  scuEstimate:         'SCU estimate',
  salvageKind:         'Salvage kind',
  serviceKind:         'Service kind',
  locationDescription: 'Location',
  patientCount:        'Patients',
  fuelType:            'Fuel type',
};

const DETAILS_ENUM_LABELS: Record<string, Record<string, string>> = {
  miningMethod:  { hand: 'Hand mining', vehicle: 'Vehicle', ship: 'Ship' },
  missionKind:   { escort: 'Escort', patrol: 'Patrol', 'base-defense': 'Base defense' },
  threatLevel:   { low: 'Low', medium: 'Medium', high: 'High' },
  salvageKind:   { wreck: 'Wreck salvage', recycle: 'Recycle', tow: 'Tow' },
  serviceKind:   { rescue: 'Rescue', trauma: 'Trauma', support: 'Support' },
  fuelType:      { hydrogen: 'Hydrogen', quantum: 'Quantum' },
};

function TypeDetailsSection({ details }: { details: Record<string, unknown> | null }) {
  if (!details) return null;
  const rows = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (rows.length === 0) return null;
  return (
    <div className="detail-section">
      <div className="ds-cap">Details</div>
      {rows.map(([key, val]) => {
        const label = DETAILS_LABELS[key] ?? key;
        const enumMap = DETAILS_ENUM_LABELS[key];
        const display = enumMap ? (enumMap[String(val)] ?? String(val)) : String(val);
        return (
          <div key={key} className="kv">
            <span className="k">{label}</span>
            <span className="v">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

function ContractDetail({ contract, onAction, onClose, currentUserId }: { contract: Contract; onAction: (action: string) => void; onClose: () => void; currentUserId: string | null }) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const ty = TYPE_META[contract.type] ?? TYPE_META.transport;
  const st = STATUS_META[contract.status] ?? STATUS_META.draft;
  const risk = contract.risk ? RISK_META[contract.risk] : null;
  const deadline = fmtDeadline(contract.deadline);
  const milestones = [...(contract.milestones ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const isTerminal = contract.status === 'completed' || contract.status === 'cancelled';
  const isOwnContract = currentUserId !== null && contract.creatorId === currentUserId;

  return (
    <div className="panel con-detail">
      <div className="con-detail-head">
        <button className="con-detail-close" onClick={onClose} aria-label="Close">
          <CloseIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>
      <div className="panel-body">
        <div className="con-hero">
          <span className={`big-ic ${ty.cls}`}>{ty.icon}</span>
          <div className="h">
            <div className="t">{contract.title}</div>
            <div className="s">
              <span>{ty.label}</span>
            </div>
          </div>
          <span className={`chip-badge ${st.chip}`}>{st.label}</span>
        </div>

        <div className="reward-hero">
          <div>
            <div className="rk">Contract reward</div>
            <div className="rv">{fmtAuec(contract.rewardAuec)}<small>aUEC</small></div>
          </div>
          {risk && (
            <div className="risk-block">
              <div className="rk">Risk</div>
              <span className={`risk-badge ${risk.cls}`}>{risk.label}</span>
            </div>
          )}
        </div>
      </div>

      {contract.description && (
        <div className="detail-section">
          <div className="ds-cap">Brief</div>
          <p className="con-desc">{contract.description}</p>
        </div>
      )}

      <div className="detail-section">
        <div className="ds-cap">Terms</div>
        <div className="kv">
          <span className="k"><AccessTimeIcon style={{ width: 13, height: 13 }} /> Deadline</span>
          <span className={`v${deadline.urgent ? ' con-urgent' : ''}`}>
            {deadline.text === '—' ? 'None set' : deadline.text}
          </span>
        </div>
        <div className="kv">
          <span className="k"><BusinessIcon style={{ width: 13, height: 13 }} /> Parties</span>
          <span className="v">{contract.parties?.length ?? 0} assigned</span>
        </div>
      </div>

      <TypeDetailsSection details={contract.details} />

      {milestones.length > 0 && (
        <div className="detail-section">
          <div className="ds-cap">Progress</div>
          <div className="miles">
            {milestones.map((m) => (
              <div key={m.id} className={`mile ${m.state}`}>
                <span className="mk"><MilestoneIcon state={m.state} /></span>
                <span className="ml">{m.title}</span>
                {m.state === 'in_progress' && <span className="mt">now</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel-body con-actions">
        {confirmingCancel ? (
          <div className="con-cancel-confirm">
            <span className="con-cancel-msg">Cancel this contract? This cannot be undone.</span>
            <div className="con-cancel-btns">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingCancel(false)}>Keep it</button>
              <button className="btn btn-danger btn-sm" onClick={() => { setConfirmingCancel(false); onAction('cancel'); }}>Yes, cancel</button>
            </div>
          </div>
        ) : (
          <>
            {contract.status === 'draft' && (
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onAction('publish')}>
                Publish
              </button>
            )}
            {contract.status === 'open' && !isOwnContract && (
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onAction('claim')}>
                Claim contract
              </button>
            )}
            {contract.status === 'claimed' && (
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onAction('start')}>
                Start contract
              </button>
            )}
            {contract.status === 'active' && (
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onAction('complete')}>
                Mark complete
              </button>
            )}
            {(contract.status === 'active' || contract.status === 'completed') && (
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => onAction('dispute')}>
                Dispute
              </button>
            )}
            {contract.status === 'disputed' && (
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                Resolve dispute
              </button>
            )}
            {!isTerminal && (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingCancel(true)} aria-label="Cancel contract">
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const Contracts = () => {
  const [searchParams] = useSearchParams();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(searchParams.get('contract'));
  const [drawerOpen, setDrawerOpen] = useState(!!searchParams.get('contract'));
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.get('/users/profile').then((res) => {
      setCurrentUserId(res.data.userId ?? res.data.id ?? null);
    }).catch(() => {});
  }, []);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 50, page: 1 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get<PaginatedContracts>('/api/contracts', { params });
      setContracts(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const visible = useMemo(() =>
    typeFilter === 'all' ? contracts : contracts.filter((c) => c.type === typeFilter),
    [contracts, typeFilter],
  );

  useEffect(() => {
    if (!selId && visible.length > 0) {
      setSelId(visible[0].id);
      return;
    }
    if (selId && !loading && contracts.length > 0 && !contracts.find((c) => c.id === selId)) {
      setSelId(visible[0]?.id ?? null);
    }
  }, [visible, selId, loading, contracts]);

  const sel = visible.find((c) => c.id === selId) ?? null;

  const open = contracts.filter((c) => c.status === 'open').length;
  const active = contracts.filter((c) => c.status === 'active' || c.status === 'claimed').length;
  const pool = contracts
    .filter((c) => ['open', 'active', 'claimed'].includes(c.status))
    .reduce((s, c) => s + parseFloat(c.rewardAuec ?? '0'), 0);
  const done = contracts.filter((c) => c.status === 'completed').length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleRowClick = useCallback((id: string) => {
    if (selId === id && drawerOpen) {
      setDrawerOpen(false);
    } else {
      setSelId(id);
      setDrawerOpen(true);
    }
  }, [selId, drawerOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!visible.length) return;
    const idx = visible.findIndex((c) => c.id === selId);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = visible[Math.min(visible.length - 1, idx + 1)];
      setSelId(next.id);
      setDrawerOpen(true);
      rowRefs.current[next.id]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = visible[Math.max(0, idx - 1)];
      setSelId(prev.id);
      setDrawerOpen(true);
      rowRefs.current[prev.id]?.focus();
    }
  }, [visible, selId]);

  const handleAction = useCallback(async (action: string) => {
    if (!sel) return;
    try {
      await api.post(`/api/contracts/${sel.id}/${action}`);
      fetchContracts();
    } catch { /* handled */ }
  }, [sel, fetchContracts]);

  return (
    <AppShell active="contracts" searchPlaceholder="Search contracts…">
      <div className="page-head">
        <div>
          <div className="crumb">
            <ScrollTextIcon style={{ width: 13, height: 13 }} />
            Operations
            <ChevronRightIcon style={{ width: 13, height: 13 }} />
            Contracts
          </div>
          <h1 className="page-title">Contracts</h1>
          <p className="page-sub">Service contracts across every discipline — transport, security, mining, and salvage.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <PlusIcon style={{ width: 16, height: 16 }} /> New contract
          </button>
        </div>
      </div>

      <div className="statstrip" style={{ '--n': 4 } as React.CSSProperties}>
        <div className="statcard">
          <div className="k"><CircleDotIcon style={{ width: 13, height: 13 }} /> Open contracts</div>
          <div className="v">{open}</div>
          <div className="d">available to claim</div>
        </div>
        <div className="statcard">
          <div className="k"><PlayArrowIcon style={{ width: 13, height: 13 }} /> In progress</div>
          <div className="v">{active}</div>
          <div className="d">claimed or active</div>
        </div>
        <div className="statcard">
          <div className="k"><CoinsIcon style={{ width: 13, height: 13 }} /> Reward pool</div>
          <div className="v">{fmtAuec(pool > 0 ? String(pool) : null)} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-faint)', fontWeight: 400 }}>aUEC</span></div>
          <div className="d">active contract value</div>
        </div>
        <div className="statcard">
          <div className="k"><CheckCircleIcon style={{ width: 13, height: 13 }} /> Completed</div>
          <div className="v">{done}</div>
          <div className="d">this cycle</div>
        </div>
      </div>

      <div className="con-toolbar">
        <div className="seg-group" role="group" aria-label="Filter by type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`seg-btn${typeFilter === f.value ? ' active' : ''}`}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
              {f.value === 'all' && <span className="seg-count">{total}</span>}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <select
          className="con-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_META) as ContractStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="con-empty"><p>Loading…</p></div>
      ) : visible.length === 0 ? (
        <div className="con-empty">
          <ArticleIcon style={{ width: 40, height: 40, opacity: 0.25 }} />
          <p>No contracts yet.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <PlusIcon style={{ width: 16, height: 16 }} /> New contract
          </button>
        </div>
      ) : (
        <div className="con-layout">
          <div className="dtable-wrap">
            <table
              className="dtable"
              role="grid"
              aria-label="Contracts"
              onKeyDown={handleKeyDown}
            >
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Claimed By</th>
                  <th>Owned By</th>
                  <th className="num">Reward</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const ty = TYPE_META[c.type] ?? TYPE_META.transport;
                  const st = STATUS_META[c.status] ?? STATUS_META.draft;
                  const dl = fmtDeadline(c.deadline);
                  return (
                    <tr
                      key={c.id}
                      ref={(el) => { rowRefs.current[c.id] = el; }}
                      tabIndex={0}
                      aria-selected={c.id === selId && drawerOpen}
                      className={c.id === selId && drawerOpen ? 'selected' : ''}
                      onClick={() => handleRowClick(c.id)}
                      onFocus={() => { setSelId(c.id); setDrawerOpen(true); }}
                    >
                      <td>
                        <div className="t-ent">
                          <span className={`ic ${ty.cls}`}>{ty.icon}</span>
                          <div>
                            <div className="nm">{c.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="cell-muted">{ty.label}</td>
                      <td><span className={`chip-badge ${st.chip}`}>{st.label}</span></td>
                      <td>
                        <span className={`deadline${dl.urgent ? ' urgent' : ''}`}>
                          {dl.text !== '—' && <AccessTimeIcon style={{ width: 12, height: 12 }} />}
                          {dl.text}
                        </span>
                      </td>
                      <td className="cell-muted">{partyName(c.parties, 'assignee')}</td>
                      <td className="cell-muted">{partyName(c.parties, 'creator')}</td>
                      <td className="num">
                        <span className="reward">{fmtAuec(c.rewardAuec)} <small>aUEC</small></span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="list-hint">
              <span className="hint-keys"><kbd>↑</kbd><kbd>↓</kbd></span> move
              <span style={{ marginLeft: 'auto' }}>{visible.length} of {total} contracts</span>
            </div>
          </div>

          {/* slide-in detail drawer */}
          <div className={`con-drawer${drawerOpen ? ' open' : ''}`} aria-hidden={!drawerOpen}>
            {sel && <ContractDetail contract={sel} onAction={handleAction} onClose={() => setDrawerOpen(false)} currentUserId={currentUserId} />}
          </div>
          {drawerOpen && <div className="con-drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
        </div>
      )}

      {showCreate && (
        <CreateContractModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchContracts}
        />
      )}
    </AppShell>
  );
};

export default Contracts;
