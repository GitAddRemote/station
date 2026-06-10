import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';
import AppShell from '../components/AppShell';
import { api } from '../services/api.service';

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    bio: '',
  });

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
        setProfile({
          username: data.username || '',
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '',
          bio: data.bio || '',
        });
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.patch('/users/profile', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        bio: profile.bio,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage({ type: 'error', text: msg || 'An error occurred while updating your profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setChangingPassword(true);
    try {
      const response = await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordMessage({ type: 'success', text: response.data.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordMessage({ type: 'error', text: 'An error occurred while changing your password' });
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

  const userInitial = profile.firstName
    ? profile.firstName.charAt(0).toUpperCase()
    : profile.username?.charAt(0).toUpperCase() || 'U';

  return (
    <AppShell active="profile" userInitial={userInitial}>
      <Box sx={{ maxWidth: 720 }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--text-strong)',
            mb: 0.5,
          }}
        >
          My Profile
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 4 }}>
          Update your personal information
        </Typography>

        {message.text && (
          <Alert severity={message.type as 'success' | 'error'} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <Card>
          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField label="Username" value={profile.username} disabled fullWidth helperText="Username cannot be changed" />
                <TextField label="Email" value={profile.email} disabled fullWidth helperText="Email cannot be changed" />
                <TextField label="First Name" name="firstName" value={profile.firstName} onChange={handleInputChange} fullWidth inputProps={{ 'aria-label': 'First Name' }} />
                <TextField label="Last Name" name="lastName" value={profile.lastName} onChange={handleInputChange} fullWidth inputProps={{ 'aria-label': 'Last Name' }} />
                <TextField
                  label="Phone Number" name="phoneNumber" value={profile.phoneNumber}
                  onChange={handleInputChange} fullWidth placeholder="+1234567890"
                  helperText="Use E.164 format (e.g., +1234567890)"
                  inputProps={{ 'aria-label': 'Phone Number' }}
                />
                <TextField
                  label="Bio" name="bio" value={profile.bio} onChange={handleInputChange}
                  fullWidth multiline rows={4} placeholder="Tell us about yourself..."
                  inputProps={{ maxLength: 500, 'aria-label': 'Bio' }}
                  helperText={`${profile.bio.length}/500 characters`}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" size="large" startIcon={<SaveIcon />} disabled={saving} sx={{ flex: 1 }}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button variant="outlined" size="large" onClick={() => navigate('/dashboard')} sx={{ flex: 1 }}>
                    Cancel
                  </Button>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>

        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-strong)' }}>
              Change Password
            </Typography>
            {passwordMessage.text && (
              <Alert severity={passwordMessage.type as 'success' | 'error'} sx={{ mb: 3 }}>
                {passwordMessage.text}
              </Alert>
            )}
            <form onSubmit={handlePasswordChange}>
              <Stack spacing={3}>
                <TextField label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth required inputProps={{ 'aria-label': 'Current Password' }} />
                <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth required helperText="Minimum 6 characters" inputProps={{ minLength: 6, 'aria-label': 'New Password' }} />
                <TextField label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth required inputProps={{ 'aria-label': 'Confirm New Password' }} />
                <Button type="submit" variant="contained" size="large" startIcon={<LockIcon />} disabled={changingPassword}>
                  {changingPassword ? 'Changing Password…' : 'Change Password'}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>
    </AppShell>
  );
};

export default Profile;
