import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { contractsService } from '../../services/contracts.service';
import type { Contract, ContractParty } from '../../services/contracts.service';
import { avColor, initials } from './contractMeta';
import { api } from '../../services/api.service';

interface OrgMember {
  userId: string;
  username: string;
}

interface AssignCrewDialogProps {
  open: boolean;
  contract: Contract;
  orgId: string;
  onClose: () => void;
  onUpdated: (contract: Contract) => void;
}

export default function AssignCrewDialog({
  open,
  contract,
  orgId,
  onClose,
  onUpdated,
}: AssignCrewDialogProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [search, setSearch] = useState('');
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await api.get(`/organizations/${orgId}/members`);
      const data = res.data as Array<{ userId: string; username?: string; user?: { username: string } }>;
      setMembers(data.map(m => ({ userId: m.userId, username: m.username ?? m.user?.username ?? m.userId })));
    } catch {
      // ignore, member list stays empty
    }
  }, [orgId]);

  useEffect(() => {
    if (open) fetchMembers();
  }, [open, fetchMembers]);

  const assignedIds = new Set(contract.parties.map(p => p.userId));

  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase()) && !assignedIds.has(m.userId)
  );

  const handleAssign = async (member: OrgMember) => {
    try {
      setWorking(member.userId);
      setError(null);
      const party = await contractsService.addParty(contract.id, { userId: member.userId, role: 'assignee' });
      onUpdated({ ...contract, parties: [...contract.parties, party] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign member');
    } finally {
      setWorking(null);
    }
  };

  const handleRemove = async (party: ContractParty) => {
    try {
      setWorking(party.id);
      setError(null);
      await contractsService.removeParty(contract.id, party.id);
      onUpdated({ ...contract, parties: contract.parties.filter(p => p.id !== party.id) });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove party');
    } finally {
      setWorking(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', m: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonAddAltIcon sx={{ color: 'var(--brand)', width: 20, height: 20 }} />
        <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-strong)', flex: 1 }}>
          Assign crew
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1.5 }}>
        {/* Assigned list */}
        {contract.parties.length > 0 && (
          <Box mb={2}>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-faint)', mb: 1 }}>
              Assigned ({contract.parties.length})
            </Typography>
            {contract.parties.map(p => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
                <span className="ct-av" style={{ background: avColor(p.username), flexShrink: 0 }}>
                  {initials(p.username)}
                </span>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }} noWrap>{p.username}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'var(--text-faint)' }}>{p.role}</Typography>
                </Box>
                <IconButton
                  size="small"
                  disabled={working === p.id}
                  onClick={() => handleRemove(p)}
                  title="Remove"
                >
                  {working === p.id ? <CircularProgress size={14} /> : <DeleteOutlineIcon fontSize="small" />}
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* Search & add */}
        <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-faint)', mb: 1 }}>
          Add member
        </Typography>
        <TextField
          placeholder="Search members…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 1.5 }}
          autoFocus
        />
        {filtered.length === 0 && search && (
          <Typography sx={{ fontSize: 13, color: 'var(--text-faint)', py: 1 }}>No matching members</Typography>
        )}
        {filtered.map(m => (
          <Box
            key={m.userId}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75,
              cursor: 'pointer', borderRadius: 'var(--radius-sm)', px: 0.5,
              '&:hover': { background: 'var(--surface-sunken)' },
            }}
            onClick={() => handleAssign(m)}
          >
            <span className="ct-av" style={{ background: avColor(m.username), flexShrink: 0 }}>
              {initials(m.username)}
            </span>
            <Typography sx={{ flex: 1, fontSize: 13, color: 'var(--text-strong)' }} noWrap>{m.username}</Typography>
            {working === m.userId
              ? <CircularProgress size={14} />
              : <PersonAddAltIcon sx={{ width: 16, height: 16, color: 'var(--text-faint)' }} />
            }
          </Box>
        ))}

        {error && (
          <Typography sx={{ fontSize: 12, color: 'var(--coral-400)', mt: 1 }}>{error}</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <button className="btn btn-sm" onClick={onClose}>Done</button>
      </DialogActions>
    </Dialog>
  );
}
