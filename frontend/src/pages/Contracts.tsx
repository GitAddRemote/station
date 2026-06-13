import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

function ContractDetail({ contract, onAction }: { contract: Contract; onAction: (action: string) => void }) {
  const ty = TYPE_META[contract.type] ?? TYPE_META.transport;
  const st = STATUS_META[contract.status] ?? STATUS_META.draft;
  const risk = contract.risk ? RISK_META[contract.risk] : null;
  const deadline = fmtDeadline(contract.deadline);
  const milestones = [...(contract.milestones ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="panel con-detail">
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
        {contract.status === 'open' && (
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
        <button className="btn btn-ghost btn-sm" onClick={() => onAction('cancel')} aria-label="Cancel contract">
          ···
        </button>
      </div>
    </div>
  );
}

const Contracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selId, setSelId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [showCreate, setShowCreate] = useState(false);

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
    if (!selId && visible.length > 0) setSelId(visible[0].id);
    if (selId && visible.length > 0 && !visible.find((c) => c.id === selId)) {
      setSelId(visible[0].id);
    }
  }, [visible, selId]);

  const sel = visible.find((c) => c.id === selId) ?? null;

  const open = contracts.filter((c) => c.status === 'open').length;
  const active = contracts.filter((c) => c.status === 'active' || c.status === 'claimed').length;
  const pool = contracts
    .filter((c) => ['open', 'active', 'claimed'].includes(c.status))
    .reduce((s, c) => s + parseFloat(c.rewardAuec ?? '0'), 0);
  const done = contracts.filter((c) => c.status === 'completed').length;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!visible.length) return;
    const idx = visible.findIndex((c) => c.id === selId);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = visible[Math.min(visible.length - 1, idx + 1)];
      setSelId(next.id);
      rowRefs.current[next.id]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = visible[Math.max(0, idx - 1)];
      setSelId(prev.id);
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
        <div className="con-split">
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
                  <th>Status</th>
                  <th>Deadline</th>
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
                      aria-selected={c.id === selId}
                      className={c.id === selId ? 'selected' : ''}
                      onClick={() => setSelId(c.id)}
                      onFocus={() => setSelId(c.id)}
                    >
                      <td>
                        <div className="t-ent">
                          <span className={`ic ${ty.cls}`}>{ty.icon}</span>
                          <div>
                            <div className="nm">{c.title}</div>
                            <div className="sub">{ty.label}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`chip-badge ${st.chip}`}>{st.label}</span></td>
                      <td>
                        <span className={`deadline${dl.urgent ? ' urgent' : ''}`}>
                          {dl.text !== '—' && <AccessTimeIcon style={{ width: 12, height: 12 }} />}
                          {dl.text}
                        </span>
                      </td>
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
          {sel && <ContractDetail contract={sel} onAction={handleAction} />}
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
