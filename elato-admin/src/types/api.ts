/**
 * TypeScript mirrors of elato-backend/app/schemas/*.py. Keep field names and
 * optionality in lockstep with the Pydantic models — this file is the
 * single source of truth for every request/response shape in the app.
 */

// ---------------------------------------------------------------------------
// common.py
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// auth.py
// ---------------------------------------------------------------------------

export type AdminRole = "owner" | "admin" | "editor";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AdminOut {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
  last_login_at: string | null;
}

export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  admin: AdminOut;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface AccessTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LogoutRequest {
  refresh_token?: string | null;
  everywhere: boolean;
}

export interface AdminCreateRequest {
  email: string;
  password: string;
  role: AdminRole;
}

export interface AdminUpdateRequest {
  role?: AdminRole | null;
  password?: string | null;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ---------------------------------------------------------------------------
// category.py
// ---------------------------------------------------------------------------

export interface CategoryOut {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  slug: string;
  description?: string | null;
  image_id?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  image_id?: string | null;
  display_order?: number;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// menu_item.py
// ---------------------------------------------------------------------------

export interface MenuItemOut {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_id: string | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
}

export interface MenuItemCreate {
  category_id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  image_id?: string | null;
  is_available?: boolean;
  display_order?: number;
}

export type MenuItemUpdate = Partial<MenuItemCreate>;

// ---------------------------------------------------------------------------
// special.py
// ---------------------------------------------------------------------------

export interface SpecialOut {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  image_id: string | null;
  active_from: string | null;
  active_to: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface SpecialCreate {
  title: string;
  description?: string | null;
  price?: number | null;
  image_id?: string | null;
  active_from?: string | null;
  active_to?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export type SpecialUpdate = Partial<SpecialCreate>;

// ---------------------------------------------------------------------------
// gallery.py
// ---------------------------------------------------------------------------

export interface GalleryItemOut {
  id: string;
  media_id: string;
  category: string | null;
  caption: string | null;
  display_order: number;
  created_at: string;
  media_url: string | null;
}

export interface GalleryItemCreate {
  media_id: string;
  category?: string | null;
  caption?: string | null;
  display_order?: number;
}

export type GalleryItemUpdate = Partial<GalleryItemCreate>;

// ---------------------------------------------------------------------------
// event_package.py
// ---------------------------------------------------------------------------

export interface EventPackageOut {
  id: string;
  title: string;
  description: string | null;
  min_guests: number | null;
  max_guests: number | null;
  image_id: string | null;
  is_active: boolean;
  display_order: number;
}

export interface EventPackageCreate {
  title: string;
  description?: string | null;
  min_guests?: number | null;
  max_guests?: number | null;
  image_id?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export type EventPackageUpdate = Partial<EventPackageCreate>;

// ---------------------------------------------------------------------------
// review.py
// ---------------------------------------------------------------------------

export interface ReviewOut {
  id: string;
  source: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  is_featured: boolean;
  fetched_at: string;
}

export interface ReviewCreate {
  author_name?: string | null;
  rating?: number | null;
  text?: string | null;
  is_featured?: boolean;
  source?: string;
}

export interface ReviewUpdate {
  author_name?: string | null;
  rating?: number | null;
  text?: string | null;
  is_featured?: boolean;
}

// ---------------------------------------------------------------------------
// site_content.py / settings.py — freeform jsonb value under a fixed key
// ---------------------------------------------------------------------------

export interface SiteContentOut {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface SiteContentUpsert {
  value: unknown;
}

export interface SettingOut {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface SettingUpsert {
  value: unknown;
}

// ---------------------------------------------------------------------------
// dashboard.py
// ---------------------------------------------------------------------------

export interface RecentEventGroup {
  event_name: string;
  count: number;
  last_seen: string;
}

export interface DashboardStats {
  total_categories: number;
  total_menu_items: number;
  total_gallery_videos: number;
  total_reviews: number;
  analytics_last_30_days: Record<string, number>;
  recent_events: RecentEventGroup[];
}

// ---------------------------------------------------------------------------
// media.py
// ---------------------------------------------------------------------------

// Must match the buckets that actually exist in the live Supabase project
// (Storage → Buckets), not any aspirational list in a migration file.
export type MediaBucket =
  | "public-assets"
  | "logos"
  | "hero"
  | "gallery"
  | "categories"
  | "menu"
  | "events"
  | "stay"
  | "reviews"
  | "uploads";

export interface MediaVariant {
  url: string;
  width: number;
  height: number;
  format: string;
}

export interface MediaOut {
  id: string;
  storage_path: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  bucket: string;
  url: string;
  created_at: string;
}

export interface MediaUploadResponse {
  media: MediaOut;
  variants: MediaVariant[];
}

// ---------------------------------------------------------------------------
// hero_background.py
// ---------------------------------------------------------------------------

export type HeroSlot = "desktop" | "mobile";

export interface HeroBackgroundOut {
  slot: HeroSlot;
  video_url: string;
  video_mime: string;
  poster_url: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  file_size_bytes: number;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// offer.py / offer_registration.py
// ---------------------------------------------------------------------------

export interface OfferOut {
  id: string;
  name: string;
  description: string | null;
  reward_text: string;
  scratch_reveal_text: string | null;
  popup_heading: string;
  button_text: string;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfferCreate {
  name: string;
  description?: string | null;
  reward_text: string;
  scratch_reveal_text?: string | null;
  popup_heading?: string;
  button_text?: string;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean;
}

export type OfferUpdate = Partial<OfferCreate>;

export type OfferRegistrationStatus = "pending" | "redeemed";

export interface OfferRegistrationOut {
  id: string;
  offer_id: string | null;
  offer_name: string;
  name: string;
  country_code: string;
  phone_number: string;
  consent: boolean;
  source: string | null;
  status: OfferRegistrationStatus;
  redeemed_at: string | null;
  redeemed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface OfferRegistrationRedeem {
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// video_gallery.py
// ---------------------------------------------------------------------------

export interface VideoGalleryOut {
  id: string;
  video_url: string;
  video_mime: string;
  file_size_bytes: number;
  caption: string | null;
  instagram_url: string | null;
  created_at: string;
}

export interface VideoGalleryUpdate {
  caption?: string | null;
  instagram_url?: string | null;
}

// ---------------------------------------------------------------------------
// API error envelope — every error response, no exceptions.
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
