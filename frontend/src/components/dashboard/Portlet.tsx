import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

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

const SIZE_CYCLE: Record<PortletSize, PortletSize> = {
  compact:  'standard',
  standard: 'full',
  full:     'compact',
};

const SIZE_ICON: Record<PortletSize, ReactNode> = {
  compact:  <ViewCompactIcon />,
  standard: <ViewAgendaIcon />,
  full:     <ViewColumnIcon />,
};

const SIZE_TITLE: Record<PortletSize, string> = {
  compact:  'Compact (1/3) — click to expand',
  standard: 'Standard (2/3) — click to expand',
  full:     'Full width — click to collapse',
};

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

  const sizeBtn = onSizeChange
    ? (
      <button
        className="pcard-act pcard-size-btn"
        title={SIZE_TITLE[size]}
        aria-label={SIZE_TITLE[size]}
        onClick={(e) => { e.stopPropagation(); onSizeChange(SIZE_CYCLE[size]); }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {SIZE_ICON[size]}
      </button>
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
        {sizeBtn}
        {headAction}
      </div>
      <div className="pcard-body">{children}</div>
    </article>
  );
}

export default Portlet;
