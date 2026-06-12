import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import AppShell from '../components/AppShell';
import ArticleIcon from '@mui/icons-material/Article';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LoopIcon from '@mui/icons-material/Loop';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ViewListIcon from '@mui/icons-material/ViewList';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SecurityIcon from '@mui/icons-material/Security';
import DiamondIcon from '@mui/icons-material/Diamond';
import RecyclingIcon from '@mui/icons-material/Recycling';
import { ContractRow } from '../components/contracts/ContractRow';
import { ContractDetail } from '../components/contracts/ContractDetail';
import { CONTRACT_TYPE_META, fmtAbbr } from '../components/contracts/contractMeta';
import NewContractDialog, { type NewContractDialogPrefill } from '../components/contracts/NewContractDialog';
import AssignCrewDialog from '../components/contracts/AssignCrewDialog';
import type { Contract, ContractType } from '../services/contracts.service';
import { contractsService } from '../services/contracts.service';
import { api } from '../services/api.service';
import './Contracts.css';

// ---- local mock data (used until real API is wired in #381) ---
const MOCK_CONTRACTS: Contract[] = [
  {
    id: '1', displayId: 'CT-512', type: 'transport', title: 'Titanium haul — Hurston to ArcCorp',
    clientName: 'Hurston Dynamics', clientType: 'NPC contract',
    reward: 285000, status: 'active', risk: 'med',
    deadline: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    orgId: 'org1', createdByUserId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    description: 'Bulk Titanium delivery on the Hurston→ArcCorp lane. Watch the Stanton pirate corridor near the jump.',
    details: { commodity: 'Titanium', scu: 768, origin: 'HDMS-Edmond', originSub: 'Hurston', dest: 'Area18', destSub: 'ArcCorp' },
    milestones: [
      { id: 'm1', contractId: '1', label: 'Cargo loaded at HDMS-Edmond', state: 'done', sortOrder: 1 },
      { id: 'm2', contractId: '1', label: 'In transit — Stanton lane', state: 'active', sortOrder: 2 },
      { id: 'm3', contractId: '1', label: 'Delivery to Area18 TDD', state: 'pending', sortOrder: 3 },
    ],
    parties: [{ id: 'p1', contractId: '1', userId: 'u2', username: 'Iris Tanaka', role: 'pilot' }],
  },
  {
    id: '2', displayId: 'CT-509', type: 'security', title: 'Escort mining op — Aaron Halo',
    clientName: 'Atlas Vanguard', clientType: 'Internal op',
    reward: 180000, status: 'active', risk: 'high',
    deadline: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    orgId: 'org1', createdByUserId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    description: 'Provide armed escort for the Day-3 mining session. Two fighters on overwatch.',
    details: { objective: 'Escort & Defend', threat: 'Pirate interdiction', location: 'Aaron Halo · Cluster 7', duration: '4h window' },
    milestones: [
      { id: 'm4', contractId: '2', label: 'Wing assembled at ARC-L1', state: 'done', sortOrder: 1 },
      { id: 'm5', contractId: '2', label: 'Overwatch established', state: 'active', sortOrder: 2 },
      { id: 'm6', contractId: '2', label: 'Session complete — RTB', state: 'pending', sortOrder: 3 },
    ],
    parties: [
      { id: 'p2', contractId: '2', userId: 'u3', username: 'Dax Moreno', role: 'pilot' },
      { id: 'p3', contractId: '2', userId: 'u4', username: 'Talia Vance', role: 'gunner' },
    ],
  },
  {
    id: '3', displayId: 'CT-507', type: 'mining', title: 'Quantanium quota — refinery contract',
    clientName: 'Refinery Consortium', clientType: 'Org contract',
    reward: 520000, status: 'open', risk: 'med', deadline: null,
    orgId: 'org1', createdByUserId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    description: 'Deliver 150 SCU of refined Quantanium. Volatile cargo — refine promptly.',
    details: { commodity: 'Quantanium', quota: 150, location: 'Aaron Halo', refinery: 'ARC-L1' },
    milestones: [
      { id: 'm7', contractId: '3', label: 'Accept contract', state: 'pending', sortOrder: 1 },
      { id: 'm8', contractId: '3', label: 'Mine & refine 150 SCU', state: 'pending', sortOrder: 2 },
      { id: 'm9', contractId: '3', label: 'Deliver to consortium', state: 'pending', sortOrder: 3 },
    ],
    parties: [],
  },
  {
    id: '4', displayId: 'CT-503', type: 'salvage', title: 'Wreck reclamation — Yela Belt',
    clientName: 'Drake Interplanetary', clientType: 'NPC contract',
    reward: 240000, status: 'claimed', risk: 'low', deadline: null,
    orgId: 'org1', createdByUserId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    description: 'Strip and reclaim the marked hulls. RMC to CRU-L1.',
    details: { site: 'Yela Belt · Wreck Field 22', target: 'RMC + CMAT', targetScu: 180, location: 'Crusader · Yela' },
    milestones: [
      { id: 'm10', contractId: '4', label: 'Claim contract', state: 'done', sortOrder: 1 },
      { id: 'm11', contractId: '4', label: 'Reclaim 180 SCU', state: 'active', sortOrder: 2 },
      { id: 'm12', contractId: '4', label: 'Sell RMC at CRU-L1', state: 'pending', sortOrder: 3 },
    ],
    parties: [{ id: 'p4', contractId: '4', userId: 'u5', username: 'Kova Rhys', role: 'pilot' }],
  },
  {
    id: '5', displayId: 'CT-498', type: 'transport', title: 'Medical supply run — microTech',
    clientName: 'microTech', clientType: 'NPC contract',
    reward: 96000, status: 'open', risk: 'low', deadline: null,
    orgId: 'org1', createdByUserId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    description: 'Quick low-risk medical resupply to Port Tressler.',
    details: { commodity: 'Medical Supplies', scu: 120, origin: 'New Babbage', originSub: 'microTech', dest: 'Port Tressler', destSub: 'microTech orbit' },
    milestones: [
      { id: 'm13', contractId: '5', label: 'Load at New Babbage', state: 'pending', sortOrder: 1 },
      { id: 'm14', contractId: '5', label: 'Deliver to Port Tressler', state: 'pending', sortOrder: 2 },
    ],
    parties: [],
  },
  {
    id: '6', displayId: 'CT-489', type: 'mining', title: 'Laranite delivery — completed',
    clientName: 'ArcCorp Mining', clientType: 'NPC contract',
    reward: 134000, status: 'completed', risk: 'low', deadline: null,
    orgId: 'org1', createdByUserId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    description: 'Closed out last cycle. Paid in full.',
    details: { commodity: 'Laranite', quota: 60, location: 'Lyria', refinery: 'ARC-L1' },
    milestones: [
      { id: 'm15', contractId: '6', label: 'Accepted', state: 'done', sortOrder: 1 },
      { id: 'm16', contractId: '6', label: 'Refined 60 SCU', state: 'done', sortOrder: 2 },
      { id: 'm17', contractId: '6', label: 'Delivered & paid', state: 'done', sortOrder: 3 },
    ],
    parties: [{ id: 'p5', contractId: '6', userId: 'u6', username: 'Vesper Calderon', role: 'pilot' }],
  },
  {
    id: '7', displayId: 'CT-486', type: 'transport', title: 'Agricium freight — disputed',
    clientName: 'Shubin Interstellar', clientType: 'NPC contract',
    reward: 210000, status: 'disputed', risk: 'med', deadline: null,
    orgId: 'org1', createdByUserId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    description: 'Delivery shortfall reported — 40 SCU unaccounted. Under review.',
    details: { commodity: 'Agricium', scu: 320, origin: 'ArcCorp', originSub: 'Stanton', dest: 'Lorville', destSub: 'Hurston' },
    milestones: [
      { id: 'm18', contractId: '7', label: 'Loaded', state: 'done', sortOrder: 1 },
      { id: 'm19', contractId: '7', label: 'Transit interrupted', state: 'done', sortOrder: 2 },
      { id: 'm20', contractId: '7', label: 'Delivery disputed', state: 'active', sortOrder: 3 },
    ],
    parties: [{ id: 'p6', contractId: '7', userId: 'u7', username: 'Orin Pell', role: 'pilot' }],
  },
];

