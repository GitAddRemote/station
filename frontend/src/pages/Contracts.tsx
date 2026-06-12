import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { KeyboardEvent } from 'react';
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
import type { Contract, ContractType } from '../services/contracts.service';
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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_CONTRACTS[0]?.id ?? null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // rowRefs for keyboard roving focus
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const visible = useMemo(() => {
    if (typeFilter === 'all') return MOCK_CONTRACTS;
    return MOCK_CONTRACTS.filter((c) => c.type === typeFilter);
  }, [typeFilter]);

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
  const openCount = MOCK_CONTRACTS.filter((c) => c.status === 'open').length;
  const inProgressCount = MOCK_CONTRACTS.filter(
    (c) => c.status === 'active' || c.status === 'claimed',
  ).length;
  const rewardPool = MOCK_CONTRACTS.filter(
    (c) => c.status === 'open' || c.status === 'active' || c.status === 'claimed',
  ).reduce((s, c) => s + c.reward, 0);
  const completedCount = MOCK_CONTRACTS.filter((c) => c.status === 'completed').length;

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
    // TODO: open new contract dialog (#381)
  }, []);

  const handleAction = useCallback(() => {
    // TODO: wire actions (#381)
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
                  {visible.length} of {MOCK_CONTRACTS.length} contracts
                </span>
              </div>
            </>
          )}
        </div>

        {selected && (
          <ContractDetail
            contract={selected}
            onAction={handleAction}
          />
        )}
      </div>
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
