-- rooms.amenities/image_ids are declared as required lists in the API schema
-- (RoomOut.amenities / .image_ids : list[str], no default for existing rows)
-- but the columns themselves allowed NULL with no default, so any room
-- created without explicitly passing these came back NULL from Postgres —
-- Pydantic response validation rejects None for a non-Optional list[str],
-- which broke GET /api/v1/rooms with a 500 for every caller, not just the
-- affected room, since it's a single list response.

update rooms set image_ids = '{}' where image_ids is null;
update rooms set amenities = '{}' where amenities is null;

alter table rooms
  alter column image_ids set default '{}',
  alter column image_ids set not null,
  alter column amenities set default '{}',
  alter column amenities set not null;
