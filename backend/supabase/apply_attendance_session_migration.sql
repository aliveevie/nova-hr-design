-- Additive: attendance session controls on office_locations (production-safe).

alter table office_locations
  add column if not exists auto_start_enabled boolean not null default true;

alter table office_locations
  add column if not exists session_date text;

alter table office_locations
  add column if not exists session_open boolean not null default false;

alter table office_locations
  add column if not exists session_started_at timestamptz;

alter table office_locations
  add column if not exists session_started_by uuid references users(id) on delete set null;
