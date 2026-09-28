export type WorkOrderStatus =
  | "RECEIVED"
  | "DIAGNOSING"
  | "WAITING_PARTS"
  | "REPAIRING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiValidationErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  details?: ApiValidationErrorDetail[];
}

export interface AccountPublic {
  id: string;
  ownerName: string;
  email: string;
}

export interface WorkshopPublic {
  id: string;
  name: string;
  address: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

export interface AuthResponse {
  account: AccountPublic;
  workshop: WorkshopPublic;
  tokens: AuthTokens;
}

export interface RefreshResponse {
  tokens: AuthTokens;
}

export interface MeResponse {
  account: AccountPublic;
  workshop: WorkshopPublic;
}

export interface RegisterInput {
  ownerName: string;
  email: string;
  password: string;
  workshopName: string;
  workshopAddress: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
}

export type UpdateClientInput = Partial<CreateClientInput>;

export interface Device {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  color: string | null;
  physicalCondition: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceInput {
  clientId: string;
  brand: string;
  model: string;
  serialNumber?: string;
  color?: string;
  physicalCondition: string;
}

export type UpdateDeviceInput = Partial<CreateDeviceInput>;

export interface WorkOrder {
  id: string;
  deviceId: string;
  number: string;
  reportedIssue: string;
  diagnosis: string | null;
  workPerformed: string | null;
  status: WorkOrderStatus;
  estimatedBudget: string | null;
  finalPrice: string | null;
  receivedAt: string;
  estimatedAt: string | null;
  deliveredAt: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkOrderInput {
  deviceId: string;
  reportedIssue: string;
  diagnosis?: string;
  workPerformed?: string;
  estimatedBudget?: number;
  finalPrice?: number;
  receivedAt?: string;
  estimatedAt?: string;
  notes?: string;
}

export type UpdateWorkOrderInput = Partial<Omit<CreateWorkOrderInput, "deviceId" | "receivedAt">>;

export interface UpdateWorkOrderStatusInput {
  status: WorkOrderStatus;
}

export interface WorkOrderQuery extends PaginationQuery {
  status?: WorkOrderStatus;
  clientId?: string;
  deviceId?: string;
  from?: string;
  to?: string;
}
