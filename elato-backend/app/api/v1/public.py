"""
Every endpoint here is unauthenticated and reads through repositories that
only ever select active/public rows — mirrors the RLS policies in migration
0001 so the backend and the database agree on what "public" means.
"""

from fastapi import APIRouter, Query, Request, Response

from app.core.exceptions import NotFoundError
from app.repositories import (
    category_repository,
    enquiry_repository,
    event_package_repository,
    gallery_repository,
    hero_background_repository,
    menu_item_repository,
    review_repository,
    room_repository,
    settings_repository,
    site_content_repository,
    special_repository,
    video_gallery_repository,
)
from app.repositories import analytics_repository
from app.services import hero_video_service, media_service, offer_registration_service, offer_service, video_gallery_service
from app.schemas.analytics_event import AnalyticsEventCreate
from app.schemas.category import CategoryOut
from app.schemas.enquiry import EnquiryCreate, EnquiryOut
from app.schemas.event_package import EventPackageOut
from app.schemas.gallery import GalleryItemOut
from app.schemas.hero_background import HeroBackgroundOut
from app.schemas.menu_item import MenuItemOut
from app.schemas.offer import ActiveOfferOut
from app.schemas.offer_registration import OfferRegistrationCreate, OfferRegistrationOut
from app.schemas.review import ReviewAggregateOut, ReviewOut
from app.schemas.room import RoomOut
from app.schemas.site_content import SiteContentOut
from app.schemas.special import SpecialOut
from app.schemas.video_gallery import VideoGalleryOut

router = APIRouter(prefix="", tags=["public"])


@router.get("/maintenance-status")
def get_maintenance_status() -> dict[str, bool]:
    # No cache header — a maintenance toggle must take effect on the next
    # page load, not be held behind a CDN/browser TTL.
    try:
        flags = settings_repository.get("feature_flags")["value"]
    except NotFoundError:
        return {"enabled": False}
    return {"enabled": bool(isinstance(flags, dict) and flags.get("maintenance_mode"))}


@router.get("/site-content", response_model=list[SiteContentOut])
def list_site_content(response: Response):
    # All admin-managed section content (hero/services/about images, etc.) in
    # one request so the public site can resolve every slot from a single map
    # rather than one call per key. Values are already public — the per-key
    # endpoint below exposes the same data — and change rarely, so a short
    # browser/CDN cache is safe.
    response.headers["Cache-Control"] = "public, max-age=60"
    return [SiteContentOut(**row) for row in site_content_repository.list_all()]


@router.get("/site-content/{key}", response_model=SiteContentOut)
def get_site_content(key: str):
    return SiteContentOut(**site_content_repository.get(key))


@router.get("/hero-backgrounds", response_model=list[HeroBackgroundOut])
def list_hero_backgrounds():
    # No cache header, deliberately — same reasoning as /video-gallery: a
    # freshly uploaded hero video must appear on the very next page load,
    # not stay hidden behind a browser/CDN TTL. (Previously cached for 300s,
    # which was the actual cause of "upload finishes but video takes minutes
    # to show up" — the encode pipeline itself was never the bottleneck.)
    return [hero_video_service.to_schema(row) for row in hero_background_repository.list_all()]


@router.get("/offers/active", response_model=ActiveOfferOut | None)
def get_active_offer():
    # No cache header — an admin flipping the active offer should be
    # reflected on the next popup immediately, not held behind a CDN TTL.
    offer = offer_service.get_active_offer()
    return ActiveOfferOut(**offer) if offer else None


@router.get("/offers/active/claim-status")
def get_active_offer_claim_status(visitor_id: str) -> dict[str, bool]:
    return {"claimed": offer_registration_service.has_visitor_claimed_active_offer(visitor_id)}


