import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.service';
import '../../pages/Contracts.css';
import {
  type ContractType,
  type TypeDetails,
  defaultDetails,
  buildDetailsPayload,
  TypeSpecificFields,
} from './contractTypeFields';

type AssigneeKind = 'open' | 'member' | 'division';

interface Org { id: string; name: string; }
interface OrgMember { userId: string; username: string; }
interface Division { id: string; name: string; kind: string; }

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
  const [divisions, setDivisions] = useState<Division[]>([]);
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
  const [assigneeDivisionId, setAssigneeDivisionId] = useState('');
  const [itemQty, setItemQty] = useState<string>(inventoryItem ? String(inventoryItem.quantity) : '');
  const [details, setDetails] = useState<TypeDetails>(() => defaultDetails(initialType));


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
    if (!orgId) { setMembers([]); setDivisions([]); return; }
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

    api.get<Array<{ id: string; name: string; kind: string; parentId: string | null }>>(`/api/organizations/${orgId}/business-units`)
      .then((r) => {
        const topLevel = Array.isArray(r.data) ? r.data.filter((u) => !u.parentId) : [];
        setDivisions(topLevel);
      })
      .catch(() => setDivisions([]));
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
      } else if (assigneeKind === 'division' && assigneeDivisionId) {
        await api.post(`/api/contracts/${res.data.id}/parties`, { businessUnitId: assigneeDivisionId, role: 'assignee' });
      }
      onCreated();
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  }, [title, type, orgId, donation, rewardAuec, deadline, description, assigneeKind, assigneeUserId, assigneeDivisionId, details, inventoryItem, itemQty, onCreated, onClose]);

  const canSubmit =
    !saving && title.trim() && orgId &&
    (assigneeKind !== 'member' || assigneeUserId) &&
    (assigneeKind !== 'division' || assigneeDivisionId);

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
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
              <select className="field-input" value={type} onChange={(e) => { const t = e.target.value as ContractType; setType(t); setDetails(defaultDetails(t)); }}>
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
                onChange={(e) => { setOrgId(e.target.value); setAssigneeUserId(''); setAssigneeDivisionId(''); }}
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
                      onChange={() => { setAssigneeKind(k); setAssigneeUserId(''); setAssigneeDivisionId(''); }}
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
                  value={assigneeDivisionId}
                  onChange={(e) => setAssigneeDivisionId(e.target.value)}
                  required
                >
                  <option value="">{divisions.length === 0 ? 'No divisions found' : 'Select division…'}</option>
                  {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
