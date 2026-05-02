// Auto-generated types — regenerate after running migrations:
// npx supabase gen types typescript --project-id fkuervgtbqyjhqoullmd > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ListingStatus = 'draft' | 'live' | 'paused' | 'archived';
export type BookingMode = 'event' | 'reservation' | 'slot' | 'pass' | 'rsvp';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
export type TicketStatus = 'valid' | 'used' | 'voided';
export type FriendStatus = 'pending' | 'accepted' | 'declined';
export type KycStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_host: boolean;
  is_admin: boolean;
  paystack_customer_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface HostProfile {
  user_id: string;
  slug: string;
  bio: string | null;
  hero_url: string | null;
  city: string | null;
  paystack_subaccount_code: string | null;
  kyc_status: KycStatus;
  payout_bank_json: Json | null;
  response_rate: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  template: Json;
  created_at: string;
}

export interface Listing {
  id: string;
  host_id: string;
  category_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  status: ListingStatus;
  booking_mode: BookingMode;
  base_price_kobo: number;
  currency: string;
  capacity: number | null;
  duration_min: number | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  amenities: string[];
  cover_url: string | null;
  attributes: Json;
  compliance: Json;
  blocks: Json;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface TicketType {
  id: string;
  listing_id: string;
  name: string;
  description: string | null;
  price_kobo: number;
  capacity_total: number | null;
  capacity_sold: number;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  perks: string[];
  age_min: number | null;
  sort_order: number;
  transferable: boolean;
  status: 'active' | 'paused' | 'sold_out';
  created_at: string;
}

export interface Availability {
  id: string;
  listing_id: string;
  starts_at: string;
  ends_at: string;
  capacity_override: number | null;
  price_override_kobo: number | null;
  status: 'open' | 'closed' | 'sold_out';
  created_at: string;
}

export interface Booking {
  id: string;
  guest_id: string;
  listing_id: string;
  slot_id: string | null;
  ticket_type_id: string | null;
  party_size: number;
  subtotal_kobo: number;
  fee_kobo: number;
  total_kobo: number;
  payout_kobo: number;
  status: BookingStatus;
  paystack_reference: string | null;
  attested_age: boolean;
  attested_age_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  booking_id: string;
  jwt_jti: string;
  ticket_type_id: string | null;
  status: TicketStatus;
  scanned_at: string | null;
  scanned_by: string | null;
  scanned_device_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  by_user: string;
  of_listing: string | null;
  of_host: string | null;
  rating: number;
  body: string | null;
  photos: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  payload: Json;
  read_at: string | null;
  created_at: string;
}

// Supabase client Database type structure
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      host_profiles: { Row: HostProfile; Insert: Partial<HostProfile>; Update: Partial<HostProfile> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      listings: { Row: Listing; Insert: Partial<Listing>; Update: Partial<Listing> };
      ticket_types: { Row: TicketType; Insert: Partial<TicketType>; Update: Partial<TicketType> };
      availability: { Row: Availability; Insert: Partial<Availability>; Update: Partial<Availability> };
      bookings: { Row: Booking; Insert: Partial<Booking>; Update: Partial<Booking> };
      tickets: { Row: Ticket; Insert: Partial<Ticket>; Update: Partial<Ticket> };
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      listing_status: ListingStatus;
      booking_mode: BookingMode;
      booking_status: BookingStatus;
      ticket_status: TicketStatus;
      friend_status: FriendStatus;
      kyc_status: KycStatus;
    };
  };
}
