import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import type { Contract, ContractType, ContractStatus } from '../../services/contracts.service';

import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SecurityIcon from '@mui/icons-material/Security';
import DiamondIcon from '@mui/icons-material/Diamond';
import RecyclingIcon from '@mui/icons-material/Recycling';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';

import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import LoopIcon from '@mui/icons-material/Loop';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportIcon from '@mui/icons-material/Report';
import BlockIcon from '@mui/icons-material/Block';
import PendingIcon from '@mui/icons-material/Pending';

export interface ContractTypeMeta {
  Icon: ComponentType<SvgIconProps>;
  label: string;
  cls: string;
}

export interface ContractStatusMeta {
  Icon: ComponentType<SvgIconProps>;
  label: string;
  chipTone: string;
}

export const CONTRACT_TYPE_META: Record<ContractType, ContractTypeMeta> = {
  transport:  { Icon: LocalShippingIcon, label: 'Hauling / Transport', cls: 'ct-transport' },
  security:   { Icon: SecurityIcon,      label: 'Security',            cls: 'ct-security' },
  mining:     { Icon: DiamondIcon,       label: 'Mining',              cls: 'ct-mining' },
  salvage:    { Icon: RecyclingIcon,     label: 'Salvage',             cls: 'ct-salvage' },
  transfer:   { Icon: SwapHorizIcon,     label: 'Transfer',            cls: 'ct-transfer' },
  medical:    { Icon: LocalHospitalIcon, label: 'Medical',             cls: 'ct-medical' },
  refueling:  { Icon: LocalGasStationIcon, label: 'Refueling',         cls: 'ct-refueling' },
};

export const CONTRACT_STATUS_META: Record<ContractStatus, ContractStatusMeta> = {
  draft:     { Icon: PendingIcon,           label: 'Draft',       chipTone: 'neutral' },
  open:      { Icon: FiberManualRecordIcon, label: 'Open',        chipTone: 'brand' },
  claimed:   { Icon: PersonAddAltIcon,      label: 'Claimed',     chipTone: 'info' },
  active:    { Icon: LoopIcon,              label: 'In progress', chipTone: 'warn' },
  completed: { Icon: TaskAltIcon,           label: 'Completed',   chipTone: 'success' },
  disputed:  { Icon: ReportIcon,            label: 'Disputed',    chipTone: 'danger' },
  cancelled: { Icon: BlockIcon,             label: 'Cancelled',   chipTone: 'neutral' },
};

export const RISK_META = {
  low:  { label: 'Low',    cls: 'low',  Icon: SecurityIcon as ComponentType<SvgIconProps> },
  med:  { label: 'Medium', cls: 'med',  Icon: (): JSX.Element => <SecurityIcon /> },
  high: { label: 'High',   cls: 'high', Icon: (): JSX.Element => <SecurityIcon /> },
} as const;

// helpers
export const fmtFull = (n: number): string =>
  Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

export const fmtAbbr = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
};

export const initials = (s: string): string =>
  s.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** Returns a color string based on name (deterministic) */
export const avColor = (name: string): string => {
  const colors = ['#2D7DD2', '#97CC04', '#E84855', '#F18F01', '#C14953', '#3BB273', '#7B2D8B'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

/** Format an ISO deadline string as a relative label  */
export const fmtDeadline = (deadline: string | null | undefined): string => {
  if (!deadline || deadline === '—') return '—';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = diff / 3_600_000;
  if (h < 1) return `${Math.ceil(diff / 60_000)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  const d = Math.ceil(h / 24);
  return `${d}d`;
};

/** Returns true if deadline is urgent (≤6h AND contract is active/claimed) */
export const isUrgentDeadline = (c: Contract): boolean => {
  if (!c.deadline) return false;
  if (c.status !== 'active' && c.status !== 'claimed') return false;
  const diff = new Date(c.deadline).getTime() - Date.now();
  return diff > 0 && diff <= 6 * 3_600_000;
};
