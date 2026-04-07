-- Leave requests stored in Postgres (employees live here; LowDB leave list was always empty under USE_SUPABASE)

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
