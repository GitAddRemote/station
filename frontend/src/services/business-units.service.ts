import { api } from './api.service';

export type BusinessUnitKind =
  | 'division'
  | 'department'
  | 'team'
  | 'squad'
  | 'wing'
  | 'custom';

export interface BusinessUnitNode {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  kind: BusinessUnitKind;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children: BusinessUnitNode[];
}

export interface CreateBusinessUnitDto {
  name: string;
  kind: BusinessUnitKind;
  parentId?: string | null;
  description?: string | null;
  sortOrder?: number;
}

export interface UpdateBusinessUnitDto {
  name?: string;
  kind?: BusinessUnitKind;
  parentId?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export const businessUnitsService = {
  getAll(orgId: string): Promise<BusinessUnitNode[]> {
    return api.get<BusinessUnitNode[]>(`/api/organizations/${orgId}/business-units`).then((r) => r.data);
  },
  create(orgId: string, dto: CreateBusinessUnitDto): Promise<BusinessUnitNode> {
    return api.post<BusinessUnitNode>(`/api/organizations/${orgId}/business-units`, dto).then((r) => r.data);
  },
  update(orgId: string, id: string, dto: UpdateBusinessUnitDto): Promise<BusinessUnitNode> {
    return api.patch<BusinessUnitNode>(`/api/organizations/${orgId}/business-units/${id}`, dto).then((r) => r.data);
  },
  remove(orgId: string, id: string): Promise<void> {
    return api.delete(`/api/organizations/${orgId}/business-units/${id}`).then(() => undefined);
  },
};
