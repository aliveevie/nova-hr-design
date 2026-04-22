create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  password_must_change boolean not null default false,
  first_login_verified boolean not null default false,
  first_login_verified_at timestamptz,
  role text not null check (role in ('HR Admin', 'Manager', 'Employee')),
  initials text not null,
  employee_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users
  add column if not exists password_must_change boolean not null default false;
alter table users
  add column if not exists first_login_verified boolean not null default false;
alter table users
  add column if not exists first_login_verified_at timestamptz;

create table if not exists login_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  ip_address text,
  user_agent text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_verify_user_id on login_verification_tokens(user_id);
create index if not exists idx_login_verify_expires_at on login_verification_tokens(expires_at);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  language text,
  nin_number text unique,
  bvn text unique,
  date_of_birth text,
  gender text,
  address text,
  department text not null check (
    department in (
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
  ),
  job_title text not null,
  grade text,
  level text,
  status text not null check (status in ('Active', 'On Leave', 'Inactive')),
  join_date text not null,
  salary numeric not null,
  initials text not null,
  next_of_kin_name text,
  next_of_kin_relationship text,
  next_of_kin_phone text,
  next_of_kin_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_employee_fk'
  ) then
    alter table users
      add constraint users_employee_fk
      foreign key (employee_id) references employees(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'employees_department_allowed_chk'
  ) then
    alter table employees
      add constraint employees_department_allowed_chk
      check (
        department in (
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
      ) not valid;
  end if;
end $$;

create table if not exists leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  annual_leave integer not null default 20,
  sick_leave integer not null default 10,
  maternity_leave integer not null default 0,
  casual_leave integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id)
);

create table if not exists employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  name text not null,
  type text not null,
  uploaded_date timestamptz not null default now(),
  doc_kind text,
  mime_type text,
  size_bytes integer,
  content_base64 text,
  text_content text,
  uploaded_by_user_id uuid references users(id) on delete set null,
  is_employee_submission boolean not null default false
);

alter table employee_documents add column if not exists doc_kind text;
alter table employee_documents add column if not exists mime_type text;
alter table employee_documents add column if not exists size_bytes integer;
alter table employee_documents add column if not exists content_base64 text;
alter table employee_documents add column if not exists text_content text;
alter table employee_documents add column if not exists uploaded_by_user_id uuid references users(id) on delete set null;
alter table employee_documents add column if not exists is_employee_submission boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_documents_doc_kind_chk'
  ) then
    alter table employee_documents
      add constraint employee_documents_doc_kind_chk
      check (doc_kind in ('job_profile', 'okr_admin', 'okr_employee')) not valid;
  end if;
end $$;

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_user_id on password_reset_tokens(user_id);
create index if not exists idx_password_reset_expires_at on password_reset_tokens(expires_at);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_users_updated_at on users;
create trigger set_users_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists set_employees_updated_at on employees;
create trigger set_employees_updated_at
before update on employees
for each row execute function set_updated_at();

drop trigger if exists set_leave_balances_updated_at on leave_balances;
create trigger set_leave_balances_updated_at
before update on leave_balances
for each row execute function set_updated_at();

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  employee_name text not null,
  type text not null,
  from_date text not null,
  to_date text not null,
  days numeric not null,
  status text not null default 'Pending',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leave_requests_employee_id on leave_requests (employee_id);
create index if not exists idx_leave_requests_created_at on leave_requests (created_at desc);

drop trigger if exists set_leave_requests_updated_at on leave_requests;
create trigger set_leave_requests_updated_at
before update on leave_requests
for each row execute function set_updated_at();

-- HR Admin ownership (per-admin dashboard) + staff onboarding invites
alter table employees add column if not exists admin_owner_id uuid references users (id) on delete set null;
alter table employees add column if not exists created_via_invite_id uuid;

-- Automatic attendance: Office geofences, device registrations, and attendance records
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
  -- Optional list of office public IPs / CIDR ranges. When an employee's
  -- request originates from one of these IPs it counts as "inside the office"
  -- even if browser GPS is unreliable. This is the cross-browser fall-back.
  allowed_ips text[] not null default '{}',
  -- Optional list of office Wi-Fi SSIDs (e.g. "galaxy-itt"). Browsers cannot
  -- read the SSID by themselves, so the employee selects the network they
  -- are connected to once; the server then matches it against this list.
  -- Case-insensitive comparison. This is user-claimed and meant to work
  -- alongside IP + geofence, not to replace them.
  allowed_ssids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_office_locations_admin_owner_id on office_locations(admin_owner_id);
alter table office_locations add column if not exists allowed_ips text[] not null default '{}';
alter table office_locations add column if not exists allowed_ssids text[] not null default '{}';

drop trigger if exists set_office_locations_updated_at on office_locations;
create trigger set_office_locations_updated_at
before update on office_locations
for each row execute function set_updated_at();

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

create table if not exists staff_invites (
  id uuid primary key default gen_random_uuid(),
  raw_token text,
  token_hash text not null unique,
  admin_user_id uuid not null references users (id) on delete cascade,
  label text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_invites_admin on staff_invites (admin_user_id);
alter table staff_invites add column if not exists raw_token text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'employees_created_via_invite_fk'
  ) then
    alter table employees
      add constraint employees_created_via_invite_fk
      foreign key (created_via_invite_id) references staff_invites (id) on delete set null;
  end if;
end $$;

-- Seed default HR Admin for production database (Aiven)
insert into users (name, email, password, role, initials, employee_id)
values (
  'Mariya Abubakar',
  'mabubakar@galaxyitt.com.ng',
  '$2a$10$rCk/DUNmxCNfYQXbwRFbxOT/sOBiR.qAXkVzwj1iMsrzW0KQpLdmK',
  'HR Admin',
  'MA',
  null
)
on conflict (email) do nothing;

-- Test HR Admin (staging / QA only): skip first-login email gate; do not change Mariya's row above.
insert into users (
  name,
  email,
  password,
  role,
  initials,
  employee_id,
  password_must_change,
  first_login_verified
)
values (
  'Test HR Admin',
  'test.hr.admin@galaxyitt.com.ng',
  '$2a$10$pIgOiNFSiJzN5F8w9jfA5epTHKmlb5nO/aPIWA84bpjLHh8u2t0DG',
  'HR Admin',
  'TA',
  null,
  false,
  true
)
on conflict (email) do nothing;

update users
set
  password_must_change = true,
  first_login_verified = false,
  first_login_verified_at = null
where email = 'mabubakar@galaxyitt.com.ng';

-- Assign existing employees to primary HR Admin so legacy data stays under Mariya's scope (not test admin).
update employees e
set admin_owner_id = u.id
from users u
where u.email = 'mabubakar@galaxyitt.com.ng'
  and e.admin_owner_id is null;
