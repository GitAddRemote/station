import { api } from './api.service';

// ---- Contract type constants ----
export type ContractType = 'transport' | 'security' | 'mining' | 'salvage' | 'transfer' | 'medical' | 'refueling';
export type ContractStatus = 'draft' | 'open' | 'claimed' | 'active' | 'completed' | 'disputed' | 'cancelled';
export type ContractRisk = 'low' | 'med' | 'high';

// ---- Entity types ----
export interface ContractMilestone {
  id: string;
  contractId: string;
  label: string;
  state: 'pending' | 'active' | 'done';
  sortOrder: number;
}

export interface ContractParty {
  id: string;
  contractId: string;
  userId: string;
  username: string;
  role: string;
}

export interface Contract {
  id: string;
  displayId: string;
  type: ContractType;
  title: string;
  description: string | null;
  status: ContractStatus;
  risk: ContractRisk;
  reward: number;
  deadline: string | null;
  clientName: string;
  clientType: string;
  orgId: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  milestones: ContractMilestone[];
  parties: ContractParty[];
  // type-specific details stored as JSONB
  details: ContractDetails;
}

// Type-specific detail shapes
export interface TransportDetails {
  commodity: string;
  scu: number;
  origin: string;
  originSub: string;
  dest: string;
  destSub: string;
}

export interface SecurityDetails {
  objective: string;
  threat: string;
  location: string;
  duration: string;
}

export interface MiningDetails {
  commodity: string;
  quota: number;
  location: string;
  refinery: string;
}

export interface SalvageDetails {
  site: string;
  target: string;
  targetScu: number;
  location: string;
}

export interface TransferDetails {
  asset: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
}

export interface MedicalDetails {
  supplies: string;
  scu: number;
  origin: string;
  dest: string;
}

export interface RefuelingDetails {
  fuelType: string;
  scu: number;
  location: string;
}

export type ContractDetails =
  | TransportDetails
  | SecurityDetails
  | MiningDetails
  | SalvageDetails
  | TransferDetails
  | MedicalDetails
  | RefuelingDetails
  | Record<string, unknown>;

// ---- Request/Response types ----
export interface PaginatedContracts {
  data: Contract[];
  total: number;
  page: number;
  limit: number;
}

export interface GetContractsParams {
  orgId: string;
  type?: string;
  status?: string[];
  page?: number;
  limit?: number;
  assignedToMe?: boolean;
}

export interface CreateContractDto {
  orgId: string;
  type: ContractType;
  title: string;
  description?: string;
  risk: ContractRisk;
  reward: number;
  deadline?: string;
  clientName: string;
  clientType: string;
  details?: ContractDetails;
}

export interface UpdateContractDto {
  title?: string;
  description?: string;
  risk?: ContractRisk;
  reward?: number;
  deadline?: string;
  clientName?: string;
  clientType?: string;
  details?: ContractDetails;
}

// ---- Service ----
export const contractsService = {
  async getContracts(params: GetContractsParams): Promise<PaginatedContracts> {
    const query: Record<string, string | number | boolean | string[]> = {
      orgId: params.orgId,
    };
    if (params.type) query.type = params.type;
    if (params.status && params.status.length > 0) query.status = params.status;
    if (params.page !== undefined) query.page = params.page;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.assignedToMe !== undefined) query.assignedToMe = params.assignedToMe;

    const response = await api.get('/api/contracts', { params: query });
    return response.data;
  },

  async getContract(id: string): Promise<Contract> {
    const response = await api.get(`/api/contracts/${id}`);
    return response.data;
  },

  async createContract(data: CreateContractDto): Promise<Contract> {
    const response = await api.post('/api/contracts', data);
    return response.data;
  },

  async updateContract(id: string, data: UpdateContractDto): Promise<Contract> {
    const response = await api.patch(`/api/contracts/${id}`, data);
    return response.data;
  },

  async publishContract(id: string): Promise<Contract> {
    const response = await api.post(`/api/contracts/${id}/publish`);
    return response.data;
  },

  async claimContract(id: string): Promise<Contract> {
    const response = await api.post(`/api/contracts/${id}/claim`);
    return response.data;
  },

  async startContract(id: string): Promise<Contract> {
    const response = await api.post(`/api/contracts/${id}/start`);
    return response.data;
  },

  async completeContract(id: string): Promise<Contract> {
    const response = await api.post(`/api/contracts/${id}/complete`);
    return response.data;
  },

  async disputeContract(id: string): Promise<Contract> {
    const response = await api.post(`/api/contracts/${id}/dispute`);
    return response.data;
  },

  async cancelContract(id: string): Promise<Contract> {
    const response = await api.post(`/api/contracts/${id}/cancel`);
    return response.data;
  },

  async updateMilestone(
    contractId: string,
    milestoneId: string,
    state: string,
  ): Promise<ContractMilestone> {
    const response = await api.patch(
      `/api/contracts/${contractId}/milestones/${milestoneId}`,
      { state },
    );
    return response.data;
  },

  async addParty(
    contractId: string,
    data: { userId: string; role: string },
  ): Promise<ContractParty> {
    const response = await api.post(`/api/contracts/${contractId}/parties`, data);
    return response.data;
  },

  async removeParty(contractId: string, partyId: string): Promise<void> {
    await api.delete(`/api/contracts/${contractId}/parties/${partyId}`);
  },
};
