import { Link } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';

interface Org {
  id: string;
  name: string;
  role?: string;
  memberCount?: number;
}

interface OrganizationsPortletProps {
  orgs: Org[];
}

function OrganizationsPortlet({ orgs }: OrganizationsPortletProps) {
  if (orgs.length === 0) {
    return (
      <>
        <div className="pstub">
          <AddIcon />
          <span className="pstub-label">No organizations yet</span>
        </div>
        <div className="pbtn-row">
          <button className="btn btn-ghost btn-sm">
            <AddIcon /> Create organization
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {orgs.slice(0, 3).map((org) => (
        <div className="pmini" key={org.id}>
          <span className="pavatar">{org.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <div className="pnm">{org.name}</div>
            <div className="pmeta">
              {org.role || 'Member'}{org.memberCount ? ` · ${org.memberCount} members` : ''}
            </div>
          </div>
        </div>
      ))}
      <div className="pbtn-row">
        <Link className="btn btn-ghost btn-sm" to="/dashboard">
          Manage orgs <ArrowForwardIcon />
        </Link>
      </div>
    </>
  );
}

export default OrganizationsPortlet;
