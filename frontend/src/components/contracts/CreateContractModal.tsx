import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.service';
import '../../pages/Contracts.css';

type ContractType = 'transport' | 'transfer' | 'mining' | 'security' | 'salvage' | 'medical' | 'refueling';
type AssigneeKind = 'open' | 'member' | 'division';

interface Org { id: string; name: string; }
interface OrgMember { userId: string; username: string; }

const TYPE_LABELS: Record<ContractType, string> = {
  transport: 'Transport',
  transfer:  'Transfer',
  mining:    'Mining',
  security:  'Security',
  salvage:   'Salvage',
  medical:   'Medical',
  refueling: 'Refueling',
};

function twoWeeksFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 16);
}

interface InventoryItemProp {
  id: string;
  itemName: string;
  quantity: number;
  catalogEntryId: string;
  itemSubtype: 'item' | 'commodity' | 'vehicle';
}

interface TransportDetails {
  pickupLocationId: string;
  pickupLocationName: string;
  deliveryLocationName: string;
  cargoDescription: string;
  scuRequired: string;
}

interface MiningDetails {
  targetSystem: string;
  targetBody: string;
  resourceType: string;
  targetScu: string;
  miningMethod: 'hand' | 'vehicle' | 'ship' | '';
}

interface SecurityDetails {
  missionKind: 'escort' | 'patrol' | 'base-defense' | '';
  areaDescription: string;
  threatLevel: 'low' | 'medium' | 'high' | '';
  headCount: string;
}

interface SalvageDetails {
  targetLocation: string;
  scuEstimate: string;
  salvageKind: 'wreck' | 'recycle' | 'tow' | '';
}

interface MedicalDetails {
  serviceKind: 'rescue' | 'trauma' | 'support' | '';
  locationDescription: string;
  patientCount: string;
}

interface RefuelingDetails {
  fuelType: 'hydrogen' | 'quantum' | '';
  scuRequired: string;
  locationDescription: string;
}

type TypeDetails =
  | TransportDetails
  | MiningDetails
  | SecurityDetails
  | SalvageDetails
  | MedicalDetails
  | RefuelingDetails
  | Record<string, never>;

function defaultDetails(type: ContractType): TypeDetails {
  switch (type) {
    case 'transport':
      return { pickupLocationId: '', pickupLocationName: '', deliveryLocationName: '', cargoDescription: '', scuRequired: '' };
    case 'mining':
      return { targetSystem: '', targetBody: '', resourceType: '', targetScu: '', miningMethod: '' };
    case 'security':
      return { missionKind: '', areaDescription: '', threatLevel: '', headCount: '' };
    case 'salvage':
      return { targetLocation: '', scuEstimate: '', salvageKind: '' };
    case 'medical':
      return { serviceKind: '', locationDescription: '', patientCount: '' };
    case 'refueling':
      return { fuelType: '', scuRequired: '', locationDescription: '' };
    default:
      return {};
  }
}

function buildDetailsPayload(type: ContractType, details: TypeDetails): Record<string, unknown> | null {
  const entries = Object.entries(details).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (entries.length === 0) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    out[k] = v;
  }
  if (type === 'transport' || type === 'mining' || type === 'salvage' || type === 'refueling') {
    const numKeys = ['scuRequired', 'targetScu', 'scuEstimate'];
    for (const key of numKeys) {
      if (key in out && out[key] !== '') out[key] = parseFloat(out[key] as string);
    }
  }
  if (type === 'security' && 'headCount' in out && out['headCount'] !== '') {
    out['headCount'] = parseInt(out['headCount'] as string, 10);
  }
  if (type === 'medical' && 'patientCount' in out && out['patientCount'] !== '') {
    out['patientCount'] = parseInt(out['patientCount'] as string, 10);
  }
  return out;
}

