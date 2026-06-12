import type { RefObject } from 'react';
import type { Contract } from '../../services/contracts.service';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BusinessIcon from '@mui/icons-material/Business';
import ShieldIcon from '@mui/icons-material/Shield';
import {
  CONTRACT_TYPE_META,
  CONTRACT_STATUS_META,
  fmtAbbr,
  isUrgentDeadline,
  fmtDeadline,
} from './contractMeta';

interface ContractRowProps {
  contract: Contract;
  selected: boolean;
  tabIndex: number;
  rowRef: RefObject<HTMLTableRowElement> | ((el: HTMLTableRowElement | null) => void);
  onSelect: () => void;
}

export function ContractRow({ contract, selected, tabIndex, rowRef, onSelect }: ContractRowProps) {
  const ty = CONTRACT_TYPE_META[contract.type] ?? CONTRACT_TYPE_META.transport;
  const st = CONTRACT_STATUS_META[contract.status] ?? CONTRACT_STATUS_META.draft;

  const urgent = isUrgentDeadline(contract);
  const deadlineText = fmtDeadline(contract.deadline);
  const isInternal = contract.clientType.toLowerCase().includes('internal') || contract.clientType.toLowerCase().includes('org');

  return (
    <tr
      ref={rowRef}
      tabIndex={tabIndex}
      aria-selected={selected}
      onClick={onSelect}
      onFocus={onSelect}
    >
      <td>
        <div className="t-ent">
          <span className={`ic ${ty.cls}`}>
            <ty.Icon />
          </span>
          <div>
            <div className="nm">{contract.title}</div>
            <div className="sub">{contract.displayId} · {ty.label}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="ct-client">
          <span className="ct-client-ic">
            {isInternal ? <ShieldIcon /> : <BusinessIcon />}
          </span>
          <span>
            <span className="ct-client-nm">{contract.clientName}</span>
            <span className="ct-client-type">{contract.clientType}</span>
          </span>
        </span>
      </td>
      <td>
        <span className={`ct-deadline${urgent ? ' urgent' : ''}`}>
          {deadlineText !== '—' && <AccessTimeIcon />}
          {deadlineText}
        </span>
      </td>
      <td>
        <span className={`chip-badge ${st.chipTone}`}>
          <st.Icon />
          {st.label}
        </span>
      </td>
      <td className="num">
        <span className="ct-reward">
          {fmtAbbr(contract.reward)} <small>aUEC</small>
        </span>
      </td>
    </tr>
  );
}

export default ContractRow;
