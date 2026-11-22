export type Role = 'customer' | 'barber' | 'admin';
export type AccountType = 'person' | 'organization';
export type OrderStatus = 'open' | 'accepted' | 'completed' | 'cancelled';

export interface PlatformSettings {
  id: number;
  name: string;
  currency: string;
  commission_percent: number;
  support_phone: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: Role;
  account_type: AccountType;
  org_name: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sort: number;
  active: boolean;
}

export interface Worker {
  profile_id: string;
  display_name: string;
  city: string | null;
  bio: string | null;
  category_ids: string[];
  hourly_rate: number | null;
  jobs_done: number;
  active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_type: AccountType;
  org_name: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  address: string;
  city: string | null;
  starts_at: string;
  duration_hours: number;
  contact_phone: string;
  price: number;
  currency: string;
  commission_percent: number;
  platform_fee: number;
  worker_payout: number;
  status: OrderStatus;
  worker_id: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  category?: Pick<Category, 'name' | 'icon'> | null;
  customer?: Pick<Profile, 'full_name' | 'phone'> | null;
  worker?: Pick<Profile, 'full_name' | 'phone'> | null;
}
