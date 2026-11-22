export type Role = 'customer' | 'barber' | 'admin';
export type AppointmentStatus = 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface ShopSettings {
  id: number;
  name: string;
  timezone: string;
  currency: string;
  slot_minutes: number;
  min_notice_minutes: number;
  max_days_ahead: number;
  phone: string | null;
  address: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: Role;
  created_at: string;
}

export interface Barber {
  id: string;
  profile_id: string | null;
  name: string;
  bio: string | null;
  photo_url: string | null;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number;
  active: boolean;
}

export interface WorkingHour {
  id?: number;
  barber_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  barber_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  service?: Pick<Service, 'name' | 'duration_min' | 'price_cents'> | null;
  barber?: Pick<Barber, 'name'> | null;
  customer?: Pick<Profile, 'full_name' | 'phone' | 'email'> | null;
}