// ---- type filter definition -----
interface FilterOption {
  value: string;
  label: string;
  Icon?: React.ComponentType<{ style?: React.CSSProperties }>;
}

const FILTERS: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'transport',  label: 'Hauling',  Icon: LocalShippingIcon },
  { value: 'security',  label: 'Security', Icon: SecurityIcon },
  { value: 'mining',    label: 'Mining',   Icon: DiamondIcon },
  { value: 'salvage',   label: 'Salvage',  Icon: RecyclingIcon },
];

// ---- ContractsPage ----
function ContractsPage() {
  const location = useLocation();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_CONTRACTS[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionWorking, setActionWorking] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: 'dispute' | 'cancel'; contractId: string } | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPrefill, setDialogPrefill] = useState<NewContractDialogPrefill | undefined>(undefined);
  const [assignCrewOpen, setAssignCrewOpen] = useState(false);
  const [assignCrewContractId, setAssignCrewContractId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState('');

  // Load user's org on mount
  useEffect(() => {
    api.get('/users/profile').then(res => {
      const userId: string = res.data.userId;
      // Use inventory service org endpoint to get first org
      return api.get(`/user-organization-roles/user/${userId}/organizations`);
    }).then(res => {
      const orgs = res.data as Array<{ organization?: { id: string } }>;
      if (orgs.length > 0) {
        setOrgId(orgs[0].organization?.id ?? '');
      }
    }).catch(() => {});
  }, []);

  const fetchContracts = useCallback(async (currentOrgId: string) => {
    if (!currentOrgId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await contractsService.getContracts({ orgId: currentOrgId, limit: 50, page: 1 });
      setContracts(result.data.length > 0 ? result.data : MOCK_CONTRACTS);
    } catch {
      // Fall back to mock data if API not yet available
      setContracts(MOCK_CONTRACTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts(orgId);
  }, [orgId, fetchContracts]);

  // Handle pre-fill from inventory screen (#382)
  useEffect(() => {
    const state = location.state as { newContract?: NewContractDialogPrefill } | null;
    if (state?.newContract) {
      setDialogPrefill(state.newContract);
      setDialogOpen(true);
      // Clear router state so Back+Forward doesn't re-trigger
      window.history.replaceState({}, '', location.pathname);
    }
  }, []); // intentionally run only once on mount

  // rowRefs for keyboard roving focus
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const visible = useMemo(() => {
    if (typeFilter === 'all') return contracts;
    return contracts.filter((c) => c.type === typeFilter);
  }, [typeFilter, contracts]);

  const selected = useMemo(
    () => visible.find((c) => c.id === selectedId) ?? visible[0] ?? null,
    [visible, selectedId],
  );

  // when type filter changes, reset selection to first visible
  useEffect(() => {
    if (visible.length > 0) {
      const stillVisible = visible.find((c) => c.id === selectedId);
      if (!stillVisible) {
        setSelectedId(visible[0].id);
      }
    }
  }, [typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // stat strip counts
  const openCount = contracts.filter((c) => c.status === 'open').length;
  const inProgressCount = contracts.filter(
    (c) => c.status === 'active' || c.status === 'claimed',
  ).length;
  const rewardPool = contracts.filter(
    (c) => c.status === 'open' || c.status === 'active' || c.status === 'claimed',
  ).reduce((s, c) => s + c.reward, 0);
  const completedCount = contracts.filter((c) => c.status === 'completed').length;

  // keyboard navigation on the table
  const handleTableKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableElement>) => {
      const idx = visible.findIndex((c) => c.id === selectedId);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(visible.length - 1, idx + 1);
        setSelectedId(visible[next].id);
        rowRefs.current[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(0, idx - 1);
        setSelectedId(visible[prev].id);
        rowRefs.current[prev]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSelectedId(visible[0].id);
        rowRefs.current[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        const last = visible.length - 1;
        setSelectedId(visible[last].id);
        rowRefs.current[last]?.focus();
      }
    },
    [visible, selectedId],
  );

  const handleNew = useCallback(() => {
    setDialogPrefill(undefined);
    setDialogOpen(true);
  }, []);

  // Global keyboard shortcut: n = new contract
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'n' && !dialogOpen && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        handleNew();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dialogOpen, handleNew]);

  const handleAction = useCallback(async (action: string, contractId: string) => {
    if (action === 'dispute' || action === 'cancel') {
      setConfirmAction({ action: action as 'dispute' | 'cancel', contractId });
      setConfirmReason('');
      return;
    }
    if (action === 'assign') {
      setAssignCrewContractId(contractId);
      setAssignCrewOpen(true);
      return;
    }
    try {
      setActionWorking(contractId);
      setActionError(null);
      let updated: Contract;
      switch (action) {
        case 'claim':    updated = await contractsService.claimContract(contractId); break;
        case 'start':    updated = await contractsService.startContract(contractId); break;
        case 'complete': updated = await contractsService.completeContract(contractId); break;
        case 'publish':  updated = await contractsService.publishContract(contractId); break;
        default: return;
      }
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionWorking(null);
    }
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    try {
      setActionWorking(confirmAction.contractId);
      setActionError(null);
      const updated = confirmAction.action === 'dispute'
        ? await contractsService.disputeContract(confirmAction.contractId)
        : await contractsService.cancelContract(confirmAction.contractId);
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
      setConfirmAction(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionWorking(null);
    }
  }, [confirmAction]);

  const handleMilestoneUpdate = useCallback(async (contractId: string, milestoneId: string, currentState: string) => {
    const nextState = currentState === 'pending' ? 'active' : currentState === 'active' ? 'done' : 'pending';
    try {
      await contractsService.updateMilestone(contractId, milestoneId, nextState);
      setContracts(prev => prev.map(c => {
        if (c.id !== contractId) return c;
        return { ...c, milestones: c.milestones.map(m => m.id === milestoneId ? { ...m, state: nextState as 'pending' | 'active' | 'done' } : m) };
      }));
    } catch {
      // silently ignore milestone update errors
    }
  }, []);

  // segment control keyboard
  const handleSegKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const options = FILTERS.map((f) => f.value);
      const idx = options.indexOf(typeFilter);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setTypeFilter(options[Math.min(options.length - 1, idx + 1)]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setTypeFilter(options[Math.max(0, idx - 1)]);
      }
    },
    [typeFilter],
  );

  return (
    <>
      {/* page header */}
      <div className="page-head">
        <div>
          <div className="crumb">
            <ArticleIcon style={{ width: 13, height: 13 }} />
            Operations
            <ChevronRightIcon style={{ width: 13, height: 13 }} />
            Contracts
          </div>
          <h1 className="page-title">Contracts</h1>
          <p className="page-sub">
            Service contracts across every discipline — hauling, security, mining, and salvage.
            Post, claim, crew up, and settle the reward.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm">
            <ViewListIcon style={{ width: 15, height: 15 }} />
            Board view
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleNew}>
            <AddIcon style={{ width: 15, height: 15 }} />
            New contract
            <span className="shell-kbd" style={{ marginLeft: 6 }}>
              <kbd>n</kbd>
            </span>
          </button>
        </div>
      </div>

      {/* stat strip */}
      <div className="statstrip" style={{ '--n': 4 } as React.CSSProperties}>
        <div className="statcard">
          <div className="k">
            <FiberManualRecordIcon />
            Open contracts
          </div>
          <div className="v">{openCount}</div>
          <div className="d">available to claim</div>
        </div>
        <div className="statcard warn">
          <div className="k">
            <LoopIcon />
            In progress
          </div>
          <div className="v">{inProgressCount}</div>
          <div className="d">claimed or active</div>
        </div>
        <div className="statcard up">
          <div className="k">
            <MonetizationOnIcon />
            Reward pool
          </div>
          <div className="v">
            {fmtAbbr(rewardPool)}
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-faint)', fontWeight: 'var(--weight-semibold)', marginLeft: 5 }}>
              aUEC
            </span>
          </div>
          <div className="d">active contract value</div>
        </div>
        <div className="statcard">
          <div className="k">
            <TaskAltIcon />
            Completed
          </div>
          <div className="v">{completedCount}</div>
          <div className="d">this cycle</div>
        </div>
      </div>

      {/* toolbar */}
      <div className="con-toolbar">
        {/* segmented type filter */}
        <div
          className="con-seg"
          role="tablist"
          aria-label="Filter contracts by type"
          onKeyDown={handleSegKeyDown}
        >
          {FILTERS.map((f) => {
            const ty = f.value !== 'all' ? CONTRACT_TYPE_META[f.value as ContractType] : null;
            const count = f.value === 'all'
              ? MOCK_CONTRACTS.length
              : MOCK_CONTRACTS.filter((c) => c.type === f.value).length;
            return (
              <button
                key={f.value}
                role="tab"
                aria-selected={typeFilter === f.value}
                onClick={() => setTypeFilter(f.value)}
              >
                {ty && <ty.Icon style={{ width: 15, height: 15 }} />}
                {f.label}
                <span className="seg-count">{count}</span>
              </button>
            );
          })}
        </div>
        <span className="grow" />
        <div className="chips">
          <button className="fchip">
            <FiberManualRecordIcon style={{ width: 14, height: 14 }} />
            Status: All
          </button>
        </div>
      </div>

      {/* split pane */}
      <div className="split">
        <div className="dtable-wrap">
          {error && <div className="con-error">{error}</div>}
          {loading ? (
            <div className="con-loading">Loading contracts…</div>
          ) : visible.length === 0 ? (
            <div className="con-empty">
              <div className="e-ic">
                <ArticleIcon />
              </div>
              <h3>No contracts</h3>
              <p>No contracts match the current filter.</p>
            </div>
          ) : (
            <>
              <table
                className="dtable"
                role="grid"
                aria-label="Contracts"
                onKeyDown={handleTableKeyDown}
              >
                <thead>
                  <tr>
                    <th>Contract</th>
                    <th>Client</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th className="num">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c, i) => (
                    <ContractRow
                      key={c.id}
                      contract={c}
                      selected={c.id === selected?.id}
                      tabIndex={c.id === selected?.id ? 0 : -1}
                      rowRef={(el) => { rowRefs.current[i] = el; }}
                      onSelect={() => setSelectedId(c.id)}
                    />
                  ))}
                </tbody>
              </table>
              <div className="list-hint">
                <span className="shell-kbd"><kbd>↑</kbd><kbd>↓</kbd></span>
                move
                <span className="shell-kbd"><kbd>↵</kbd></span>
                open
                <span className="shell-kbd"><kbd>n</kbd></span>
                new
                <span style={{ marginLeft: 'auto' }}>
                  {visible.length} of {contracts.length} contracts
                </span>
              </div>
            </>
          )}
        </div>

        {selected && (
          <ContractDetail
            contract={selected}
            onAction={handleAction}
            actionWorking={actionWorking === selected.id}
            onMilestoneUpdate={handleMilestoneUpdate}
          />
        )}
      </div>

      {/* Dispute / Cancel confirmation */}
      {confirmAction && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmAction(null)}
        >
          <div
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '24px', maxWidth: 420, width: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 8px' }}>
              {confirmAction.action === 'dispute' ? 'Dispute contract' : 'Cancel contract'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              {confirmAction.action === 'dispute'
                ? 'Provide a reason for disputing this contract. This will notify all parties.'
                : 'Cancelling cannot be undone. Provide a reason for your records.'}
            </p>
            <textarea
              value={confirmReason}
              onChange={e => setConfirmReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface-sunken)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-strong)', fontFamily: 'var(--font-body)', fontSize: 13, resize: 'vertical', outline: 'none' }}
            />
            {actionError && <p style={{ color: 'var(--coral-400)', fontSize: 12, margin: '8px 0 0' }}>{actionError}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-sm" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className={`btn btn-sm ${confirmAction.action === 'dispute' ? 'btn-danger' : ''}`}
                style={{ background: confirmAction.action === 'cancel' ? 'color-mix(in srgb, var(--coral-500) 80%, black)' : undefined, color: '#fff' }}
                disabled={!!actionWorking}
                onClick={handleConfirmAction}
              >
                {actionWorking ? <CircularProgress size={14} /> : confirmAction.action === 'dispute' ? 'Dispute' : 'Cancel contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NewContractDialog
        open={dialogOpen}
        orgId={orgId}
        prefill={dialogPrefill}
        onClose={() => { setDialogOpen(false); setDialogPrefill(undefined); }}
        onCreated={(_id) => {
          setDialogOpen(false);
          setDialogPrefill(undefined);
          fetchContracts(orgId);
        }}
      />

      {assignCrewOpen && assignCrewContractId && (() => {
        const assignContract = contracts.find(c => c.id === assignCrewContractId);
        if (!assignContract) return null;
        return (
          <AssignCrewDialog
            open={assignCrewOpen}
            contract={assignContract}
            orgId={orgId}
            onClose={() => { setAssignCrewOpen(false); setAssignCrewContractId(null); }}
            onUpdated={(updated) => {
              setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
          />
        );
      })()}
    </>
  );
}

// ---- page wrapper with AppShell ----
export default function Contracts() {
  const commands = [
    {
      id: 'con-new',
      group: 'Contracts',
      icon: <AddIcon />,
      label: 'New contract',
      hint: 'n',
      run: () => {},
    },
  ];

  const helpExtra: Array<[string, string[]]> = [
    ['New contract', ['n']],
    ['Filter type', ['←', '→']],
    ['Open contract', ['↵']],
  ];

  return (
    <AppShell
      active="contracts"
      commands={commands}
      helpExtra={helpExtra}
      searchPlaceholder="Search contracts, clients, commodities…"
    >
      <ContractsPage />
    </AppShell>
  );
}
