import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface Invitation {
  id: string;
  orgName: string;
  role?: string;
}

interface InvitationsPortletProps {
  invitations: Invitation[];
}

function InvitationsPortlet({ invitations }: InvitationsPortletProps) {
  if (invitations.length === 0) {
    return (
      <div className="pstub">
        <CheckIcon />
        <span className="pstub-label">No pending invitations</span>
      </div>
    );
  }

  return (
    <>
      {invitations.slice(0, 2).map((inv) => (
        <div className="pmini" key={inv.id}>
          <span
            className="pavatar"
            style={{ background: 'linear-gradient(140deg, var(--teal-300), var(--teal-500))' }}
          >
            {inv.orgName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div className="pnm">{inv.orgName}</div>
            <div className="pmeta">Invited you as {inv.role || 'Member'}</div>
          </div>
        </div>
      ))}
      <div className="pbtn-row">
        <button className="btn btn-primary btn-sm"><CheckIcon /> Accept</button>
        <button className="btn btn-ghost btn-sm"><CloseIcon /> Decline</button>
      </div>
    </>
  );
}

export default InvitationsPortlet;
