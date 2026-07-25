from pydantic import BaseModel


class RecentEventGroup(BaseModel):
    event_name: str
    count: int
    last_seen: str


class DashboardStats(BaseModel):
    total_categories: int
    total_menu_items: int
    total_gallery_videos: int
    total_reviews: int
    analytics_last_30_days: dict[str, int]
    recent_events: list[RecentEventGroup]
