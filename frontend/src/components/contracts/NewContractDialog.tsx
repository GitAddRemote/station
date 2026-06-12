import {
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Box,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ContractType, ContractRisk, ContractDetails } from '../../services/contracts.service';
import { contractsService } from '../../services/contracts.service';
import { CONTRACT_TYPE_META } from './contractMeta';

// ---- Milestone draft ----
interface MilestoneDraft {
  id: string;
  label: string;
}

// ---- Transfer line item ----
interface LineItem {
  id: string;
  inventoryItemId: string;
  itemName: string;
  pickupLocationId: string;
  pickupLocationName: string;
  quantity: number | '';
  availableQty: number | null;
}

export interface NewContractDialogPrefill {
  type: 'transfer';
  inventoryItemId: string;
  itemName: string;
  pickupLocationId: string;
  pickupLocationName: string;
  availableQty: number;
}

interface NewContractDialogProps {
  open: boolean;
  orgId: string;
  onClose: () => void;
  onCreated: (contractId: string) => void;
  prefill?: NewContractDialogPrefill;
}

const ALL_TYPES: ContractType[] = ['transport', 'transfer', 'mining', 'security', 'salvage', 'medical', 'refueling'];

const RISK_OPTIONS: { value: ContractRisk; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function mkId() {
  return Math.random().toString(36).slice(2, 10);
}

const STEP_LABELS = ['Type', 'Basics', 'Details', 'Review'];

export default function NewContractDialog({
  open,
  orgId,
  onClose,
  onCreated,
  prefill,
}: NewContractDialogProps) {
  const [step, setStep] = useState<number>(prefill ? 1 : 0);

  // Step 0: type
  const [selectedType, setSelectedType] = useState<ContractType>(prefill?.type ?? 'transport');

  // Step 1: shared fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState<number | ''>('');
  const [risk, setRisk] = useState<ContractRisk>('low');
  const [deadline, setDeadline] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState('Internal op');

  // Step 2: type-specific fields
  // Transport
  const [tOrigin, setTOrigin] = useState('');
  const [tOriginSub, setTOriginSub] = useState('');
  const [tDest, setTDest] = useState('');
  const [tDestSub, setTDestSub] = useState('');
  const [tCommodity, setTCommodity] = useState('');
  const [tScu, setTScu] = useState<number | ''>('');
  // Mining
  const [mCommodity, setMCommodity] = useState('');
  const [mQuota, setMQuota] = useState<number | ''>('');
  const [mLocation, setMLocation] = useState('');
  const [mRefinery, setMRefinery] = useState('');
  // Security
  const [secObjective, setSecObjective] = useState('');
  const [secThreat, setSecThreat] = useState('');
  const [secLocation, setSecLocation] = useState('');
  const [secDuration, setSecDuration] = useState('');
  // Salvage
  const [salSite, setSalSite] = useState('');
  const [salTarget, setSalTarget] = useState('');
  const [salScu, setSalScu] = useState<number | ''>('');
  const [salLocation, setSalLocation] = useState('');
  // Medical
  const [medSupplies, setMedSupplies] = useState('');
  const [medScu, setMedScu] = useState<number | ''>('');
  const [medOrigin, setMedOrigin] = useState('');
  const [medDest, setMedDest] = useState('');
  // Refueling
  const [refFuelType, setRefFuelType] = useState('');
  const [refScu, setRefScu] = useState<number | ''>('');
  const [refLocation, setRefLocation] = useState('');
  // Transfer delivery destination
  const [transferDest, setTransferDest] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (prefill) {
      return [{
        id: mkId(),
        inventoryItemId: prefill.inventoryItemId,
        itemName: prefill.itemName,
        pickupLocationId: prefill.pickupLocationId,
        pickupLocationName: prefill.pickupLocationName,
        quantity: 0,
        availableQty: prefill.availableQty,
      }];
    }
    return [{ id: mkId(), inventoryItemId: '', itemName: '', pickupLocationId: '', pickupLocationName: '', quantity: 0, availableQty: null }];
  });

  // Milestones
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    { id: mkId(), label: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setStep(prefill ? 1 : 0);
    setSelectedType(prefill?.type ?? 'transport');
    setTitle(''); setDescription(''); setReward(''); setRisk('low');
    setDeadline(''); setClientName(''); setClientType('Internal op');
    setTOrigin(''); setTOriginSub(''); setTDest(''); setTDestSub(''); setTCommodity(''); setTScu('');
    setMCommodity(''); setMQuota(''); setMLocation(''); setMRefinery('');
    setSecObjective(''); setSecThreat(''); setSecLocation(''); setSecDuration('');
    setSalSite(''); setSalTarget(''); setSalScu(''); setSalLocation('');
    setMedSupplies(''); setMedScu(''); setMedOrigin(''); setMedDest('');
    setRefFuelType(''); setRefScu(''); setRefLocation('');
    setTransferDest('');
    setLineItems(prefill ? [{
      id: mkId(), inventoryItemId: prefill.inventoryItemId,
      itemName: prefill.itemName, pickupLocationId: prefill.pickupLocationId,
      pickupLocationName: prefill.pickupLocationName, quantity: 0,
      availableQty: prefill.availableQty,
    }] : [{ id: mkId(), inventoryItemId: '', itemName: '', pickupLocationId: '', pickupLocationName: '', quantity: 0, availableQty: null }]);
    setMilestones([{ id: mkId(), label: '' }]);
    setSubmitting(false); setSubmitError(null); setStep1Errors({});
  }, [prefill]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!clientName.trim()) errs.clientName = 'Client name is required';
    setStep1Errors(errs);
    return Object.keys(errs).length === 0;
  };

  const typeDetails = useMemo((): ContractDetails => {
    switch (selectedType) {
      case 'transport': return { commodity: tCommodity, scu: Number(tScu) || 0, origin: tOrigin, originSub: tOriginSub, dest: tDest, destSub: tDestSub };
      case 'mining': return { commodity: mCommodity, quota: Number(mQuota) || 0, location: mLocation, refinery: mRefinery };
      case 'security': return { objective: secObjective, threat: secThreat, location: secLocation, duration: secDuration };
      case 'salvage': return { site: salSite, target: salTarget, targetScu: Number(salScu) || 0, location: salLocation };
      case 'medical': return { supplies: medSupplies, scu: Number(medScu) || 0, origin: medOrigin, dest: medDest };
      case 'refueling': return { fuelType: refFuelType, scu: Number(refScu) || 0, location: refLocation };
      case 'transfer': return { deliveryLocation: transferDest, lineItems: lineItems.map(li => ({ inventoryItemId: li.inventoryItemId, itemName: li.itemName, pickupLocationId: li.pickupLocationId, quantity: Number(li.quantity) || 0 })) };
      default: return {};
    }
  }, [selectedType, tCommodity, tScu, tOrigin, tOriginSub, tDest, tDestSub, mCommodity, mQuota, mLocation, mRefinery, secObjective, secThreat, secLocation, secDuration, salSite, salTarget, salScu, salLocation, medSupplies, medScu, medOrigin, medDest, refFuelType, refScu, refLocation, transferDest, lineItems]);

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(s + 1, 3));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async (publish: boolean) => {
    if (!validateStep1()) { setStep(1); return; }
    const filledMilestones = milestones.filter(m => m.label.trim());
    if (filledMilestones.length === 0 && publish) {
      setSubmitError('Add at least one milestone before publishing.');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      const contract = await contractsService.createContract({
        orgId,
        type: selectedType,
        title: title.trim(),
        description: description.trim() || undefined,
        risk,
        reward: Number(reward) || 0,
        deadline: deadline || undefined,
        clientName: clientName.trim(),
        clientType: clientType.trim(),
        details: typeDetails,
      });
      if (publish) {
        await contractsService.publishContract(contract.id);
      }
      resetForm();
      onCreated(contract.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create contract';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const addLineItem = () => setLineItems(prev => [...prev, { id: mkId(), inventoryItemId: '', itemName: '', pickupLocationId: '', pickupLocationName: '', quantity: 0, availableQty: null }]);
  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(li => li.id !== id));
  const updateLineItem = (id: string, changes: Partial<LineItem>) => setLineItems(prev => prev.map(li => li.id === id ? { ...li, ...changes } : li));

  const addMilestone = () => setMilestones(prev => [...prev, { id: mkId(), label: '' }]);
  const removeMilestone = (id: string) => setMilestones(prev => prev.filter(m => m.id !== id));
  const updateMilestone = (id: string, label: string) => setMilestones(prev => prev.map(m => m.id === id ? { ...m, label } : m));

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', m: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-strong)' }}>
            New contract
          </Typography>
          {/* Step indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
            {STEP_LABELS.map((label, idx) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  color: idx === step ? 'var(--brand)' : idx < step ? 'var(--success-500)' : 'var(--text-faint)',
                }}>
                  <Box sx={{
                    width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: idx === step ? 'var(--brand-subtle)' : 'transparent',
                    border: `1.5px solid ${idx === step ? 'var(--brand)' : idx < step ? 'var(--success-500)' : 'var(--border-default)'}`,
                  }}>
                    {idx < step ? '✓' : idx + 1}
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: idx === step ? 600 : 400 }}>{label}</Typography>
                </Box>
                {idx < STEP_LABELS.length - 1 && (
                  <Box sx={{ width: 20, height: 1, background: 'var(--border-subtle)' }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={submitting}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }} dividers>
        {/* Step 0: Type selector */}
        {step === 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1.5 }}>
            {ALL_TYPES.map((type) => {
              const meta = CONTRACT_TYPE_META[type];
              const Icon = meta.Icon;
              return (
                <Box
                  key={type}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedType(type)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedType(type); }}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    p: 2, borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: `2px solid ${selectedType === type ? 'var(--brand)' : 'var(--border-default)'}`,
                    background: selectedType === type ? 'var(--brand-subtle)' : 'var(--surface-sunken)',
                    transition: 'all 120ms ease',
                    '&:hover': { borderColor: 'var(--border-strong)' },
                    '&:focus-visible': { outline: '2px solid var(--brand)', outlineOffset: 2 },
                  }}
                >
                  <Box className={`big-ic ${meta.cls}`} sx={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', display: 'grid', placeItems: 'center' }}>
                    <Icon sx={{ width: 20, height: 20 }} />
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--text-strong)', textAlign: 'center', lineHeight: 1.2 }}>
                    {meta.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Step 1: Shared fields */}
        {step === 1 && (
          <Stack spacing={2}>
            <TextField
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={!!step1Errors.title}
              helperText={step1Errors.title}
              fullWidth size="small"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth size="small" multiline rows={3}
            />
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Reward (aUEC)"
                value={reward}
                onChange={(e) => { const n = Number(e.target.value); setReward(Number.isNaN(n) ? '' : n); }}
                type="number"
                size="small"
                inputProps={{ min: 0 }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Risk"
                value={risk}
                onChange={(e) => setRisk(e.target.value as ContractRisk)}
                select size="small" sx={{ flex: 1 }}
              >
                {RISK_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField
              label="Deadline (optional)"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              type="datetime-local"
              size="small" fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Client name *"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                error={!!step1Errors.clientName}
                helperText={step1Errors.clientName}
                size="small" sx={{ flex: 1 }}
              />
              <TextField
                label="Client type"
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
                size="small" sx={{ flex: 1 }}
              />
            </Stack>
          </Stack>
        )}

        {/* Step 2: Type-specific fields */}
        {step === 2 && (
          <Stack spacing={2}>
            {selectedType === 'transport' && (
              <>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Origin location" value={tOrigin} onChange={e => setTOrigin(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Origin sub-location" value={tOriginSub} onChange={e => setTOriginSub(e.target.value)} size="small" sx={{ flex: 1 }} />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Destination" value={tDest} onChange={e => setTDest(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Destination sub" value={tDestSub} onChange={e => setTDestSub(e.target.value)} size="small" sx={{ flex: 1 }} />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Commodity" value={tCommodity} onChange={e => setTCommodity(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="SCU" value={tScu} onChange={e => setTScu(Number(e.target.value) || '')} type="number" inputProps={{ min: 0 }} size="small" sx={{ flex: 1 }} />
                </Stack>
              </>
            )}
            {selectedType === 'mining' && (
              <>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Commodity" value={mCommodity} onChange={e => setMCommodity(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Quota (SCU)" value={mQuota} onChange={e => setMQuota(Number(e.target.value) || '')} type="number" inputProps={{ min: 0 }} size="small" sx={{ flex: 1 }} />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Mining location" value={mLocation} onChange={e => setMLocation(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Refinery" value={mRefinery} onChange={e => setMRefinery(e.target.value)} size="small" sx={{ flex: 1 }} />
                </Stack>
              </>
            )}
            {selectedType === 'security' && (
              <>
                <TextField label="Objective" value={secObjective} onChange={e => setSecObjective(e.target.value)} size="small" fullWidth />
                <TextField label="Threat" value={secThreat} onChange={e => setSecThreat(e.target.value)} size="small" fullWidth />
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Location" value={secLocation} onChange={e => setSecLocation(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Duration" value={secDuration} onChange={e => setSecDuration(e.target.value)} size="small" sx={{ flex: 1 }} />
                </Stack>
              </>
            )}
            {selectedType === 'salvage' && (
              <>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Site" value={salSite} onChange={e => setSalSite(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Target materials" value={salTarget} onChange={e => setSalTarget(e.target.value)} size="small" sx={{ flex: 1 }} />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Est. volume (SCU)" value={salScu} onChange={e => setSalScu(Number(e.target.value) || '')} type="number" inputProps={{ min: 0 }} size="small" sx={{ flex: 1 }} />
                  <TextField label="Location" value={salLocation} onChange={e => setSalLocation(e.target.value)} size="small" sx={{ flex: 1 }} />
                </Stack>
              </>
            )}
            {selectedType === 'medical' && (
              <>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Supplies" value={medSupplies} onChange={e => setMedSupplies(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="SCU" value={medScu} onChange={e => setMedScu(Number(e.target.value) || '')} type="number" inputProps={{ min: 0 }} size="small" sx={{ flex: 1 }} />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Origin" value={medOrigin} onChange={e => setMedOrigin(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <TextField label="Destination" value={medDest} onChange={e => setMedDest(e.target.value)} size="small" sx={{ flex: 1 }} />
                </Stack>
              </>
            )}
            {selectedType === 'refueling' && (
              <>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="Fuel type" value={refFuelType} onChange={e => setRefFuelType(e.target.value)} select size="small" sx={{ flex: 1 }}>
                    {['Hydrogen', 'Quantum'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </TextField>
                  <TextField label="SCU" value={refScu} onChange={e => setRefScu(Number(e.target.value) || '')} type="number" inputProps={{ min: 0 }} size="small" sx={{ flex: 1 }} />
                </Stack>
                <TextField label="Location" value={refLocation} onChange={e => setRefLocation(e.target.value)} size="small" fullWidth />
              </>
            )}
            {selectedType === 'transfer' && (
              <>
                <TextField
                  label="Deliver all items to"
                  value={transferDest}
                  onChange={e => setTransferDest(e.target.value)}
                  size="small" fullWidth
                  helperText="Shared delivery destination for all line items"
                />
                <Box>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', mb: 1 }}>
                    Line items
                  </Typography>
                  <Stack spacing={1.5}>
                    {lineItems.map((li, idx) => (
                      <Box key={li.id} sx={{ p: 1.5, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography sx={{ fontSize: 12, color: 'var(--text-faint)' }}>Item {idx + 1}</Typography>
                          {lineItems.length > 1 && (
                            <IconButton size="small" onClick={() => removeLineItem(li.id)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                        <Stack spacing={1}>
                          <TextField
                            label="Item / commodity"
                            value={li.itemName}
                            onChange={e => updateLineItem(li.id, { itemName: e.target.value })}
                            size="small" fullWidth
                          />
                          <TextField
                            label="Pickup location"
                            value={li.pickupLocationName}
                            onChange={e => updateLineItem(li.id, { pickupLocationName: e.target.value })}
                            size="small" fullWidth
                          />
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <Box sx={{ flex: 1 }}>
                              <TextField
                                label="Quantity"
                                value={li.quantity}
                                onChange={e => {
                                  const n = Number(e.target.value);
                                  const max = li.availableQty ?? Infinity;
                                  updateLineItem(li.id, { quantity: Number.isNaN(n) ? '' : Math.min(n, max) });
                                }}
                                type="number"
                                inputProps={{ min: 1, max: li.availableQty ?? undefined }}
                                size="small" fullWidth
                                error={typeof li.quantity === 'number' && li.quantity <= 0}
                                helperText={li.availableQty != null ? `${li.availableQty} available at ${li.pickupLocationName || 'selected location'}` : ''}
                              />
                            </Box>
                            {li.availableQty != null && (
                              <button
                                className="btn btn-sm"
                                style={{ marginTop: 8, whiteSpace: 'nowrap' }}
                                onClick={() => updateLineItem(li.id, { quantity: li.availableQty! })}
                              >
                                Add all
                              </button>
                            )}
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                  <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={addLineItem}>
                    <AddIcon style={{ width: 14, height: 14 }} /> Add line item
                  </button>
                </Box>
              </>
            )}

            {/* Milestones (shown on step 2 for all types) */}
            <Box>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', mb: 1 }}>
                Milestones <span style={{ color: 'var(--text-faint)', fontWeight: 400, textTransform: 'none' }}>(at least 1 required to publish)</span>
              </Typography>
              <Stack spacing={1}>
                {milestones.map((m, idx) => (
                  <Stack key={m.id} direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 18 }}>{idx + 1}.</Typography>
                    <TextField
                      value={m.label}
                      onChange={e => updateMilestone(m.id, e.target.value)}
                      placeholder={`Milestone ${idx + 1}`}
                      size="small" sx={{ flex: 1 }}
                    />
                    {milestones.length > 1 && (
                      <IconButton size="small" onClick={() => removeMilestone(m.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                ))}
              </Stack>
              <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={addMilestone}>
                <AddIcon style={{ width: 14, height: 14 }} /> Add milestone
              </button>
            </Box>
          </Stack>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Stack spacing={2}>
            <Box sx={{ p: 2, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }}>
              <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-strong)', mb: 0.5 }}>{title}</Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--text-faint)' }}>
                {CONTRACT_TYPE_META[selectedType].label} · {clientName} · {risk} risk
                {reward ? ` · ${Number(reward).toLocaleString()} aUEC` : ''}
              </Typography>
              {description && <Typography sx={{ fontSize: 13, color: 'var(--text-muted)', mt: 1 }}>{description}</Typography>}
            </Box>
            <Box>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-faint)', mb: 0.75 }}>Milestones ({milestones.filter(m => m.label.trim()).length})</Typography>
              {milestones.filter(m => m.label.trim()).map((m, i) => (
                <Typography key={m.id} sx={{ fontSize: 13, color: 'var(--text-muted)', py: 0.25 }}>{i + 1}. {m.label}</Typography>
              ))}
              {milestones.filter(m => m.label.trim()).length === 0 && (
                <Typography sx={{ fontSize: 12, color: 'var(--coral-400)' }}>No milestones — contract will be saved as draft only.</Typography>
              )}
            </Box>
            {submitError && (
              <Box sx={{ p: 2, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--coral-500) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--coral-500) 25%, transparent)', color: 'var(--coral-400)', fontSize: 13 }}>
                {submitError}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 2, gap: 1 }}>
        <button className="btn btn-sm" onClick={handleClose} disabled={submitting} style={{ marginRight: 'auto' }}>
          Cancel
        </button>
        {step > 0 && (
          <button className="btn btn-sm" onClick={handleBack} disabled={submitting}>
            Back
          </button>
        )}
        {step < 3 ? (
          <button className="btn btn-primary btn-sm" onClick={handleNext}>
            Next
          </button>
        ) : (
          <>
            <button
              className="btn btn-sm"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={14} /> : 'Save draft'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleSubmit(true)}
              disabled={submitting || milestones.filter(m => m.label.trim()).length === 0}
            >
              {submitting ? <CircularProgress size={14} /> : 'Publish'}
            </button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