@router.post("/offers/register", response_model=OfferRegistrationOut, status_code=201)
def register_for_offer(payload: OfferRegistrationCreate):
    fields = payload.model_dump(mode="json")
    row = offer_registration_service.register_for_active_offer(**fields)
    return OfferRegistrationOut(**row)


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(response: Response):
    # Admin-managed, changes rarely — same cadence as site-content/gallery below.
    response.headers["Cache-Control"] = "public, max-age=300"
    # Each row carries an embedded media(storage_path, bucket) join — resolve it
    # to the optimized public URL so the Celebré frontend gets a usable image.
    out = []
    for row in category_repository.list_public():
        image_url = media_service.pop_embedded_media_url(row)
        out.append(CategoryOut(**row, image_url=image_url))
    return out


@router.get("/menu-items", response_model=list[MenuItemOut])
def list_menu_items(response: Response, category_id: str | None = None, is_available: bool | None = None):
    # Shorter than categories/gallery — availability toggles are the one
    # thing here an admin would plausibly want to reflect within a minute.
    response.headers["Cache-Control"] = "public, max-age=60"
    out = []
    for row in menu_item_repository.list_public(category_id, is_available):
        image_url = media_service.pop_embedded_media_url(row)
        out.append(MenuItemOut(**row, image_url=image_url))
    return out


@router.get("/specials", response_model=list[SpecialOut])
def list_specials(response: Response):
    # Date-windowed activation — same reasoning as menu-items above.
    response.headers["Cache-Control"] = "public, max-age=60"
    out = []
    for row in special_repository.list_public():
        image_url = media_service.pop_embedded_media_url(row)
        out.append(SpecialOut(**row, image_url=image_url))
    return out


@router.get("/gallery", response_model=list[GalleryItemOut])
def list_gallery(response: Response, category: str | None = None):
    response.headers["Cache-Control"] = "public, max-age=300"
    out = []
    for row in gallery_repository.list_public(category):
        media_srcset = media_service.pop_embedded_media_srcset(row)
        media_url = media_service.pop_embedded_media_url(row)
        out.append(GalleryItemOut(**row, media_url=media_url, media_srcset=media_srcset))
    return out


@router.get("/event-packages", response_model=list[EventPackageOut])
def list_event_packages(response: Response):
    response.headers["Cache-Control"] = "public, max-age=300"
    return event_package_repository.list_public()


@router.get("/rooms", response_model=list[RoomOut])
def list_rooms(response: Response):
    response.headers["Cache-Control"] = "public, max-age=300"
    return room_repository.list_public()


@router.get("/reviews/featured", response_model=list[ReviewOut])
def list_featured_reviews(response: Response):
    # Admin-curated set changes rarely — same cache cadence as the aggregate
    # rating below, and the one homepage public endpoint that was missing it.
    response.headers["Cache-Control"] = "public, max-age=300"
    return review_repository.list_featured()


@router.get("/reviews/aggregate", response_model=ReviewAggregateOut)
def get_reviews_aggregate(response: Response):
    # Business-wide rating/count changes rarely — safe to cache briefly
    # rather than hit Supabase on every homepage load.
    response.headers["Cache-Control"] = "public, max-age=300"
    return review_repository.get_aggregate()


@router.get("/video-gallery", response_model=list[VideoGalleryOut])
def list_video_gallery():
    # No cache header, deliberately — same reasoning as /offers/active: a
    # deleted/replaced video must disappear from the public site on the very
    # next load, not stay visible for up to 5 minutes behind a browser/CDN TTL.
    return [video_gallery_service.to_schema(row) for row in video_gallery_repository.list_all()]


@router.post("/enquiries", response_model=EnquiryOut, status_code=201)
def create_enquiry(payload: EnquiryCreate):
    fields = payload.model_dump(mode="json", exclude_none=False)
    row = enquiry_repository.create(fields)
    if row.get("preferred_date"):
        row["preferred_date"] = str(row["preferred_date"])
    return EnquiryOut(**row)


@router.post("/analytics/events", status_code=204)
def create_analytics_event(payload: AnalyticsEventCreate, request: Request):
    # Fire-and-forget from the frontend's point of view: we still validate
    # and persist, but never return anything that could make a caller think
    # a failure here should block the UI.
    analytics_repository.create(payload.model_dump())
