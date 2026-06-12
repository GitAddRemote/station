import { useState, useEffect } from 'react';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SecurityIcon from '@mui/icons-material/Security';
import DiamondIcon from '@mui/icons-material/Diamond';
import RecyclingIcon from '@mui/icons-material/Recycling';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import ArticleIcon from '@mui/icons-material/Article';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { api } from '../../services/api.service';

type ContractStatus = 'draft' | 'open' | 'claimed' | 'active' | 'completed' | 'disputed' | 'cancelled';
type ContractType = 'transport' | 'transfer' | 'mining' | 'security' | 'salvage' | 'medical' | 'refueling';

interface ContractRow {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  rewardAuec: string | null;
  deadline: string | null;
  createdAt: string;
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

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

function formatAuec(val: string | null): string {
  if (!val) return '—';
  const n = parseFloat(val);
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M aUEC`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K aUEC`;
  return `${n.toLocaleString()} aUEC`;
}

const ContractsPortlet = () => {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedContracts>('/api/contracts', { params: { limit: 5, page: 1 } })
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
        <p>No contracts yet.</p>
      </div>
    );
  }

  return (
    <>
      <table className="inv-table">
        <thead>
          <tr>
            <th>Contract</th>
            <th>Type</th>
            <th>Status</th>
            <th className="num">Reward</th>
            <th>Deadline</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => {
            const meta = TYPE_META[c.type] ?? TYPE_META.transport;
            const chipCls = STATUS_CHIP[c.status] ?? 'neutral';
            const deadline = formatDeadline(c.deadline);
            return (
              <tr key={c.id}>
                <td>
                  <div className="inv-item">
                    <div className="nm">{c.title}</div>
                  </div>
                </td>
                <td>
                  <span className="chip-badge neutral" style={{ gap: 4 }}>
                    {meta.icon}{meta.label}
                  </span>
                </td>
                <td>
                  <span className={`chip-badge ${chipCls}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="cell-num">{formatAuec(c.rewardAuec)}</td>
                <td className="cell-muted">
                  {deadline ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AccessTimeIcon style={{ width: 13, height: 13 }} />
                      {deadline}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {total > 5 && (
        <div className="p-pagination">
          <span className="p-count">Showing 5 of {total.toLocaleString()} contracts</span>
        </div>
      )}
    </>
  );
};

export default ContractsPortlet;
