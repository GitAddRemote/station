import type { Contract } from '../../services/contracts.service';
import type { TransportDetails, SecurityDetails, MiningDetails, SalvageDetails } from '../../services/contracts.service';

import LocationOnIcon from '@mui/icons-material/LocationOn';
import TimerIcon from '@mui/icons-material/Timer';
import DiamondIcon from '@mui/icons-material/Diamond';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import FactoryIcon from '@mui/icons-material/Factory';
import SecurityIcon from '@mui/icons-material/Security';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import RecyclingIcon from '@mui/icons-material/Recycling';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface ContractSpecProps {
  contract: Contract;
}

export function ContractSpec({ contract }: ContractSpecProps) {
  const { type, details } = contract;

  if (type === 'transport') {
    const d = details as TransportDetails;
    return (
      <div className="ct-route">
        <div className="ct-route-node">
          <span className="ct-route-dot" />
          <span className="ct-route-lb">{d.origin ?? '—'}</span>
          <span className="ct-route-sub">{d.originSub ?? ''}</span>
        </div>
        <div className="ct-route-line">
          <span className="ct-route-cargo">
            {d.scu != null ? `${d.scu} SCU` : ''}{d.commodity ? ` · ${d.commodity}` : ''}
          </span>
        </div>
        <div className="ct-route-node ct-route-end">
          <span className="ct-route-dot" />
          <span className="ct-route-lb">{d.dest ?? '—'}</span>
          <span className="ct-route-sub">{d.destSub ?? ''}</span>
        </div>
      </div>
    );
  }

  if (type === 'security') {
    const d = details as SecurityDetails;
    return (
      <>
        <div className="kv">
          <span className="k"><SecurityIcon />Objective</span>
          <span className="v">{d.objective ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><WarningAmberIcon />Threat</span>
          <span className="v">{d.threat ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><LocationOnIcon />Location</span>
          <span className="v">{d.location ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><TimerIcon />Duration</span>
          <span className="v">{d.duration ?? '—'}</span>
        </div>
      </>
    );
  }

  if (type === 'mining') {
    const d = details as MiningDetails;
    return (
      <>
        <div className="kv">
          <span className="k"><DiamondIcon />Commodity</span>
          <span className="v brand">{d.commodity ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><MonitorWeightIcon />Quota</span>
          <span className="v mono">{d.quota != null ? `${d.quota} SCU` : '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><LocationOnIcon />Field</span>
          <span className="v">{d.location ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><FactoryIcon />Refinery</span>
          <span className="v">{d.refinery ?? '—'}</span>
        </div>
      </>
    );
  }

  if (type === 'salvage') {
    const d = details as SalvageDetails;
    return (
      <>
        <div className="kv">
          <span className="k"><DirectionsBoatIcon />Site</span>
          <span className="v">{d.site ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><RecyclingIcon />Target</span>
          <span className="v">{d.target ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><MonitorWeightIcon />Volume</span>
          <span className="v mono">{d.targetScu != null ? `${d.targetScu} SCU` : '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><LocationOnIcon />Location</span>
          <span className="v">{d.location ?? '—'}</span>
        </div>
      </>
    );
  }

  if (type === 'transfer') {
    const d = details as Record<string, unknown>;
    return (
      <>
        <div className="kv">
          <span className="k"><SwapHorizIcon />Asset</span>
          <span className="v">{(d.asset as string) ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><MonitorWeightIcon />Quantity</span>
          <span className="v mono">{d.quantity != null ? String(d.quantity) : '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><LocationOnIcon />From</span>
          <span className="v">{(d.fromLocation as string) ?? '—'}</span>
        </div>
        <div className="kv">
          <span className="k"><LocationOnIcon />To</span>
          <span className="v">{(d.toLocation as string) ?? '—'}</span>
        </div>
      </>
    );
  }

  // Fallback for medical, refueling, unknown
  const d = details as Record<string, unknown>;
  const entries = Object.entries(d).filter(([, v]) => v != null);
  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(([key, value]) => (
        <div className="kv" key={key}>
          <span className="k">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</span>
          <span className="v">{String(value)}</span>
        </div>
      ))}
    </>
  );
}

export default ContractSpec;
