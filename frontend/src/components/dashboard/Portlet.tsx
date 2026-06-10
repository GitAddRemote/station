import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface PortletProps {
  id: string;
  icon: ReactNode;
  title: string;
  href?: string;
  full?: boolean;
  editing: boolean;
  dragging: boolean;
  dropTarget: boolean;
  dragProps?: React.HTMLAttributes<HTMLElement>;
  children: ReactNode;
}

function Portlet({
  id,
  icon,
  title,
  href,
  full,
  editing,
  dragging,
  dropTarget,
  dragProps = {},
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

  return (
    <article
      className={
        'pcard' +
        (full ? ' pcard--full' : '') +
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
        {headAction}
      </div>
      <div className="pcard-body">{children}</div>
    </article>
  );
}

export default Portlet;
