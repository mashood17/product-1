-- ELATŌ — replaces the Instagram Graph API integration with an admin-managed
-- video showcase (see app/services/video_gallery_service.py). At most 5 rows
-- ever exist: the service evicts the oldest row (storage object + DB row)
-- whenever a *new* upload would push the count past 5. Replacing an existing
-- video's file keeps its row (and therefore its created_at/position)
-- unchanged — only a genuinely new upload affects ordering.
--
-- storage_path is bucket-relative; video_url is resolved on read via
-- get_public_url (see video_gallery_service.resolve_url), same pattern as
-- hero_backgrounds — not stored, so it can never go stale if storage
-- settings change.
create table if not exists video_gallery (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  video_mime text not null,
  file_size_bytes bigint not null,
  caption text,
  instagram_url text,
  uploaded_by uuid references admins(id),
  created_at timestamptz not null default now()
);

alter table video_gallery enable row level security;

-- Public read-only — the homepage showcase fetches this unauthenticated,
-- same as hero_backgrounds/site_content. No anon write policy: all
-- uploads/deletes go through the backend using the service-role key.
create policy "public read video_gallery" on video_gallery for select to anon using (true);

-- Raw video storage, uploaded as-is (no transcoding — see
-- video_gallery_service.py for the 30MB/format-only validation rationale).
insert into storage.buckets (id, name, public)
values ('video-gallery', 'video-gallery', true)
on conflict (id) do nothing;

-- --------------------------------------------------------------------------
-- Instagram integration removal — superseded by video_gallery above.
-- Drops the Reels sync cache and its singleton status row entirely; this
-- backend no longer talks to the Meta Graph API at all.
-- --------------------------------------------------------------------------
drop table if exists instagram_sync_status;
drop table if exists instagram_posts;
