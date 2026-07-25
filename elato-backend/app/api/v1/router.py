from fastapi import APIRouter

from app.api.v1 import (
    admin_categories,
    admin_dashboard,
    admin_event_packages,
    admin_gallery,
    admin_hero_backgrounds,
    admin_media,
    admin_menu_items,
    admin_offer_registrations,
    admin_offers,
    admin_reviews,
    admin_rooms,
    admin_settings,
    admin_site_content,
    admin_specials,
    admin_users,
    admin_video_gallery,
    auth,
    public,
    sync,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(public.router)
api_router.include_router(admin_categories.router)
api_router.include_router(admin_menu_items.router)
api_router.include_router(admin_specials.router)
api_router.include_router(admin_gallery.router)
api_router.include_router(admin_event_packages.router)
api_router.include_router(admin_rooms.router)
api_router.include_router(admin_reviews.router)
api_router.include_router(admin_site_content.router)
api_router.include_router(admin_settings.router)
api_router.include_router(admin_dashboard.router)
api_router.include_router(admin_media.router)
api_router.include_router(admin_hero_backgrounds.router)
api_router.include_router(admin_offers.router)
api_router.include_router(admin_offer_registrations.router)
api_router.include_router(admin_video_gallery.router)
api_router.include_router(admin_users.router)
api_router.include_router(sync.router)
