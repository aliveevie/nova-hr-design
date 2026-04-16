-- Automatic attendance: office geofences, device registration, and attendance records
-- Designed to be safe/idempotent for Aiven/Postgres environments.

-- 1) Update department allowed set (idempotent, avoids validating existing rows)
DO $$
DECLARE
  c RECORD;
BEGIN
  -- Drop existing department check constraints so new departments can be inserted.
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'employees'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%department%'
      AND pg_get_constraintdef(oid) ILIKE '%Finance and Accounting%'
  LOOP
    EXECUTE format('ALTER TABLE employees DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_department_allowed_chk;

ALTER TABLE employees
  ADD CONSTRAINT employees_department_allowed_chk
  CHECK (
    department IN (
      'Finance and Accounting (Financial Control, Treasury, Financial Operations, Credit Control)',
      'Corporate Services (Facility Management, Fleet Management, Physical Security)',
      'Sales and Marketing',
      'Customer Support Services',
      'Research and Development',
      'Technical Operations',
      'Digital Skills Development',
      'Information Security',
      'Human resources and admin',
      'Procurment logistic and onchain supply',
      'Gov Integration and stakeholder engagement'
    )
  ) NOT VALID;

-- 2) Office geofences (admin-owned)
create table if not exists office_locations (
  id uuid primary key default gen_random_uuid(),
  admin_owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_m integer not null check (radius_m > 0),
  max_accuracy_m integer not null check (max_accuracy_m > 0),
  entry_buffer_m integer not null default 0,
  exit_buffer_m integer not null default 0,
  exit_grace_seconds integer not null default 300,
  open_time text not null default '00:00',
  close_time text not null default '23:59',
  time_zone text not null default 'Africa/Lagos',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table office_locations add column if not exists open_time text not null default '00:00';
alter table office_locations add column if not exists close_time text not null default '23:59';
alter table office_locations add column if not exists time_zone text not null default 'Africa/Lagos';

create index if not exists idx_office_locations_admin_owner_id on office_locations(admin_owner_id);

drop trigger if exists set_office_locations_updated_at on office_locations;
create trigger set_office_locations_updated_at
before update on office_locations
for each row execute function set_updated_at();

-- 3) Employee device registrations (per admin-owned employee scope)
create table if not exists employee_devices (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  device_id text not null,
  device_label text,
  registered_at timestamptz not null default now(),
  auto_attendance_enabled boolean not null default true,
  last_seen_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_accuracy_m integer,
  last_inside_state boolean not null default false,
  last_inside_state_at timestamptz,
  last_zone_id uuid references office_locations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_devices_employee_deviceid_uniq unique (employee_id, device_id)
);

create index if not exists idx_employee_devices_employee_id on employee_devices(employee_id);
create index if not exists idx_employee_devices_device_id on employee_devices(device_id);

drop trigger if exists set_employee_devices_updated_at on employee_devices;
create trigger set_employee_devices_updated_at
before update on employee_devices
for each row execute function set_updated_at();

-- 4) Attendance records (per employee per day)
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  employee_name text not null,
  date text not null, -- YYYY-MM-DD
  check_in text not null,
  check_out text,
  status text not null check (status in ('Present', 'Late', 'Absent', 'On Leave')),
  department text,
  source text not null default 'manual' check (source in ('manual', 'auto')),
  device_id text,
  geo_lat double precision,
  geo_lng double precision,
  geo_accuracy_m integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_employee_date_uniq unique (employee_id, date)
);

create index if not exists idx_attendance_employee_id_date on attendance(employee_id, date);

drop trigger if exists set_attendance_updated_at on attendance;
create trigger set_attendance_updated_at
before update on attendance
for each row execute function set_updated_at();

