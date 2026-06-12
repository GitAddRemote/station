import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArticleIcon from '@mui/icons-material/Article';
import { contractsService, type Contract } from '../../services/contracts.service';
import { api } from '../../services/api.service';
import {
  CONTRACT_TYPE_META,
  CONTRACT_STATUS_META,
  fmtAbbr,
  fmtDeadline,
  isUrgentDeadline,
} from './contractMeta';

function ContractPortlet() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    api.get('/users/profile')
      .then((r) => api.get<{ id: string }[]>(`/user-organization-roles/user/${r.data.id}/organizations`))
      .then((r) => {
        const orgs = Array.isArray(r.data) ? r.data : [];
        setOrgId(orgs[0]?.id ?? null);
      })
      .catch(() => setOrgId(null));
  }, []);

  const fetchContracts = useCallback(async (oid: string) => {
    setLoading(true);
    try {
      const result = await contractsService.getContracts({
        orgId: oid,
        status: ['open', 'claimed', 'active'],
        limit: 5,
        page: 1,
      });
      setContracts(result.data);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orgId === undefined) return; // still resolving profile
    if (orgId) {
      fetchContracts(orgId);
    } else {
      setLoading(false); // no org — show empty state
    }
  }, [orgId, fetchContracts]);

  if (loading) {
    return (
      <div className="p-empty">
        <CircularProgress size={20} />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <>
        <div className="pstub">
          <ArticleIcon />
          <span className="pstub-label">No active contracts</span>
        </div>
        <div className="pbtn-row">
          <Link className="btn btn-ghost btn-sm" to="/contracts">
            View all contracts <ArrowForwardIcon />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {contracts.map((c) => {
        const ty = CONTRACT_TYPE_META[c.type] ?? CONTRACT_TYPE_META.transport;
        const st = CONTRACT_STATUS_META[c.status] ?? CONTRACT_STATUS_META.draft;
        const deadline = fmtDeadline(c.deadline);
        const urgent = isUrgentDeadline(c);

        return (
          <div key={c.id} className="ct-portlet-row">
            <span className={`ct-portlet-ic ${ty.cls}`}>
              <ty.Icon />
            </span>
            <div className="ct-portlet-body">
              <div className="ct-portlet-title">{c.title}</div>
              <div className="ct-portlet-meta">
                <span className={`chip-badge ${st.chipTone}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                  <st.Icon style={{ width: 10, height: 10 }} />
                  {st.label}
                </span>
                {deadline !== '—' && (
                  <span className={`ct-portlet-dl ${urgent ? 'urgent' : ''}`}>
                    {deadline}
                  </span>
                )}
              </div>
            </div>
            <div className="ct-portlet-reward">
              <span className="ct-portlet-auec">{fmtAbbr(c.reward)}</span>
              <span className="ct-portlet-auec-unit">aUEC</span>
            </div>
          </div>
        );
      })}
      <div className="pbtn-row">
        <Link className="btn btn-ghost btn-sm" to="/contracts">
          View all <ArrowForwardIcon />
        </Link>
      </div>
    </>
  );
}

export default ContractPortlet;
