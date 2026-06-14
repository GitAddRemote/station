import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { api } from '../services/api.service';
import { AppShell } from '../components/AppShell';

interface Invite {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  revoked: boolean;
  usedById: string | null;
}

interface GeneratedInvite {
  id: string;
  token: string;
  inviteUrl: string;
  expiresAt: string;
}

function inviteStatus(invite: Invite): 'Pending' | 'Used' | 'Expired' | 'Revoked' {
  if (invite.revoked) return 'Revoked';
  if (invite.usedAt) return 'Used';
  if (new Date(invite.expiresAt) < new Date()) return 'Expired';
  return 'Pending';
}

const STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  Pending: 'success',
  Used: 'default',
  Expired: 'warning',
  Revoked: 'error',
};

const AdminInvites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = useCallback(() => {
    setLoading(true);
    api
      .get<Invite[]>('/auth-invites')
      .then((res) => {
        setInvites(res.data);
        setForbidden(false);
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          setForbidden(true);
        } else {
          setError('Failed to load invites');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerated(null);
    setError(null);
    try {
      const res = await api.post<GeneratedInvite>('/auth-invites', {});
      setGenerated(res.data);
      loadInvites();
    } catch {
      setError('Failed to generate invite');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.delete(`/auth-invites/${id}`);
      loadInvites();
    } catch {
      setError('Failed to revoke invite');
    }
  };

  if (loading) {
    return (
      <AppShell active="admin-invites">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </AppShell>
    );
  }

  if (forbidden) {
    return (
      <AppShell active="admin-invites">
        <Box sx={{ p: 4 }}>
          <Alert severity="error">
            403 — You do not have permission to access this page.
          </Alert>
        </Box>
      </AppShell>
    );
  }

  return (
    <AppShell active="admin-invites">
      <Box sx={{ p: 4 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Invite Management
          </Typography>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate invite'}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {generated && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Invite generated. Copy this link — it will not be shown again.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                value={generated.inviteUrl}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace' }}
              />
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() =>
                  navigator.clipboard.writeText(generated.inviteUrl)
                }
              >
                Copy
              </Button>
            </Stack>
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Used by</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {invites.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ color: '#9aa0a6' }}
                  >
                    No invites yet
                  </TableCell>
                </TableRow>
              )}
              {invites.map((invite) => {
                const status = inviteStatus(invite);
                return (
                  <TableRow key={invite.id}>
                    <TableCell
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    >
                      {invite.token.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      {new Date(invite.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invite.expiresAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={status}
                        color={STATUS_COLOR[status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{invite.usedById ?? '—'}</TableCell>
                    <TableCell>
                      {status === 'Pending' && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleRevoke(invite.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </AppShell>
  );
};

export default AdminInvites;
