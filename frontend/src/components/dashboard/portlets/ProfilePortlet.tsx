import { Link } from 'react-router-dom';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface ProfilePortletProps {
  username: string;
  role?: string;
  orgName?: string;
}

function ProfilePortlet({ username, role = 'Member', orgName }: ProfilePortletProps) {
  const initial = username?.charAt(0).toUpperCase() || 'U';
  return (
    <>
      <div className="pprofile">
        <span className="big-av">{initial}</span>
        <div>
          <div className="ph">{username}</div>
          <div className="pr">{role}{orgName ? ` · ${orgName}` : ''}</div>
        </div>
      </div>
      <div className="prows">
        <div className="prow">
          <span className="l"><VerifiedUserIcon /> Reputation</span>
          <span className="v brand">Trusted</span>
        </div>
        <div className="prow">
          <span className="l"><CalendarTodayIcon /> Member since</span>
          <span className="v">2952</span>
        </div>
      </div>
      <div className="pbtn-row">
        <Link className="btn btn-ghost btn-sm" to="/profile">Edit profile</Link>
      </div>
    </>
  );
}

export default ProfilePortlet;
