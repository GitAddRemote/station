import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SecurityIcon from '@mui/icons-material/Security';
import DiamondIcon from '@mui/icons-material/Diamond';
import RecyclingIcon from '@mui/icons-material/Recycling';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import ArticleIcon from '@mui/icons-material/Article';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { api } from '../../services/api.service';
import type { PortletSize } from '../dashboard/Portlet';

type ContractStatus = 'draft' | 'open' | 'claimed' | 'active' | 'completed' | 'disputed' | 'cancelled';
type ContractType = 'transport' | 'transfer' | 'mining' | 'security' | 'salvage' | 'medical' | 'refueling';

interface ContractParty {
  userId: string | null;
  role: 'creator' | 'assignee' | 'observer';
  user?: { id: string; username: string; firstName?: string; lastName?: string } | null;
}

interface ContractRow {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  rewardAuec: string | null;
  deadline: string | null;
  createdAt: string;
  creatorId: string;
  parties: ContractParty[];
}

interface PaginatedContracts {
  data: ContractRow[];
  total: number;
}

const TYPE_META: Record<ContractType, { label: string; icon: React.ReactNode }> = {
  transport:  { label: 'Transport',  icon: <LocalShippingIcon style={{ width: 14, height: 14 }} /> },
  transfer:   { label: 'Transfer',   icon: <ArticleIcon style={{ width: 14, height: 14 }} /> },
  mining:     { label: 'Mining',     icon: <DiamondIcon style={{ width: 14, height: 14 }} /> },
  security:   { label: 'Security',   icon: <SecurityIcon style={{ width: 14, height: 14 }} /> },
  salvage:    { label: 'Salvage',    icon: <RecyclingIcon style={{ width: 14, height: 14 }} /> },
  medical:    { label: 'Medical',    icon: <MedicalServicesIcon style={{ width: 14, height: 14 }} /> },
  refueling:  { label: 'Refueling',  icon: <LocalGasStationIcon style={{ width: 14, height: 14 }} /> },
};

const STATUS_CHIP: Record<ContractStatus, string> = {
  draft:     'neutral',
  open:      'brand',
  claimed:   'neutral',
  active:    'warm',
  completed: 'success',
  disputed:  'warm',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<ContractStatus, string> = {
  draft:     'Draft',
  open:      'Open',
  claimed:   'Claimed',
  active:    'Active',
  completed: 'Done',
  disputed:  'Disputed',
  cancelled: 'Cancelled',
};

function formatAuec(val: string | null): string {
  if (!val) return '—';
  const n = parseFloat(val);
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatEnds(deadline: string | null): string | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function displayName(party: ContractParty): string {
  if (!party.user) return '—';
  return party.user.firstName || party.user.username || '—';
}

interface ContractsPortletProps {
  size: PortletSize;
}

const ContractsPortlet = ({ size }: ContractsPortletProps) => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedContracts>('/api/contracts', { params: { limit: 5, page: 1, status: 'open' } })
      .then((res) => {
        setContracts(res.data.data ?? []);
        setTotal(res.data.total ?? 0);
      })
      .catch(() => {
        setContracts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-empty"><p>Loading…</p></div>;
  }

  if (contracts.length === 0) {
    return (
      <div className="p-empty">
        <ArticleIcon />
        <p>No open contracts.</p>
      </div>
    );
  }

  const isStandardOrFull = size === 'standard' || size === 'full';
  const isFull = size === 'full';
  const nameMaxWidth = size === 'compact' ? 120 : size === 'standard' ? 180 : 220;

  return (
    <>
      <div className="pcard-scroll">
        <table className="inv-table">
          <thead>
            <tr>
              <th>Contract</th>
              {isFull && <th>Type</th>}
              <th>Status</th>
              <th>Ends</th>
              {isStandardOrFull && <th>Accepted By</th>}
              {isStandardOrFull && <th>Owned By</th>}
              {isFull && <th className="num">Reward</th>}
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => {
              const meta = TYPE_META[c.type] ?? TYPE_META.transport;
              const chipCls = STATUS_CHIP[c.status] ?? 'neutral';
              const ends = formatEnds(c.deadline);
              const assignee = c.parties?.find((p) => p.role === 'assignee') ?? null;
              const creator = c.parties?.find((p) => p.role === 'creator') ?? null;
              return (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/contracts?contract=${c.id}`)}
                >
                  <td>
                    <div className="inv-item">
                      <span className="thumb">{meta.icon}</span>
                      <div className="nm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: nameMaxWidth }}>{c.title}</div>
                    </div>
                  </td>
                  {isFull && (
                    <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{meta.label}</td>
                  )}
                  <td>
                    <span className={`chip-badge ${chipCls}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="cell-muted">
                    {ends ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AccessTimeIcon style={{ width: 12, height: 12 }} />
                        {ends}
                      </span>
                    ) : '—'}
                  </td>
                  {isStandardOrFull && (
                    <td className="cell-muted">{assignee ? displayName(assignee) : '—'}</td>
                  )}
                  {isStandardOrFull && (
                    <td className="cell-muted">{creator ? displayName(creator) : '—'}</td>
                  )}
                  {isFull && (
                    <td className="cell-num" style={{ whiteSpace: 'nowrap' }}>{formatAuec(c.rewardAuec)} aUEC</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-pagination">
        <span className="p-count">{Math.min(5, total)} of {total.toLocaleString()} open</span>
      </div>
    </>
  );
};

export default ContractsPortlet;
