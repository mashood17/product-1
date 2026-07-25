import { createCrudApi } from "./crud-factory";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../lib/api-client";
import type {
  CategoryCreate,
  CategoryOut,
  CategoryUpdate,
  MenuItemCreate,
  MenuItemOut,
  MenuItemUpdate,
  SpecialCreate,
  SpecialOut,
  SpecialUpdate,
  EventPackageCreate,
  EventPackageOut,
  EventPackageUpdate,
  GalleryItemCreate,
  GalleryItemOut,
  GalleryItemUpdate,
  ReviewCreate,
  ReviewOut,
  ReviewUpdate,
  Page,
  SiteContentOut,
  SettingOut,
  DashboardStats,
  MediaOut,
  MediaUploadResponse,
  VideoGalleryOut,
  VideoGalleryUpdate,
  AdminOut,
  AdminCreateRequest,
  AdminUpdateRequest,
  HeroBackgroundOut,
  HeroSlot,
  OfferOut,
  OfferCreate,
  OfferUpdate,
  OfferRegistrationOut,
  OfferRegistrationRedeem,
} from "../types/api";

// Re-export a local alias so this file's imports stay self-documenting
// without adding a real export named ListParamsShape to types/api.ts.
type ListParamsShape = Record<string, string | number | boolean | undefined>;

export const categoriesApi = createCrudApi<CategoryOut, CategoryCreate, CategoryUpdate>("/admin/categories");
export const menuItemsApi = createCrudApi<MenuItemOut, MenuItemCreate, MenuItemUpdate>("/admin/menu-items");
export const specialsApi = createCrudApi<SpecialOut, SpecialCreate, SpecialUpdate>("/admin/specials");
export const eventPackagesApi = createCrudApi<EventPackageOut, EventPackageCreate, EventPackageUpdate>(
  "/admin/event-packages",
);
export const galleryApi = createCrudApi<GalleryItemOut, GalleryItemCreate, GalleryItemUpdate>("/admin/gallery");

export const reviewsApi = {
  list: (params?: ListParamsShape) => apiGet<Page<ReviewOut>>("/admin/reviews", { params }),
  create: (payload: ReviewCreate) => apiPost<ReviewOut>("/admin/reviews", payload),
  update: (id: string, payload: ReviewUpdate) => apiPatch<ReviewOut>(`/admin/reviews/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/admin/reviews/${id}`),
};

// Site content (Homepage CMS): list all keys, get/put by key.
export const siteContentApi = {
  list: () => apiGet<SiteContentOut[]>("/admin/site-content"),
  get: (key: string) => apiGet<SiteContentOut>(`/admin/site-content/${key}`),
  upsert: (key: string, value: unknown) => apiPut<SiteContentOut>(`/admin/site-content/${key}`, { value }),
};

// Settings: same list/put-by-key pattern.
export const settingsApi = {
  list: () => apiGet<SettingOut[]>("/admin/settings"),
  upsert: (key: string, value: unknown) => apiPut<SettingOut>(`/admin/settings/${key}`, { value }),
};

export const dashboardApi = {
  stats: () => apiGet<DashboardStats>("/admin/dashboard/stats"),
};

export const mediaApi = {
  list: (params?: { bucket?: string; limit?: number; offset?: number }) =>
    apiGet<Page<MediaOut>>("/admin/media", { params }),
  upload: (file: File, bucket: string, altText: string | undefined, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("bucket", bucket);
    if (altText) form.append("alt_text", altText);
    form.append("file", file);
    return apiPost<MediaUploadResponse>("/admin/media/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },
  remove: (id: string) => apiDelete<void>(`/admin/media/${id}`),
};

// Hero Background: one video (+ optional poster) per slot (desktop/mobile),
// replaced in place on re-upload — not a list-CRUD resource, so this isn't
// built on createCrudApi.
export const heroBackgroundsApi = {
  list: () => apiGet<HeroBackgroundOut[]>("/admin/hero-backgrounds"),
  uploadVideo: (slot: HeroSlot, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return apiPost<HeroBackgroundOut>(`/admin/hero-backgrounds/${slot}/video`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },
  uploadPoster: (slot: HeroSlot, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiPost<HeroBackgroundOut>(`/admin/hero-backgrounds/${slot}/poster`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  remove: (slot: HeroSlot) => apiDelete<void>(`/admin/hero-backgrounds/${slot}`),
};

// Offers: small list (rarely more than a handful), so no pagination — same
// shape as usersApi. Activate/deactivate are dedicated endpoints (not a
// plain field PATCH) because the backend enforces "only one active offer"
// server-side when they're called.
export const offersApi = {
  list: () => apiGet<OfferOut[]>("/admin/offers"),
  create: (payload: OfferCreate) => apiPost<OfferOut>("/admin/offers", payload),
  update: (id: string, payload: OfferUpdate) => apiPatch<OfferOut>(`/admin/offers/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/admin/offers/${id}`),
  activate: (id: string) => apiPost<OfferOut>(`/admin/offers/${id}/activate`, {}),
  deactivate: (id: string) => apiPost<OfferOut>(`/admin/offers/${id}/deactivate`, {}),
};

export const offerRegistrationsApi = {
  search: (params?: ListParamsShape) => apiGet<Page<OfferRegistrationOut>>("/admin/offer-registrations", { params }),
  redeem: (id: string, payload: OfferRegistrationRedeem) =>
    apiPost<OfferRegistrationOut>(`/admin/offer-registrations/${id}/redeem`, payload),
};

// Video Gallery: up to five admin-uploaded showcase clips, shown on the
// public homepage in place of the removed Instagram feed. Replacing a
// video's file keeps its row/position — only create() can evict the oldest
// entry once six exist (see elato-backend/app/services/video_gallery_service.py).
export const videoGalleryApi = {
  list: () => apiGet<VideoGalleryOut[]>("/admin/video-gallery"),
  create: (
    file: File,
    caption: string | undefined,
    instagramUrl: string | undefined,
    onProgress?: (pct: number) => void,
    signal?: AbortSignal,
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (caption) form.append("caption", caption);
    if (instagramUrl) form.append("instagram_url", instagramUrl);
    return apiPost<VideoGalleryOut>("/admin/video-gallery", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
      signal,
    });
  },
  updateDetails: (id: string, payload: VideoGalleryUpdate) => apiPatch<VideoGalleryOut>(`/admin/video-gallery/${id}`, payload),
  replaceVideo: (id: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return apiPost<VideoGalleryOut>(`/admin/video-gallery/${id}/video`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },
  remove: (id: string) => apiDelete<void>(`/admin/video-gallery/${id}`),
};

export const usersApi = {
  list: () => apiGet<AdminOut[]>("/admin/users"),
  create: (payload: AdminCreateRequest) => apiPost<AdminOut>("/admin/users", payload),
  update: (id: string, payload: AdminUpdateRequest) => apiPatch<AdminOut>(`/admin/users/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/admin/users/${id}`),
};
