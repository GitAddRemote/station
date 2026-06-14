/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { api } from '../services/api.service';

export interface OrgEntry {
  id: string;
  name: string;
  slug: string;
  role: string;
  priority: number;
}

interface OrgContextValue {
  orgs: OrgEntry[];
  activeOrg: OrgEntry | null;
  userId: string | null;
  setActiveOrg: (org: OrgEntry) => void;
  reorderOrgs: (orderedIds: string[]) => Promise<void>;
  loading: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  orgs: [],
  activeOrg: null,
  userId: null,
  setActiveOrg: () => {},
  reorderOrgs: async () => {},
  loading: true,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<OrgEntry[]>([]);
  const [activeOrg, setActiveOrgState] = useState<OrgEntry | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profileRes = await api.get('/users/profile');
        const uid: string = profileRes.data.userId ?? profileRes.data.id;
        if (cancelled) return;
        setUserId(uid);

        const orgsRes = await api.get<Array<{
          organizationId: string;
          orgPriority: number;
          organization: { id: string; name: string; slug: string };
          role: { name: string };
        }>>(`/user-organization-roles/user/${uid}/organizations`);
        if (cancelled) return;

        const seen = new Set<string>();
        const entries: OrgEntry[] = [];
        for (const row of orgsRes.data) {
          if (!row.organization?.id || seen.has(row.organization.id)) continue;
          seen.add(row.organization.id);
          entries.push({
            id: row.organization.id,
            name: row.organization.name,
            slug: row.organization.slug ?? '',
            role: row.role?.name ?? 'Member',
            priority: row.orgPriority ?? 0,
          });
        }
        // already sorted by priority from backend, but defensively sort here too
        entries.sort((a, b) => a.priority - b.priority);
        setOrgs(entries);

        // Restore last active org from localStorage, fallback to #1 priority
        const saved = localStorage.getItem('station-active-org');
        const match = entries.find((e) => e.id === saved) ?? entries[0] ?? null;
        setActiveOrgState(match);
      } catch {
        // ignore — shell renders without org context
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setActiveOrg = useCallback((org: OrgEntry) => {
    setActiveOrgState(org);
    try { localStorage.setItem('station-active-org', org.id); } catch { /* ignore */ }
  }, []);

  const reorderOrgs = useCallback(async (orderedIds: string[]) => {
    if (!userId) return;
    // Optimistically update local state
    setOrgs((prev) => {
      const byId = new Map(prev.map((o) => [o.id, o]));
      return orderedIds
        .map((id, i) => byId.has(id) ? { ...byId.get(id)!, priority: i } : null)
        .filter(Boolean) as OrgEntry[];
    });
    await api.patch(`/user-organization-roles/user/${userId}/org-priorities`, {
      orderedOrgIds: orderedIds,
    });
  }, [userId]);

  return (
    <OrgContext.Provider value={{ orgs, activeOrg, userId, setActiveOrg, reorderOrgs, loading }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