function TypeSpecificFields({
  type,
  details,
  onChange,
}: {
  type: ContractType;
  details: TypeDetails;
  onChange: (next: TypeDetails) => void;
}) {
  function set(key: string, value: string) {
    onChange({ ...details, [key]: value } as TypeDetails);
  }

  if (type === 'transfer') return null;

  if (type === 'transport') {
    const d = details as TransportDetails;
    return (
      <>
        <div className="field-row">
          <label className="field-label">Pickup location name</label>
          <input className="field-input" type="text" value={d.pickupLocationName} onChange={(e) => set('pickupLocationName', e.target.value)} placeholder="e.g. Port Olisar" />
        </div>
        <div className="field-row">
          <label className="field-label">Delivery location name</label>
          <input className="field-input" type="text" value={d.deliveryLocationName} onChange={(e) => set('deliveryLocationName', e.target.value)} placeholder="e.g. Area 18" />
        </div>
        <div className="field-row">
          <label className="field-label">Cargo description</label>
          <input className="field-input" type="text" value={d.cargoDescription} onChange={(e) => set('cargoDescription', e.target.value)} placeholder="e.g. Medical supplies" />
        </div>
        <div className="field-row">
          <label className="field-label">SCU required</label>
          <input className="field-input" type="number" min="0" step="0.001" value={d.scuRequired} onChange={(e) => set('scuRequired', e.target.value)} placeholder="0" />
        </div>
      </>
    );
  }

  if (type === 'mining') {
    const d = details as MiningDetails;
    return (
      <>
        <div className="field-row">
          <label className="field-label">Target system</label>
          <input className="field-input" type="text" value={d.targetSystem} onChange={(e) => set('targetSystem', e.target.value)} placeholder="e.g. Stanton" />
        </div>
        <div className="field-row">
          <label className="field-label">Target body</label>
          <input className="field-input" type="text" value={d.targetBody} onChange={(e) => set('targetBody', e.target.value)} placeholder="e.g. Yela" />
        </div>
        <div className="field-row">
          <label className="field-label">Resource type</label>
          <input className="field-input" type="text" value={d.resourceType} onChange={(e) => set('resourceType', e.target.value)} placeholder="e.g. Quantanium" />
        </div>
        <div className="field-row">
          <label className="field-label">Target SCU</label>
          <input className="field-input" type="number" min="0" step="0.001" value={d.targetScu} onChange={(e) => set('targetScu', e.target.value)} placeholder="0" />
        </div>
        <div className="field-row">
          <label className="field-label">Mining method</label>
          <select className="field-input" value={d.miningMethod} onChange={(e) => set('miningMethod', e.target.value)}>
            <option value="">— unspecified —</option>
            <option value="hand">Hand mining</option>
            <option value="vehicle">Vehicle</option>
            <option value="ship">Ship</option>
          </select>
        </div>
      </>
    );
  }

  if (type === 'security') {
    const d = details as SecurityDetails;
    return (
      <>
        <div className="field-row">
          <label className="field-label">Mission kind</label>
          <select className="field-input" value={d.missionKind} onChange={(e) => set('missionKind', e.target.value)}>
            <option value="">— unspecified —</option>
            <option value="escort">Escort</option>
            <option value="patrol">Patrol</option>
            <option value="base-defense">Base defense</option>
          </select>
        </div>
        <div className="field-row">
          <label className="field-label">Area description</label>
          <input className="field-input" type="text" value={d.areaDescription} onChange={(e) => set('areaDescription', e.target.value)} placeholder="e.g. Convoy route A18 → Lorville" />
        </div>
        <div className="field-row">
          <label className="field-label">Threat level</label>
          <select className="field-input" value={d.threatLevel} onChange={(e) => set('threatLevel', e.target.value)}>
            <option value="">— unspecified —</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="field-row">
          <label className="field-label">Head count</label>
          <input className="field-input" type="number" min="1" step="1" value={d.headCount} onChange={(e) => set('headCount', e.target.value)} placeholder="1" />
        </div>
      </>
    );
  }

  if (type === 'salvage') {
    const d = details as SalvageDetails;
    return (
      <>
        <div className="field-row">
          <label className="field-label">Target location</label>
          <input className="field-input" type="text" value={d.targetLocation} onChange={(e) => set('targetLocation', e.target.value)} placeholder="e.g. Derelict Reclaimer near Yela" />
        </div>
        <div className="field-row">
          <label className="field-label">SCU estimate</label>
          <input className="field-input" type="number" min="0" step="0.001" value={d.scuEstimate} onChange={(e) => set('scuEstimate', e.target.value)} placeholder="0" />
        </div>
        <div className="field-row">
          <label className="field-label">Salvage kind</label>
          <select className="field-input" value={d.salvageKind} onChange={(e) => set('salvageKind', e.target.value)}>
            <option value="">— unspecified —</option>
            <option value="wreck">Wreck salvage</option>
            <option value="recycle">Recycle</option>
            <option value="tow">Tow</option>
          </select>
        </div>
      </>
    );
  }

  if (type === 'medical') {
    const d = details as MedicalDetails;
    return (
      <>
        <div className="field-row">
          <label className="field-label">Service kind</label>
          <select className="field-input" value={d.serviceKind} onChange={(e) => set('serviceKind', e.target.value)}>
            <option value="">— unspecified —</option>
            <option value="rescue">Rescue</option>
            <option value="trauma">Trauma</option>
            <option value="support">Support</option>
          </select>
        </div>
        <div className="field-row">
          <label className="field-label">Location description</label>
          <input className="field-input" type="text" value={d.locationDescription} onChange={(e) => set('locationDescription', e.target.value)} placeholder="e.g. Moon surface, Cellin" />
        </div>
        <div className="field-row">
          <label className="field-label">Patient count</label>
          <input className="field-input" type="number" min="1" step="1" value={d.patientCount} onChange={(e) => set('patientCount', e.target.value)} placeholder="1" />
        </div>
      </>
    );
  }

  if (type === 'refueling') {
    const d = details as RefuelingDetails;
    return (
      <>
        <div className="field-row">
          <label className="field-label">Fuel type</label>
          <select className="field-input" value={d.fuelType} onChange={(e) => set('fuelType', e.target.value)}>
            <option value="">— unspecified —</option>
            <option value="hydrogen">Hydrogen</option>
            <option value="quantum">Quantum</option>
          </select>
        </div>
        <div className="field-row">
          <label className="field-label">SCU required</label>
          <input className="field-input" type="number" min="0" step="0.001" value={d.scuRequired} onChange={(e) => set('scuRequired', e.target.value)} placeholder="0" />
        </div>
        <div className="field-row">
          <label className="field-label">Location description</label>
          <input className="field-input" type="text" value={d.locationDescription} onChange={(e) => set('locationDescription', e.target.value)} placeholder="e.g. Near Lagrange point" />
        </div>
      </>
    );
  }

  return null;
}

