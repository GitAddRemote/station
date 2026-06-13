import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

export type PortletSize = 'compact' | 'standard' | 'full';

interface PortletProps {
  id: string;
  icon: ReactNode;
  title: string;
  href?: string;
  size: PortletSize;
  editing: boolean;
  dragging: boolean;
  dropTarget: boolean;
  dragProps?: React.HTMLAttributes<HTMLElement>;
  onSizeChange?: (size: PortletSize) => void;
  children: ReactNode;
}

const SIZE_LABELS: Record<PortletSize, string> = {
  compact:  'Compact',
  standard: 'Standard',
  full:     'Full width',
};
const SIZE_ORDER: PortletSize[] = ['compact', 'standard', 'full'];

function Portlet({
  id,
  icon,
  title,
  href,
  size,
  editing,
  dragging,
  dropTarget,
  dragProps = {},
  onSizeChange,
  children,
}: PortletProps) {
  const headAction = href && !editing
    ? (
      <Link
        className="pcard-act"
        to={href}
        aria-label={`Open ${title}`}
        title={`Open ${title}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <OpenInNewIcon />
      </Link>
    )
    : null;

  const sizeMenu = editing && onSizeChange
    ? (
      <select
        className="pcard-size-select"
        value={size}
        onChange={(e) => onSizeChange(e.target.value as PortletSize)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Widget size"
      >
        {SIZE_ORDER.map((s) => (
          <option key={s} value={s}>{SIZE_LABELS[s]}</option>
        ))}
      </select>
    )
    : null;

  return (
    <article
      className={
        `pcard pcard--${size}` +
        (dragging ? ' dragging' : '') +
        (dropTarget ? ' drop-target' : '')
      }
      data-portlet={id}
      {...(dragProps as React.HTMLAttributes<HTMLElement>)}
    >
      <div className="pcard-head">
        <span className="pcard-grip" aria-hidden="true">
          <DragIndicatorIcon />
        </span>
        <span className="pcard-ico">{icon}</span>
        <span className="pcard-title">{title}</span>
        {sizeMenu}
        {headAction}
      </div>
      <div className="pcard-body">{children}</div>
    </article>
  );
}

export default Portlet;
