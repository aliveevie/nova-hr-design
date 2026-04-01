create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  password_must_change boolean not null default false,
  role text not null check (role in ('HR Admin', 'Manager', 'Employee')),
  initials text not null,
  employee_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users
  add column if not exists password_must_change boolean not null default false;

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
  department text not null,
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
  uploaded_date timestamptz not null default now()
);

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

update users
set password_must_change = true
where email = 'mabubakar@galaxyitt.com.ng';