interface CreateContractModalProps {
  onClose: () => void;
  onCreated: () => void;
  initialType?: ContractType;
  initialTitle?: string;
  inventoryItem?: InventoryItemProp;
}

export default function CreateContractModal({ onClose, onCreated, initialType = 'transfer', initialTitle = '', inventoryItem }: CreateContractModalProps) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(initialTitle);
  const [type, setType] = useState<ContractType>(initialType);
  const [orgId, setOrgId] = useState('');
  const [donation, setDonation] = useState(false);
  const [rewardAuec, setRewardAuec] = useState('');
  const [deadline, setDeadline] = useState(twoWeeksFromNow());
  const [description, setDescription] = useState('');
  const [assigneeKind, setAssigneeKind] = useState<AssigneeKind>('open');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [assigneeOrgId, setAssigneeOrgId] = useState('');
  const [itemQty, setItemQty] = useState<string>(inventoryItem ? String(inventoryItem.quantity) : '');
  const [details, setDetails] = useState<TypeDetails>(() => defaultDetails(initialType));

  useEffect(() => {
    setDetails(defaultDetails(type));
  }, [type]);

  useEffect(() => {
    api.get('/users/profile').then((r) => {
      const uid = r.data.userId ?? r.data.id;
      if (!uid) return;
      return api.get<Array<{ organization: Org }>>(`/user-organization-roles/user/${uid}/organizations`)
        .then((r2) => {
          const seen = new Set<string>();
          const list = Array.isArray(r2.data)
            ? r2.data
                .map((row) => row.organization)
                .filter((o) => o && !seen.has(o.id) && seen.add(o.id))
            : [];
          setOrgs(list);
          if (list.length > 0) setOrgId(list[0].id);
        });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!orgId) { setMembers([]); return; }
    setMembersLoading(true);
    api.get<Array<{ user: { id: string; username: string } }>>(`/user-organization-roles/organization/${orgId}/members`)
      .then((r) => {
        const list = Array.isArray(r.data)
          ? r.data.map((row) => ({ userId: row.user?.id, username: row.user?.username })).filter((m) => m.userId)
          : [];
        setMembers(list as OrgMember[]);
      })
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [orgId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const detailsPayload = buildDetailsPayload(type, details);
      const body: Record<string, unknown> = {
        title,
        type,
        orgId,
        rewardAuec: donation ? 0 : (rewardAuec ? parseFloat(rewardAuec) : null),
        ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
        ...(description ? { description } : {}),
        ...(detailsPayload ? { details: detailsPayload } : {}),
      };
      if (inventoryItem) {
        const qty = parseFloat(itemQty);
        body.items = [{
          itemSubtype: inventoryItem.itemSubtype,
          inventoryItemId: inventoryItem.id,
          catalogEntryId: inventoryItem.catalogEntryId,
          quantity: isNaN(qty) ? inventoryItem.quantity : qty,
        }];
      }
      const res = await api.post<{ id: string }>('/api/contracts', body);
      if (assigneeKind === 'member' && assigneeUserId) {
        await api.post(`/api/contracts/${res.data.id}/parties`, { userId: assigneeUserId, role: 'assignee' });
      } else if (assigneeKind === 'division' && assigneeOrgId) {
        await api.post(`/api/contracts/${res.data.id}/parties`, { orgId: assigneeOrgId, role: 'assignee' });
      }
      onCreated();
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  }, [title, type, orgId, donation, rewardAuec, deadline, description, assigneeKind, assigneeUserId, assigneeOrgId, details, inventoryItem, itemQty, onCreated, onClose]);

  const canSubmit =
    !saving && title.trim() && orgId &&
    (assigneeKind !== 'member' || assigneeUserId) &&
    (assigneeKind !== 'division' || assigneeOrgId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">New contract</span>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            <div className="field-row">
              <label className="field-label">Title *</label>
              <input
                className="field-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contract title"
                required
                maxLength={255}
                autoFocus
              />
            </div>

            <div className="field-row">
              <label className="field-label">Type *</label>
              <select className="field-input" value={type} onChange={(e) => setType(e.target.value as ContractType)}>
                {(Object.keys(TYPE_LABELS) as ContractType[]).map((v) => (
                  <option key={v} value={v}>{TYPE_LABELS[v]}</option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <label className="field-label">Organization *</label>
              <select
                className="field-input"
                value={orgId}
                onChange={(e) => { setOrgId(e.target.value); setAssigneeUserId(''); setAssigneeOrgId(''); }}
                required
              >
                {orgs.length === 0 && <option value="">No organizations found</option>}
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            <div className="field-row">
              <label className="field-label">Assignee</label>
              <div className="assignee-radios">
                {(['open', 'member', 'division'] as AssigneeKind[]).map((k) => (
                  <label key={k} className={`assignee-radio${assigneeKind === k ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="assigneeKind"
                      value={k}
                      checked={assigneeKind === k}
                      onChange={() => { setAssigneeKind(k); setAssigneeUserId(''); setAssigneeOrgId(''); }}
                    />
                    {k === 'open' ? 'Open — anyone can claim' : k === 'member' ? 'Specific member' : 'Division'}
                  </label>
                ))}
              </div>
              {assigneeKind === 'member' && (
                <select
                  className="field-input"
                  value={assigneeUserId}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                  required
                >
                  <option value="">{membersLoading ? 'Loading members…' : 'Select member…'}</option>
                  {members.map((m) => <option key={m.userId} value={m.userId}>{m.username}</option>)}
                </select>
              )}
              {assigneeKind === 'division' && (
                <select
                  className="field-input"
                  value={assigneeOrgId}
                  onChange={(e) => setAssigneeOrgId(e.target.value)}
                  required
                >
                  <option value="">Select division…</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              )}
            </div>

            <div className="field-row">
              <label className="field-label">Reward (aUEC)</label>
              <label className="donation-toggle">
                <input
                  type="checkbox"
                  checked={donation}
                  onChange={(e) => { setDonation(e.target.checked); if (e.target.checked) setRewardAuec('0'); }}
                />
                Donation — no reward (amount will be set to 0)
              </label>
              <input
                className="field-input"
                type="number"
                min="0"
                step="0.01"
                value={donation ? '0' : rewardAuec}
                disabled={donation}
                onChange={(e) => setRewardAuec(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="field-row">
              <label className="field-label">Deadline</label>
              <input
                className="field-input"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="field-row">
              <label className="field-label">Description</label>
              <textarea
                className="field-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description…"
              />
            </div>

            <TypeSpecificFields type={type} details={details} onChange={setDetails} />

            {inventoryItem && (
              <>
                <div className="field-row">
                  <label className="field-label">Item</label>
                  <input
                    className="field-input"
                    type="text"
                    value={inventoryItem.itemName}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="field-row">
                  <label className="field-label">Quantity to contract</label>
                  <input
                    className="field-input"
                    type="number"
                    min="0.000001"
                    step="any"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    placeholder={String(inventoryItem.quantity)}
                  />
                </div>
              </>
            )}

          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!canSubmit}>
              {saving ? 'Creating…' : 'Create contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
