-- Additive migration: fingerprint enrollment + attendance (production-safe).
-- Does NOT drop or truncate any existing tables or data.

-- ---------------------------------------------------------------------------
-- Office / kiosk fingerprint scanners
-- ---------------------------------------------------------------------------
create table if not exists fingerprint_scanners (
  id uuid primary key default gen_random_uuid(),
  admin_owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  device_label text,
  location_note text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fingerprint_scanners_admin_owner
  on fingerprint_scanners(admin_owner_id);

drop trigger if exists set_fingerprint_scanners_updated_at on fingerprint_scanners;
create trigger set_fingerprint_scanners_updated_at
before update on fingerprint_scanners
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Per-employee enrolled fingerprint templates (one row per finger)
-- ---------------------------------------------------------------------------
create table if not exists employee_fingerprint_templates (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  finger_position text not null,
  template_format text not null default 'libfprint-2',
  template_data bytea not null,
  scanner_label text,
  enrolled_by_user_id uuid references users(id) on delete set null,
  is_active boolean not null default true,
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_employee_fingerprint_templates_emp_finger
  on employee_fingerprint_templates(employee_id, finger_position);

create index if not exists idx_employee_fingerprint_templates_employee
  on employee_fingerprint_templates(employee_id);

drop trigger if exists set_employee_fingerprint_templates_updated_at on employee_fingerprint_templates;
create trigger set_employee_fingerprint_templates_updated_at
before update on employee_fingerprint_templates
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Fingerprint scan / attendance event log
-- ---------------------------------------------------------------------------
create table if not exists fingerprint_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete set null,
  fingerprint_template_id uuid references employee_fingerprint_templates(id) on delete set null,
  scanner_id uuid references fingerprint_scanners(id) on delete set null,
  admin_owner_id uuid references users(id) on delete set null,
  event_type text not null check (
    event_type in ('check_in', 'check_out', 'enrollment', 'verify_failed', 'identify_failed')
  ),
  match_score double precision,
  attendance_id uuid references attendance(id) on delete set null,
  attendance_date text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_fingerprint_attendance_logs_employee
  on fingerprint_attendance_logs(employee_id);

create index if not exists idx_fingerprint_attendance_logs_created
  on fingerprint_attendance_logs(created_at desc);

create index if not exists idx_fingerprint_attendance_logs_admin_date
  on fingerprint_attendance_logs(admin_owner_id, attendance_date);

-- ---------------------------------------------------------------------------
-- Optional links on main attendance rows (additive columns only)
-- ---------------------------------------------------------------------------
alter table attendance
  add column if not exists fingerprint_template_id uuid
    references employee_fingerprint_templates(id) on delete set null;

alter table attendance
  add column if not exists fingerprint_scanner_id uuid
    references fingerprint_scanners(id) on delete set null;

-- Extend attendance.source to allow fingerprint (existing rows remain manual/auto).
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'attendance_source_check'
  ) then
    alter table attendance drop constraint attendance_source_check;
  end if;
end $$;

alter table attendance
  add constraint attendance_source_check
  check (source in ('manual', 'auto', 'fingerprint')) not valid;

alter table attendance validate constraint attendance_source_check;
