-- Deleting an admin currently fails with a foreign key violation if they
-- ever uploaded media, updated site content, redeemed an offer, or uploaded
-- a hero background/video — those columns reference admins(id) with no
-- ON DELETE behavior, which defaults to RESTRICT. The content itself should
-- survive an admin being removed; only the "who did this" attribution should
-- go. refresh_tokens/password_reset_tokens already get this right with
-- ON DELETE CASCADE (correct there — a token is meaningless without its
-- owner); these five need SET NULL instead, since the referencing row is a
-- real, independent record worth keeping.

alter table media
  drop constraint if exists media_uploaded_by_fkey,
  add constraint media_uploaded_by_fkey
    foreign key (uploaded_by) references admins(id) on delete set null;

alter table site_content
  drop constraint if exists site_content_updated_by_fkey,
  add constraint site_content_updated_by_fkey
    foreign key (updated_by) references admins(id) on delete set null;

alter table hero_backgrounds
  drop constraint if exists hero_backgrounds_uploaded_by_fkey,
  add constraint hero_backgrounds_uploaded_by_fkey
    foreign key (uploaded_by) references admins(id) on delete set null;

alter table offer_registrations
  drop constraint if exists offer_registrations_redeemed_by_fkey,
  add constraint offer_registrations_redeemed_by_fkey
    foreign key (redeemed_by) references admins(id) on delete set null;

alter table video_gallery
  drop constraint if exists video_gallery_uploaded_by_fkey,
  add constraint video_gallery_uploaded_by_fkey
    foreign key (uploaded_by) references admins(id) on delete set null;
