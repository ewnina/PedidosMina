export interface User {
  userId: string;
  email: string;
  role: string;
  providerId: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface Provider {
  id: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAccount {
  id: string;
  providerId: string;
  email: string;
  role: string;
  fullName: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface CreateProviderDto {
  name: string;
  phoneNumber: string;
}

export interface CreateAccountDto {
  providerId: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export interface DashboardStats {
  totalProviders: number;
  activeProviders: number;
  totalAccounts: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
}
