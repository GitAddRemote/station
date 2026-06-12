import type { Contract } from '../../services/contracts.service';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PanToolIcon from '@mui/icons-material/PanTool';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LoopIcon from '@mui/icons-material/Loop';
import CircleIcon from '@mui/icons-material/Circle';
import ShieldIcon from '@mui/icons-material/Shield';
import GppGoodIcon from '@mui/icons-material/GppGood';
import GppBadIcon from '@mui/icons-material/GppBad';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import {
  CONTRACT_TYPE_META,
  CONTRACT_STATUS_META,
  fmtFull,
  fmtDeadline,
  initials,
  avColor,
} from './contractMeta';
import ContractSpec from './ContractSpec';

interface ContractDetailProps {
  contract: Contract;
  onAction?: (action: string, contractId: string) => void;
}

const RISK_ICON = {
  low:  GppGoodIcon,
  med:  GppMaybeIcon,
  high: GppBadIcon,
} as const;

const RISK_LABEL = { low: 'Low', med: 'Medium', high: 'High' } as const;

export function ContractDetail({ contract, onAction }: ContractDetailProps) {
  const ty = CONTRACT_TYPE_META[contract.type] ?? CONTRACT_TYPE_META.transport;
  const st = CONTRACT_STATUS_META[contract.status] ?? CONTRACT_STATUS_META.draft;
  const RiskIcon = RISK_ICON[contract.risk] ?? ShieldIcon;
  const deadlineText = fmtDeadline(contract.deadline);
  const specTitle = contract.type === 'transport' ? 'Route' : 'Brief';

  return (
    <div className="panel detail">
      {/* hero */}
      <div className="panel-body">
        <div className="con-hero">
          <span className={`big-ic ${ty.cls}`}>
            <ty.Icon />
          </span>
          <div className="con-hero-text">
            <div className="con-hero-title">{contract.title}</div>
            <div className="con-hero-sub">
              <span>{contract.displayId}</span>
              <span>·</span>
              <span>{ty.label}</span>
            </div>
          </div>
          <span className={`chip-badge ${st.chipTone}`}>
            <st.Icon />
            {st.label}
          </span>
        </div>

        {/* reward + risk */}
        <div className="reward-hero">
          <div>
            <div className="rk">Contract reward</div>
            <div className="rv">
              {fmtFull(contract.reward)}<small>aUEC</small>
            </div>
          </div>
          <div className="risk-block">
            <div className="rk">Risk</div>
            <span className={`risk-badge ${contract.risk}`}>
              <RiskIcon />
              {RISK_LABEL[contract.risk]}
            </span>
          </div>
        </div>
      </div>

      {/* type-specific spec */}
      <div className="detail-section">
        <div className="ds-cap"><span>{specTitle}</span></div>
        <ContractSpec contract={contract} />
        {contract.description && (
          <p className="con-desc">{contract.description}</p>
        )}
      </div>

      {/* client & terms */}
      <div className="detail-section">
        <div className="ds-cap"><span>Client &amp; terms</span></div>
        <div className="kv">
          <span className="k"><BusinessIcon />Client</span>
          <span className="v">{contract.clientName}</span>
        </div>
        <div className="kv">
          <span className="k"><DescriptionIcon />Type</span>
          <span className="v">{contract.clientType}</span>
        </div>
        <div className="kv">
          <span className="k"><AccessTimeIcon />Deadline</span>
          <span className="v">{deadlineText === '—' ? 'None' : `in ${deadlineText}`}</span>
        </div>
        <div className="kv">
          <span className="k"><PeopleIcon />Assigned</span>
          <span className="v">
            {contract.parties && contract.parties.length > 0 ? (
              <span className="ct-assigned">
                <span className="ct-assigned-stack">
                  {contract.parties.map((p) => (
                    <span
                      key={p.id}
                      className="ct-av"
                      style={{ background: avColor(p.username) }}
                      title={p.username}
                    >
                      {initials(p.username)}
                    </span>
                  ))}
                </span>
              </span>
            ) : (
              <span className="t-faint">Unassigned</span>
            )}
          </span>
        </div>
      </div>

      {/* milestones */}
      <div className="detail-section">
        <div className="ds-cap"><span>Progress</span></div>
        <div className="ct-miles">
          {(contract.milestones ?? []).map((m, i) => (
            <div className={`ct-mile ${m.state}`} key={m.id ?? i}>
              <span className="ct-mk">
                {m.state === 'done' ? (
                  <CheckCircleIcon />
                ) : m.state === 'active' ? (
                  <LoopIcon />
                ) : (
                  <CircleIcon />
                )}
              </span>
              <span className="ct-ml">{m.label}</span>
              {m.state === 'active' && <span className="ct-mt">now</span>}
            </div>
          ))}
        </div>
      </div>

      {/* action buttons */}
      <div className="panel-body con-actions">
        {contract.status === 'open' && (
          <>
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => onAction?.('claim', contract.id)}
            >
              <PanToolIcon />
              Claim contract
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={() => onAction?.('assign', contract.id)}
            >
              <PersonAddAltIcon />
              Assign crew
            </button>
          </>
        )}
        {contract.status === 'claimed' && (
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={() => onAction?.('start', contract.id)}
          >
            <PlayArrowIcon />
            Start contract
          </button>
        )}
        {contract.status === 'active' && (
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={() => onAction?.('complete', contract.id)}
          >
            <DoneAllIcon />
            Mark complete
          </button>
        )}
        {contract.status === 'completed' && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ flex: 1 }}
            onClick={() => onAction?.('repost', contract.id)}
          >
            <ContentCopyIcon />
            Repost contract
          </button>
        )}
        {contract.status === 'disputed' && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ flex: 1 }}
            onClick={() => onAction?.('resolve', contract.id)}
          >
            <GavelIcon />
            Resolve dispute
          </button>
        )}
        <button
          className="btn btn-ghost btn-sm"
          aria-label="Contract settings"
          onClick={() => onAction?.('settings', contract.id)}
        >
          <MoreHorizIcon />
        </button>
      </div>

      {/* history placeholder */}
      <div className="detail-section">
        <div className="ds-cap"><span>History</span></div>
        <p className="t-faint" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
          Activity history will appear here.
        </p>
      </div>
    </div>
  );
}

export default ContractDetail;
