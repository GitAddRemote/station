import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import FileTextIcon from '@mui/icons-material/Article';
import IdCardIcon from '@mui/icons-material/Badge';
import GroupsIcon from '@mui/icons-material/Groups';
import ShieldCheckIcon from '@mui/icons-material/VerifiedUser';
import LockIcon from '@mui/icons-material/Lock';
import KeyIcon from '@mui/icons-material/Key';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CircleDotIcon from '@mui/icons-material/FiberManualRecord';
import CalendarIcon from '@mui/icons-material/CalendarToday';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import AppShell from '../components/AppShell';
import { api } from '../services/api.service';
import './Profile.css';

interface ProfileData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  bio: string;
}

interface OrgEntry {
  id: string;
  name: string;
  role?: string;
  memberCount?: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    bio: '',
  });
  const [draft, setDraft] = useState<ProfileData>(profile);
  const [orgs, setOrgs] = useState<OrgEntry[]>([]);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get('/users/profile');
        const data = response.data;
        const loaded: ProfileData = {
          username: data.username || '',
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '',
          bio: data.bio || '',
        };
        setProfile(loaded);
        setDraft(loaded);

        // fetch orgs
        if (data.id) {
          try {
            const orgsRes = await api.get(`/user-organization-roles/user/${data.id}/organizations`);
            const raw = Array.isArray(orgsRes.data) ? orgsRes.data : [];
            setOrgs(raw.map((entry: { organization?: { id: string; name: string }; organizationId?: string; role?: string; organization_member_count?: number }) => ({
              id: entry.organization?.id ?? entry.organizationId ?? '',
              name: entry.organization?.name ?? `Org #${entry.organizationId}`,
              role: entry.role,
              memberCount: entry.organization_member_count,
            })));
          } catch { /* orgs optional */ }
        }
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [navigate]);

  const startEdit = useCallback(() => { setDraft(profile); setEditing(true); setMessage({ type: '', text: '' }); }, [profile]);
  const cancelEdit = useCallback(() => { setDraft(profile); setEditing(false); }, [profile]);

  // keyboard: e to edit, Esc to cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = ((e.target as HTMLElement)?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (e.key === 'Escape' && editing) (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === 'e' && !editing && !pwOpen) { e.preventDefault(); startEdit(); }
      if (e.key === 'Escape' && editing && !pwOpen) cancelEdit();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing, pwOpen, startEdit, cancelEdit]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.patch('/users/profile', {
        firstName: draft.firstName,
        lastName: draft.lastName,
        phoneNumber: draft.phoneNumber,
        bio: draft.bio,
      });
      const updated = { ...profile, firstName: draft.firstName, lastName: draft.lastName, phoneNumber: draft.phoneNumber, bio: draft.bio };
      setProfile(updated);
      setDraft(updated);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile saved.' });
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage({ type: 'error', text: msg || 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setChangingPassword(true);
    try {
      const response = await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordMessage({ type: 'success', text: response.data.message || 'Password changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwOpen(false);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordMessage({ type: 'error', text: 'An error occurred while changing your password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--surface-page)' }}>
        <CircularProgress />
      </Box>
    );
  }

  const cur = profile;
  const userInitial = (draft.firstName || cur.username)?.charAt(0).toUpperCase() || 'U';
  const displayInitial = (cur.firstName || cur.username)?.charAt(0).toUpperCase() || 'U';
  const fullName = [cur.firstName, cur.lastName].filter(Boolean).join(' ');

  return (
    <AppShell active="profile" userInitial={userInitial} searchPlaceholder="Search Station…">

      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">
            <PersonIcon style={{ width: 13, height: 13 }} /> Account &rsaquo; My Profile
          </div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-sub">
            Your identity across Station — in-game name, bio, and the organizations you belong to.
          </p>
        </div>
        <div className="page-actions">
          {editing ? (
            <div className="pf-savebar">
              <span className="hint"><CircleDotIcon style={{ width: 14, height: 14 }} /> Unsaved changes</span>
              <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                Cancel <kbd style={{ marginLeft: 4, fontSize: '10px', border: '1px solid var(--border-default)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>Esc</kbd>
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                <SaveIcon style={{ width: 15, height: 15 }} /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" id="pf-edit" onClick={startEdit}>
              <EditIcon style={{ width: 15, height: 15 }} /> Edit profile <kbd style={{ marginLeft: 6, fontSize: '10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)' }}>e</kbd>
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <Alert severity={message.type as 'success' | 'error'} sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Hero banner */}
      <div className="pf-hero">
        <div className="pf-cover" />
        <div className="pf-body">
          <div className="pf-av">{displayInitial}</div>
          <div className="pf-id">
            <div className="pf-name">
              {fullName || cur.username}
              <span className="rank member">Member</span>
            </div>
            <div className="pf-handle">
              <span>@{cur.username}</span>
              {fullName && <><span className="dot">·</span><span className="muted">{fullName}</span></>}
            </div>
            <div className="pf-meta">
              {orgs[0] && (
                <span className="mi">
                  <GroupsIcon style={{ width: 13, height: 13 }} /> {orgs[0].name}
                </span>
              )}
              <span className="mi">
                <CalendarIcon style={{ width: 13, height: 13 }} /> Station member
              </span>
            </div>
          </div>
        </div>
        <div className="pf-stats">
          <div className="pf-stat">
            <div className="v">{orgs.length}</div>
            <div className="k">Organizations</div>
          </div>
          <div className="pf-stat">
            <div className="v">—</div>
            <div className="k">Ops attended</div>
          </div>
          <div className="pf-stat">
            <div className="v">—</div>
            <div className="k">Hours logged</div>
          </div>
          <div className="pf-stat">
            <div className="v">Active</div>
            <div className="k">Status</div>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="pf-grid">

        {/* LEFT column */}
        <div>
          {/* About / Bio */}
          <div className="panel">
            <div className="panel-head">
              <span className="ic"><FileTextIcon style={{ width: 18, height: 18 }} /></span>
              <span className="panel-title">About</span>
            </div>
            <div className="panel-body">
              {editing ? (
                <div className="fctl">
                  <div className="fl">Bio</div>
                  <textarea
                    value={draft.bio}
                    maxLength={500}
                    onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                    placeholder="Tell the org about yourself, your playstyle, and what you fly…"
                    style={{ minHeight: 150 }}
                  />
                  <div className="charcount">{draft.bio.length}/500</div>
                </div>
              ) : (
                <div className={'pf-bio' + (cur.bio ? '' : ' empty')}>
                  {cur.bio || 'No bio yet. Click Edit profile to add one.'}
                </div>
              )}
            </div>
          </div>

          {/* Identity & contact */}
          <div className="panel" style={{ marginTop: 'var(--space-5)' }}>
            <div className="panel-head">
              <span className="ic"><IdCardIcon style={{ width: 18, height: 18 }} /></span>
              <span className="panel-title">Identity &amp; contact</span>
            </div>
            <div className="panel-body">
              {editing ? (
                <>
                  <div className="fgrid">
                    <div className="fctl">
                      <div className="fl">First name</div>
                      <input
                        value={draft.firstName}
                        onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                        placeholder="First name"
                      />
                    </div>
                    <div className="fctl">
                      <div className="fl">Last name</div>
                      <input
                        value={draft.lastName}
                        onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div className="fctl">
                    <div className="fl">Phone number</div>
                    <input
                      value={draft.phoneNumber}
                      onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
                      placeholder="+1 555 0000 (E.164 format)"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="kv">
                    <span className="k">Real name</span>
                    <span className="v">{fullName || '—'}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Phone</span>
                    <span className="v mono">{cur.phoneNumber || '—'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div>
          {/* Organizations */}
          <div className="panel">
            <div className="panel-head">
              <span className="ic"><GroupsIcon style={{ width: 18, height: 18 }} /></span>
              <span className="panel-title">Organizations</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{orgs.length}</span>
            </div>
            <div className="panel-body">
              {orgs.length === 0 ? (
                <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)', margin: 0 }}>
                  You haven't joined any organizations yet.
                </p>
              ) : (
                orgs.map((org) => (
                  <div className="org-card" key={org.id}>
                    <span className="org-logo">{org.name.slice(0, 2).toUpperCase()}</span>
                    <div className="org-info">
                      <div className="org-nm">{org.name}</div>
                      <div className="org-meta">
                        {org.role || 'Member'}{org.memberCount ? ` · ${org.memberCount} members` : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Account & security */}
          <div className="panel" style={{ marginTop: 'var(--space-5)' }}>
            <div className="panel-head">
              <span className="ic"><ShieldCheckIcon style={{ width: 18, height: 18 }} /></span>
              <span className="panel-title">Account &amp; security</span>
            </div>
            <div className="panel-body">
              <div className="fctl">
                <div className="fl"><LockIcon style={{ width: 12, height: 12 }} /> Station username</div>
                <div className="locked-field">
                  <span className="lv">{cur.username}</span>
                  <span className="lock"><LockIcon style={{ width: 12, height: 12 }} /> Permanent</span>
                </div>
              </div>
              <div className="fctl">
                <div className="fl"><LockIcon style={{ width: 12, height: 12 }} /> Email</div>
                <div className="locked-field">
                  <span className="lv">{cur.email}</span>
                  <span className="lock"><LockIcon style={{ width: 12, height: 12 }} /> Verified</span>
                </div>
              </div>

              {passwordMessage.text && (
                <Alert severity={passwordMessage.type as 'success' | 'error'} sx={{ mb: 2 }}>
                  {passwordMessage.text}
                </Alert>
              )}

              {!pwOpen ? (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', marginTop: 'var(--space-3)' }}
                  onClick={() => { setPwOpen(true); setPasswordMessage({ type: '', text: '' }); }}
                >
                  <KeyIcon style={{ width: 15, height: 15 }} /> Change password
                </button>
              ) : (
                <form className="pw-form" onSubmit={handlePasswordChange} style={{ marginTop: 'var(--space-3)' }}>
                  <div className="fctl">
                    <div className="fl">Current password</div>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoFocus required />
                  </div>
                  <div className="fctl">
                    <div className="fl">New password</div>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                    {newPassword && newPassword.length < 6 && (
                      <div className="pw-err">At least 6 characters</div>
                    )}
                  </div>
                  <div className="fctl">
                    <div className="fl">Confirm new password</div>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <div className="pw-err">Passwords don't match</div>
                    )}
                  </div>
                  <div className="pw-actions">
                    <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setPwOpen(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>Cancel</button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      disabled={changingPassword || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                    >
                      {changingPassword ? 'Saving…' : 'Update password'}
                    </button>
                  </div>
                </form>
              )}

              <div className="sec-note">
                <InfoIcon style={{ width: 14, height: 14 }} />
                Your username and email are tied to your Station account and can't be changed here.
              </div>
            </div>
          </div>
        </div>
      </div>

    </AppShell>
  );
};

export default Profile;
