import { useState, useEffect, useCallback } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AppShell from '../components/AppShell';
import { api } from '../services/api.service';
import {
  businessUnitsService,
  type BusinessUnitNode,
  type BusinessUnitKind,
} from '../services/business-units.service';
import './BusinessUnits.css';

const KIND_LABELS: Record<BusinessUnitKind, string> = {
  division:   'Division',
  department: 'Department',
  team:       'Team',
  squad:      'Squad',
  wing:       'Wing',
  custom:     'Custom',
};

const ALL_KINDS: BusinessUnitKind[] = ['division', 'department', 'team', 'squad', 'wing', 'custom'];

// ---- flatten tree for parent picker ----
function flattenTree(nodes: BusinessUnitNode[], depth = 0): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    result.push({ id: n.id, label: `${'—'.repeat(depth)} ${n.name}` });
    result.push(...flattenTree(n.children, depth + 1));
  }
  return result;
}

// ---- collect all descendant ids ----
function descendantIds(node: BusinessUnitNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: BusinessUnitNode) => { ids.add(n.id); n.children.forEach(walk); };
  node.children.forEach(walk);
  return ids;
}

// ---- Modal ----
interface ModalProps {
  orgId: string;
  tree: BusinessUnitNode[];
  editing: BusinessUnitNode | null;
  parentPreset: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function BusinessUnitModal({ orgId, tree, editing, parentPreset, onClose, onSaved }: ModalProps) {
  const [name, setName]           = useState(editing?.name ?? '');
  const [kind, setKind]           = useState<BusinessUnitKind>(editing?.kind ?? 'division');
  const [parentId, setParentId]   = useState<string>(editing?.parentId ?? parentPreset ?? '');
  const [description, setDesc]    = useState(editing?.description ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const flatOptions = flattenTree(tree);
  const excluded = editing ? descendantIds(editing) : new Set<string>();
  const parentOptions = flatOptions.filter((o) => o.id !== editing?.id && !excluded.has(o.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const dto = {
        name: name.trim(),
        kind,
        parentId: parentId || null,
        description: description.trim() || null,
      };
      if (editing) {
        await businessUnitsService.update(orgId, editing.id, dto);
      } else {
        await businessUnitsService.create(orgId, dto);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box bu-modal">
        <div className="modal-head">
          <span className="modal-title">{editing ? 'Edit business unit' : 'New business unit'}</span>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="bu-error">{error}</div>}

            <div className="field-row">
              <label className="field-label">Name *</label>
              <input
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alpha Squadron"
                required
                maxLength={128}
                autoFocus
              />
            </div>

            <div className="field-row">
              <label className="field-label">Kind *</label>
              <select className="field-input" value={kind} onChange={(e) => setKind(e.target.value as BusinessUnitKind)}>
                {ALL_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
              </select>
            </div>

            <div className="field-row">
              <label className="field-label">Parent</label>
              <select className="field-input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— None (top-level) —</option>
                {parentOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <label className="field-label">Description</label>
              <textarea
                className="field-input"
                rows={3}
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Optional description…"
                maxLength={1000}
              />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : (editing ? 'Save changes' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Delete confirm ----
interface DeleteConfirmProps {
  node: BusinessUnitNode;
  orgId: string;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirm({ node, orgId, onClose, onDeleted }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);
  const childCount = node.children.length;

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await businessUnitsService.remove(orgId, node.id);
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box bu-modal">
        <div className="modal-head">
          <span className="modal-title">Delete "{node.name}"?</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {childCount > 0 ? (
            <p className="bu-confirm-msg">
              This unit has <strong>{childCount} child unit{childCount !== 1 ? 's' : ''}</strong>.
              They will be promoted to its parent level.
            </p>
          ) : (
            <p className="bu-confirm-msg">This action cannot be undone.</p>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Tree row ----
interface TreeRowProps {
  node: BusinessUnitNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAdd: (parentId: string) => void;
  onEdit: (node: BusinessUnitNode) => void;
  onDelete: (node: BusinessUnitNode) => void;
}

function TreeRow({ node, depth, expanded, onToggle, onAdd, onEdit, onDelete }: TreeRowProps) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <tr className={`bu-row bu-depth-${Math.min(depth, 6)}`}>
        <td className="bu-cell-name">
          <div className="bu-name-wrap" style={{ paddingLeft: depth * 20 }}>
            <button
              className="bu-expand-btn"
              onClick={() => onToggle(node.id)}
              aria-label={isOpen ? 'Collapse' : 'Expand'}
              style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
            >
              {isOpen ? <ExpandMoreIcon style={{ width: 16, height: 16 }} /> : <ChevronRightIcon style={{ width: 16, height: 16 }} />}
            </button>
            <span className="bu-name">{node.name}</span>
            {!node.isActive && <span className="chip chip-neutral bu-inactive-chip">Inactive</span>}
          </div>
        </td>
        <td className="bu-cell-kind">
          <span className={`bu-kind-badge bu-kind-${node.kind}`}>{KIND_LABELS[node.kind]}</span>
        </td>
        <td className="bu-cell-desc">{node.description ?? ''}</td>
        <td className="bu-cell-actions">
          <button className="btn-icon bu-action-btn" title="Add child" onClick={() => onAdd(node.id)}>
            <AddIcon style={{ width: 15, height: 15 }} />
          </button>
          <button className="btn-icon bu-action-btn" title="Edit" onClick={() => onEdit(node)}>
            <EditIcon style={{ width: 15, height: 15 }} />
          </button>
          <button className="btn-icon bu-action-btn bu-action-delete" title="Delete" onClick={() => onDelete(node)}>
            <DeleteIcon style={{ width: 15, height: 15 }} />
          </button>
        </td>
      </tr>
      {isOpen && node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

// ---- Page ----
export default function BusinessUnits() {
  const [orgId, setOrgId]         = useState<string | null>(null);
  const [tree, setTree]           = useState<BusinessUnitNode[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [modal, setModal]         = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing]     = useState<BusinessUnitNode | null>(null);
  const [parentPreset, setParent] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<BusinessUnitNode | null>(null);

  useEffect(() => {
    api.get('/users/profile').then((r) => {
      const uid = r.data.userId ?? r.data.id;
      return api.get<Array<{ organization: { id: string } }>>(`/user-organization-roles/user/${uid}/organizations`);
    }).then((r) => {
      const first = r.data?.[0]?.organization?.id ?? null;
      setOrgId(first);
    }).catch(() => {});
  }, []);

  const fetchTree = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    businessUnitsService.getAll(orgId)
      .then(setTree)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  // expand all by default on first load
  useEffect(() => {
    if (tree.length === 0) return;
    const ids = new Set<string>();
    const walk = (nodes: BusinessUnitNode[]) => nodes.forEach((n) => { ids.add(n.id); walk(n.children); });
    walk(tree);
    setExpanded(ids);
  }, [tree.length > 0 ? tree[0].id : '']);

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const openAdd = (pid: string | null = null) => {
    setEditing(null);
    setParent(pid);
    setModal('add');
  };

  const openEdit = (node: BusinessUnitNode) => {
    setEditing(node);
    setParent(null);
    setModal('edit');
  };

  const totalCount = (() => {
    let n = 0;
    const walk = (nodes: BusinessUnitNode[]) => nodes.forEach((nd) => { n++; walk(nd.children); });
    walk(tree);
    return n;
  })();

  return (
    <AppShell active="hr" searchPlaceholder="Search members, units…">
      <div className="bu-page">
        <div className="bu-header">
          <div className="bu-header-copy">
            <div className="bu-eyebrow"><AccountTreeIcon style={{ width: 14, height: 14 }} /> Organization structure</div>
            <h1 className="bu-title">Business Units</h1>
            <p className="bu-sub">Divisions, departments, teams, and squads — arranged in a hierarchy.</p>
          </div>
          <div className="bu-header-actions">
            <button className="btn btn-primary btn-sm" onClick={() => openAdd()}>
              <AddIcon /> Add unit
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bu-empty">Loading…</div>
        ) : tree.length === 0 ? (
          <div className="bu-empty">
            <AccountTreeIcon style={{ width: 40, height: 40, opacity: 0.3 }} />
            <p>No business units yet. Create your first division or team.</p>
            <button className="btn btn-primary btn-sm" onClick={() => openAdd()}>
              <AddIcon /> Add unit
            </button>
          </div>
        ) : (
          <div className="bu-table-wrap">
            <div className="bu-table-meta">{totalCount} unit{totalCount !== 1 ? 's' : ''}</div>
            <table className="bu-table">
              <thead>
                <tr>
                  <th className="bu-th-name">Name</th>
                  <th className="bu-th-kind">Kind</th>
                  <th className="bu-th-desc">Description</th>
                  <th className="bu-th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {tree.map((node) => (
                  <TreeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggle}
                    onAdd={(pid) => openAdd(pid)}
                    onEdit={openEdit}
                    onDelete={setDeleting}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(modal === 'add' || modal === 'edit') && orgId && (
        <BusinessUnitModal
          orgId={orgId}
          tree={tree}
          editing={modal === 'edit' ? editing : null}
          parentPreset={parentPreset}
          onClose={() => setModal(null)}
          onSaved={fetchTree}
        />
      )}

      {deleting && orgId && (
        <DeleteConfirm
          node={deleting}
          orgId={orgId}
          onClose={() => setDeleting(null)}
          onDeleted={fetchTree}
        />
      )}
    </AppShell>
  );
}
